/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * useAiChatStream — Conversation transport composable for the AI Chat Companion.
 *
 * Owns the full SSE lifecycle:
 * - Attempts POST /index.php/apps/openregister/api/chat/stream via
 *   @microsoft/fetch-event-source (handles POST body, abort signals, reconnect,
 *   and SSE frame parsing).
 * - Handles the six-event envelope: token, tool_call, tool_result, heartbeat,
 *   final, error.
 * - Falls back to POST /index.php/apps/openregister/api/chat/send via axios
 *   when the streaming endpoint returns 404/501 or fails mid-handshake,
 *   synthesising a single "final" event so rendering code does not branch.
 * - Sends the active cnAiContext snapshot in every outgoing request body.
 */

import Vue from 'vue'
import axios from '@nextcloud/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAiContext } from './useAiContext.js'

const STREAM_URL = '/index.php/apps/openregister/api/chat/stream'
const SEND_URL = '/index.php/apps/openregister/api/chat/send'

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
 * @returns {object} Reactive state + methods
 */
export function useAiChatStream(contextInstance) {
	/** Stable reactive state object */
	const state = Vue.observable({
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
		const ctx = useAiContext(contextInstance)
		return {
			appId: ctx.appId,
			pageKind: ctx.pageKind,
			objectUuid: ctx.objectUuid,
			registerSlug: ctx.registerSlug,
			schemaSlug: ctx.schemaSlug,
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
			finalise(parsed.messageId)
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
	 */
	function finalise(messageId) {
		const assistantMessage = {
			id: (typeof messageId === 'string' && messageId !== '')
				? messageId
				: `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
			role: 'assistant',
			content: state.currentText,
			toolCalls: state.toolCalls.slice(),
		}
		state.messages.push(assistantMessage)
		state.currentText = ''
		state.toolCalls = []
		state.isStreaming = false
		if (_resolve) {
			_resolve()
			_resolve = null
			_reject = null
		}
	}

	/** Handle an error event or transport failure. */
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
	 * @param {string} content
	 * @param {object} body
	 */
	async function sendFallback(content, body) {
		try {
			const response = await axios.post(SEND_URL, body)
			const data = response.data
			// Treat the response as a final event — populate currentText from the reply
			const replyContent = data?.content || data?.message || data?.reply || ''
			state.currentText = replyContent
			finalise()
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
	 * @param {object} [options]
	 * @param {boolean} [options.newThread] - Force a new Conversation row on the server
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

		// OR's ChatStreamController reads `$body['message']` (matches the existing
		// non-streaming `/api/chat/send` request shape). We keep `content` as a
		// fallback alias for clients that already used the old field name — the
		// controller ignores unknown keys.
		const body = {
			message: content,
			content,
			context: getContextSnapshot(),
			newThread,
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
	}

	/**
	 * Load an existing conversation's messages into the state.
	 * Used by CnAiHistoryDialog when the user selects a past conversation.
	 * @param {string} conversationUuid
	 * @returns {Promise<void>}
	 */
	async function loadConversation(conversationUuid) {
		try {
			const response = await axios.get(
				`/index.php/apps/openregister/api/chat/conversations/${conversationUuid}`,
			)
			const data = response.data
			const messages = Array.isArray(data.messages) ? data.messages : (data.results || [])
			state.messages = messages.map((m) => ({
				role: m.role || 'assistant',
				content: m.content || '',
				toolCalls: m.toolCalls || m.tool_calls || [],
			}))
			// Don't force a new thread — resume this conversation
			state._newThread = false
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
