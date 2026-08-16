/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * useAiChatStream — Conversation transport composable for the AI Chat Companion.
 *
 * Owns the full SSE lifecycle:
 * - Attempts POST /index.php/apps/{chatAppId}/api/chat/stream via
 *   @microsoft/fetch-event-source (handles POST body, abort signals, reconnect,
 *   and SSE frame parsing).
 * - Handles the six-event envelope: token, tool_call, tool_result, heartbeat,
 *   final, error.
 * - Falls back to POST /index.php/apps/{chatAppId}/api/chat/send via axios
 *   when the streaming endpoint returns 404/501 or fails mid-handshake,
 *   synthesising a single "final" event so rendering code does not branch.
 * - Sends the active cnAiContext snapshot in every outgoing request body.
 * - Tracks `state.conversationUuid`, the server-side Conversation the active
 *   session is writing to (set from the `final` event's `conversationUuid` /
 *   the fallback response's `conversation` field, both already on the wire).
 *   Every send() echoes it back under both key spellings the two backend
 *   controllers read (`conversation` / `conversationUuid`) so a multi-turn
 *   session stays one Conversation row server-side instead of implicitly
 *   starting a new one on every turn — previously neither key was ever sent.
 *
 * The backend app id (`chatAppId`) is a single configuration point — see
 * ./aiChatConfig.js. It defaults to `hermiq` (per hydra ADR-034 "Amendment
 * 2026-07-05"); pass `{ chatAppId }` to target another backend (e.g.
 * `openregister` during its compat window) without touching this file.
 */

import { reactive } from 'vue'
import axios from '@nextcloud/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAiContext } from './useAiContext.js'
import {
	DEFAULT_CHAT_APP_ID,
	chatStreamUrl,
	chatSendUrl,
	conversationMessagesUrl,
} from './aiChatConfig.js'

/**
 * Factory that creates and returns a reactive AI chat stream state object.
 *
 * This follows the Vue 2 "factory composable" pattern — it returns a plain
 * reactive object (via Vue.observable) rather than Vue 3 refs. One instance
 * should be created per CnAiCompanion mount.
 *
 * @param {object} [contextInstance] Vue component instance to read cnAiContext from.
 *   Pass the CnAiCompanion component instance so the outgoing request includes
 *   the current page context.
 * @param {object} [options] Transport options.
 * @param {string} [options.chatAppId] Backend app id the chat/conversation URLs
 *   resolve against. Defaults to {@link DEFAULT_CHAT_APP_ID} (`openregister`).
 * @returns {object} Reactive state + methods
 */
export function useAiChatStream(contextInstance, options = {}) {
	/** Backend app id for every URL this composable builds (see aiChatConfig.js) */
	const chatAppId = options.chatAppId || DEFAULT_CHAT_APP_ID
	const STREAM_URL = chatStreamUrl(chatAppId)
	const SEND_URL = chatSendUrl(chatAppId)
	/** Stable reactive state object */
	const state = reactive({
		/** Whether an SSE or fallback request is in-flight */
		isStreaming: false,
		/** Partial assistant text built from token events */
		currentText: '',
		/** Tool call entries: { toolId, arguments, result?, isError? } */
		toolCalls: [],
		/** Error state: { code, message } | null */
		error: null,
		/** Full conversation message history for the current session */
		messages: [],
		/** Whether the next send() should signal OR to start a new Conversation row */
		_newThread: false,
		/**
		 * UUID of the conversation currently being written to, or null before the
		 * first turn. Populated from the `final` SSE event's `conversationUuid`
		 * field / the non-streaming fallback's `conversation` field (both already
		 * on the wire — see finalise()) and echoed back on every subsequent send()
		 * so the whole session stays one Conversation server-side instead of a new
		 * one per turn. Reset by startNewThread(), set directly by loadConversation().
		 */
		conversationUuid: null,
	})

	/** AbortController for the active fetchEventSource call */
	let abortController = null
	/** Resolve/reject for the Promise returned by send() */
	let _resolve = null
	let _reject = null

	/**
	 * Get the current cnAiContext snapshot for inclusion in request bodies.
	 * @returns {object}
	 */
	function getContextSnapshot() {
		// An EXPLICIT context wins over the injected one.
		//
		// The injected path assumes a CnAppRoot ancestor provides the context.
		// A companion mounted standalone on a page that is not ours has no such
		// ancestor, so it falls back to `defaultContext` — whose `appId` is the
		// literal string 'unknown'. The agent then receives "app context:
		// unknown" and, correctly, refuses to act: measured, it answered a
		// document edit request with "I don't have a clear app context" while
		// the user was looking straight at the document.
		//
		// The host that mounted the companion is the one thing that DOES know
		// what page it is on, so it may state it.
		const ctx = options.context || useAiContext(contextInstance)

		return {
			appId: ctx.appId,
			pageKind: ctx.pageKind,
			objectUuid: ctx.objectUuid,
			registerSlug: ctx.registerSlug,
			schemaSlug: ctx.schemaSlug,
			fileId: ctx.fileId,
			route: ctx.route,
		}
	}

	/**
	 * Handle an individual SSE message frame.
	 * @param {object} msg - { event, data } from fetchEventSource
	 */
	function handleSseMessage(msg) {
		const { event, data } = msg
		let parsed
		try {
			parsed = JSON.parse(data)
		} catch {
			return
		}

		switch (event) {
		case 'token':
			state.currentText += (parsed.delta || '')
			break

		case 'tool_call':
			state.toolCalls.push({
				toolId: parsed.toolId,
				arguments: parsed.arguments,
				result: undefined,
				isError: false,
			})
			break

		case 'tool_result': {
			const entry = state.toolCalls.find((tc) => tc.toolId === parsed.toolId)
			if (entry) {
				entry.result = parsed.result
				entry.isError = Boolean(parsed.isError)
			}
			break
		}

		case 'heartbeat':
			// Liveness signal only — no UI update
			break

		case 'final':
			// Commit the streamed text as a finalised assistant message.
			// If no `token` events arrived (non-streaming-provider fallback path —
			// the contract allows the server to emit only the terminal `final`
			// event with `fullText` for providers that don't stream), seed
			// `currentText` from the payload so the assistant bubble renders.
			if (state.currentText === '' && typeof parsed.fullText === 'string') {
				state.currentText = parsed.fullText
			}
			finalise(parsed.messageId, parsed.conversationUuid)
			break

		case 'error':
			fail(parsed.code || 'unknown', parsed.message || 'Unknown error')
			break

		default:
			break
		}
	}

	/**
	 * Push the completed assistant message into state.messages and resolve send().
	 * @param {string|undefined} messageId - Server-supplied id from the final event;
	 *   when empty/missing we synthesise a stable client-side id so Vue's :key
	 *   stays unique within the conversation.
	 * @param {string|undefined} [conversationUuid] - The conversation this turn was
	 *   written to (SSE `final.conversationUuid` / fallback `.conversation`). Stored
	 *   on state so the *next* send() continues the same server-side Conversation
	 *   instead of implicitly starting a new one every turn.
	 */
	function finalise(messageId, conversationUuid) {
		const assistantMessage = {
			id: (typeof messageId === 'string' && messageId !== '')
				? messageId
				: `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
			role: 'assistant',
			content: state.currentText,
			toolCalls: state.toolCalls.slice(),
		}
		state.messages.push(assistantMessage)
		if (typeof conversationUuid === 'string' && conversationUuid !== '') {
			state.conversationUuid = conversationUuid
		}
		state.currentText = ''
		state.toolCalls = []
		state.isStreaming = false
		if (_resolve) {
			_resolve()
			_resolve = null
			_reject = null
		}
	}

	/**
	 * Handle an error event or transport failure.
	 * @param {string} code - Machine-readable error code (e.g. 'rate_limited', 'connection_error')
	 * @param {string} message - Human-readable error message for the UI
	 */
	function fail(code, message) {
		state.isStreaming = false
		state.currentText = ''
		state.toolCalls = []
		state.error = { code, message }
		if (_reject) {
			const err = new Error(message)
			err.code = code
			_reject(err)
			_resolve = null
			_reject = null
		}
	}

	/**
	 * Non-streaming fallback: POST to /api/chat/send via axios, then synthesise
	 * a single "final" event from the JSON response.
	 * @param {string} content - The user's message text
	 * @param {object} body - Request body already built by send() (message, context, newThread)
	 */
	async function sendFallback(content, body) {
		try {
			const response = await axios.post(SEND_URL, body)
			const data = response.data
			// Treat the response as a final event — populate currentText from the reply
			const replyContent = data?.content || data?.message || data?.reply || ''
			state.currentText = replyContent
			// ChatController::sendMessage() echoes the conversation uuid back as
			// `conversation` (ChatStreamController's SSE `final` event uses
			// `conversationUuid` instead — see finalise() caller in handleSseMessage).
			finalise(undefined, data?.conversation || data?.conversationUuid)
		} catch (err) {
			const code = err.response?.status?.toString() || 'network_error'
			const message = err.message || 'Fallback request failed'
			fail(code, message)
		}
	}

	/**
	 * Send a user message. Attempts the SSE stream first; falls back to the
	 * non-streaming endpoint on 404/501 or connection failure.
	 *
	 * @param {string} content - The user's message text
	 * @param {object} [options] - Send options
	 * @param {boolean} [options.newThread] - Force a new Conversation row on the server
	 * @param {string} [options.agentUuid] - Agent to start a *new* conversation with
	 *   (agent-picker selection). Ignored server-side once a conversation uuid is
	 *   resolved — safe to pass on every call.
	 * @param {Array<{path: string, name: string}>} [options.attachments] - Files
	 *   already uploaded via the attachments endpoint (see aiChatConfig.js
	 *   `attachmentsUrl()`), to be read by the backend from `body.attachments`.
	 *   Omitted from the request body entirely when empty so existing backends
	 *   that don't yet read the key see no change to the payload shape.
	 * @returns {Promise<void>} Resolves on "final", rejects on "error" or abort
	 */
	function send(content, options = {}) {
		if (state.isStreaming) {
			return Promise.reject(new Error('A stream is already in progress'))
		}

		// Push the user message into the local history immediately
		state.messages.push({ role: 'user', content })
		state.isStreaming = true
		state.error = null
		state.currentText = ''
		state.toolCalls = []

		const newThread = options.newThread || state._newThread
		state._newThread = false

		// The conversation this send() continues — '' (never sent) forces both
		// controllers to create a fresh Conversation row. Cleared on a new thread
		// so the *next* turn starts a new server-side conversation instead of
		// reusing the one that just ended.
		const activeConversationUuid = newThread ? '' : (state.conversationUuid || '')
		if (newThread) {
			state.conversationUuid = null
		}

		// OR's ChatStreamController reads `$body['message']` (matches the existing
		// non-streaming `/api/chat/send` request shape). We keep `content` as a
		// fallback alias for clients that already used the old field name — the
		// controller ignores unknown keys. Conversation continuity is likewise
		// duplicated under both key spellings the two backend endpoints read
		// (ChatController::extractMessageRequestParams() reads `conversation`,
		// ChatStreamController::stream() reads `conversationUuid`); `agentUuid` is
		// the same key on both and only consulted when no conversation is resolved.
		const body = {
			message: content,
			content,
			context: getContextSnapshot(),
			newThread,
			conversation: activeConversationUuid,
			conversationUuid: activeConversationUuid,
			agentUuid: options.agentUuid || '',
		}
		// Only add the key when there's something to send — keeps the payload
		// shape unchanged (and any backend not yet reading `attachments`
		// unaffected) for the common no-attachment turn.
		if (Array.isArray(options.attachments) && options.attachments.length > 0) {
			body.attachments = options.attachments
		}

		abortController = new AbortController()

		return new Promise((resolve, reject) => {
			_resolve = resolve
			_reject = reject

			fetchEventSource(STREAM_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Requested-With': 'XMLHttpRequest',
					// Nextcloud's CSRF middleware accepts either the
					// requesttoken header or X-Requested-With. We send
					// both so the SSE POST works whether or not the
					// app's controller opts out of CSRF (the orchestrator
					// keeps CSRF on; see ChatStreamController docblock).
					requesttoken: typeof OC !== 'undefined' ? OC.requestToken : '',
				},
				body: JSON.stringify(body),
				signal: abortController.signal,

				async onopen(response) {
					if (response.ok) {
						// Happy path — SSE stream opened
						return
					}
					// Treat 404/501 as "streaming not available" — fall back
					if (response.status === 404 || response.status === 501) {
						// Throw a custom error that onmessage/onerror won't catch
						throw Object.assign(new Error('streaming_unavailable'), {
							isFallback: true,
							status: response.status,
						})
					}
					// Other HTTP errors — propagate
					throw new Error(`SSE open failed: ${response.status}`)
				},

				onmessage(msg) {
					handleSseMessage(msg)
				},

				onerror(err) {
					if (err && err.isFallback) {
						// Signal to the catch block that we need the fallback
						throw err
					}
					// fetchEventSource calls onerror for connection issues and will
					// automatically retry. We convert terminal errors to fail().
					fail('connection_error', err?.message || 'Connection error')
					throw err // Stop retrying
				},

				onclose() {
					// Stream closed without a "final" event — treat as connection reset
					if (state.isStreaming) {
						fail('connection_closed', 'Stream closed unexpectedly')
					}
				},
			}).catch((err) => {
				if (err && err.isFallback) {
					// Non-streaming fallback path
					return sendFallback(content, body)
				}
				if (err && err.name === 'AbortError') {
					// Intentional abort — already handled by abort()
					return
				}
				fail(err?.code || 'unknown', err?.message || 'Unknown error')
			})
		})
	}

	/**
	 * Abort the currently in-flight stream.
	 * Rejects the send() Promise with a cancellation error.
	 */
	function abort() {
		if (abortController) {
			abortController.abort()
			abortController = null
		}
		state.isStreaming = false
		state.currentText = ''
		state.toolCalls = []
		if (_reject) {
			const err = new Error('Reply was cancelled')
			err.code = 'cancelled'
			_reject(err)
			_resolve = null
			_reject = null
		}
	}

	/**
	 * Discard current conversation state and signal OR to start a fresh
	 * Conversation row on the next send() call.
	 */
	function startNewThread() {
		if (state.isStreaming) {
			abort()
		}
		state.messages = []
		state.currentText = ''
		state.toolCalls = []
		state.error = null
		state._newThread = true
		state.conversationUuid = null
	}

	/**
	 * Load an existing conversation's messages into the state.
	 * Used by CnAiHistoryDialog when the user selects a past conversation.
	 *
	 * Fetches GET /api/conversations/{uuid}/messages (OR's conversation#messages
	 * route), which returns { results: [...] } ordered oldest-first. Each OR
	 * message carries { id, uuid, conversationId, role, content, sources,
	 * context, created } — mapped here onto the { role, content, toolCalls }
	 * shape the send/stream paths produce so CnAiMessageList renders resumed
	 * conversations identically to live ones. OR does not persist tool calls
	 * on messages, so toolCalls degrades to [].
	 * @param {string} conversationUuid - UUID of the conversation to resume
	 * @returns {Promise<void>}
	 */
	async function loadConversation(conversationUuid) {
		try {
			const response = await axios.get(
				conversationMessagesUrl(chatAppId, conversationUuid),
				// The backend controller defaults to 50 messages; raise the limit
				// so long threads resume fully.
				{ params: { limit: 200 } },
			)
			const data = response.data
			const messages = Array.isArray(data.results)
				? data.results
				: (Array.isArray(data.messages) ? data.messages : [])
			state.messages = messages.map((m) => ({
				role: m.role || 'assistant',
				content: m.content || '',
				toolCalls: m.toolCalls || m.tool_calls || [],
			}))
			// Don't force a new thread — resume this conversation, and remember its
			// uuid so the next send() continues it instead of starting a new one.
			state._newThread = false
			state.conversationUuid = conversationUuid
		} catch (err) {
			// eslint-disable-next-line no-console
			console.info('[useAiChatStream] Could not load conversation:', err?.message)
		}
	}

	return {
		// Reactive state (accessed as state.isStreaming etc. from the component)
		state,
		// Methods
		send,
		abort,
		startNewThread,
		loadConversation,
	}
}
