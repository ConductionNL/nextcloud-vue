/**
 * Tests for useAiChatStream() composable.
 *
 * Uses a controllable fetchEventSource mock to simulate SSE events.
 */

const {
	TOKEN_EVENTS,
	FINAL_EVENT,
	HEARTBEAT_EVENT,
	ERROR_EVENT,
	TOOL_CALL_EVENT,
	TOOL_RESULT_EVENT,
} = require('./__fixtures__/sse-fixtures.js')

// Mock fetchEventSource so we control the SSE events
jest.mock('@microsoft/fetch-event-source', () => ({
	__esModule: true,
	fetchEventSource: jest.fn(),
}))

// Mock axios for fallback path
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		post: jest.fn(),
	},
}))

const { fetchEventSource } = require('@microsoft/fetch-event-source')
// eslint-disable-next-line n/no-missing-require -- ESM-only package; jest resolves it via moduleNameMapper (tests/__mocks__/nextcloud-axios.js)
const axios = require('@nextcloud/axios').default
const { useAiChatStream } = require('../../src/composables/useAiChatStream.js')

/**
 * Helper: simulate SSE by capturing the onmessage callback from fetchEventSource
 * and replaying events through it.
 * @param {Array<object>} events - SSE frames ({ event, data }) to replay through onmessage
 */
function setupSse(events) {
	fetchEventSource.mockImplementation((_url, options) => {
		return new Promise((resolve, reject) => {
			// Simulate successful open
			if (options.onopen) {
				options.onopen({ ok: true, status: 200 }).then(() => {
					// Emit all events
					for (const evt of events) {
						options.onmessage(evt)
					}
					resolve()
				}).catch(reject)
			} else {
				// Emit all events
				for (const evt of events) {
					options.onmessage(evt)
				}
				resolve()
			}
		})
	})
}

describe('useAiChatStream', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('accumulates currentText from token events and resolves on final', async () => {
		const events = [...TOKEN_EVENTS, FINAL_EVENT]
		setupSse(events)

		const stream = useAiChatStream(null)
		const promise = stream.send('Hello')

		await promise

		expect(stream.state.isStreaming).toBe(false)
		expect(stream.state.messages.length).toBe(2)
		expect(stream.state.messages[0].role).toBe('user')
		expect(stream.state.messages[0].content).toBe('Hello')
		expect(stream.state.messages[1].role).toBe('assistant')
		expect(stream.state.messages[1].content).toBe('Hello world!')
	})

	it('populates toolCalls from tool_call + tool_result events', async () => {
		const events = [
			TOKEN_EVENTS[0],
			TOOL_CALL_EVENT,
			TOOL_RESULT_EVENT,
			TOKEN_EVENTS[1],
			FINAL_EVENT,
		]
		setupSse(events)

		const stream = useAiChatStream(null)
		await stream.send('Search the broker')

		const assistantMsg = stream.state.messages.find((m) => m.role === 'assistant')
		expect(assistantMsg).toBeDefined()
		expect(assistantMsg.toolCalls).toBeDefined()
		expect(assistantMsg.toolCalls.length).toBeGreaterThan(0)
		expect(assistantMsg.toolCalls[0].toolId).toBe('search')
		expect(assistantMsg.toolCalls[0].result).toEqual({ items: [] })
	})

	it('heartbeat events do not modify currentText or add messages', async () => {
		const events = [
			TOKEN_EVENTS[0],
			HEARTBEAT_EVENT,
			HEARTBEAT_EVENT,
			FINAL_EVENT,
		]
		setupSse(events)

		const stream = useAiChatStream(null)
		await stream.send('Hello')

		// Only user + assistant messages (no heartbeat entries)
		expect(stream.state.messages.length).toBe(2)
		// No heartbeat text leaked into assistant content
		const assistantMsg = stream.state.messages[1]
		expect(assistantMsg.content).not.toContain('heartbeat')
	})

	it('error event rejects the send() Promise with .code', async () => {
		fetchEventSource.mockImplementation((_url, options) => {
			return new Promise((resolve) => {
				if (options.onopen) {
					options.onopen({ ok: true, status: 200 }).then(() => {
						options.onmessage(ERROR_EVENT)
						resolve()
					})
				} else {
					options.onmessage(ERROR_EVENT)
					resolve()
				}
			})
		})

		const stream = useAiChatStream(null)
		await expect(stream.send('Hi')).rejects.toMatchObject({ code: 'rate_limited' })
		expect(stream.state.isStreaming).toBe(false)
		expect(stream.state.error).toMatchObject({ code: 'rate_limited' })
	})

	it('falls back to /api/chat/send when streaming endpoint returns 404', async () => {
		// Mock the 404 from onopen by using the real error path
		fetchEventSource.mockImplementation((_url, options) => {
			const fakeResponse = { ok: false, status: 404 }
			// Return a promise that calls onopen with 404 and catches the fallback error
			return (async () => {
				try {
					if (options.onopen) await options.onopen(fakeResponse)
				} catch (err) {
					if (err && err.isFallback) {
						// Fall through — the .catch in send() handles it
						throw err
					}
					throw err
				}
			})()
		})

		axios.post.mockResolvedValue({ data: { content: 'Fallback response', role: 'assistant' }, status: 200 })

		const stream = useAiChatStream(null)
		await stream.send('Hi')

		expect(axios.post).toHaveBeenCalledWith(
			expect.stringContaining('/api/chat/send'),
			expect.objectContaining({ content: 'Hi' }),
		)
		const assistantMsg = stream.state.messages.find((m) => m.role === 'assistant')
		expect(assistantMsg).toBeDefined()
		expect(assistantMsg.content).toBe('Fallback response')
	})

	it('abort() cancels the stream and rejects the Promise', async () => {
		// Simulate a long-running stream that won't resolve on its own
		fetchEventSource.mockImplementation((_url, options) => {
			return new Promise(() => {
				if (options.onopen) {
					options.onopen({ ok: true, status: 200 }).then(() => {
						// Emit a few tokens but don't send final
						options.onmessage(TOKEN_EVENTS[0])
						options.onmessage(TOKEN_EVENTS[1])
						// Don't resolve — let abort() handle it
					})
				}
			})
		})

		const stream = useAiChatStream(null)
		const sendPromise = stream.send('Hello')

		// Let a tick pass so the mock is in-flight
		await Promise.resolve()
		stream.abort()

		await expect(sendPromise).rejects.toMatchObject({ code: 'cancelled' })
		expect(stream.state.isStreaming).toBe(false)
	})

	it('loadConversation() fetches conversation#messages and maps OR fields onto the local message shape', async () => {
		// Shape returned by OR's ConversationController::messages()
		// (Message::jsonSerialize(): id/uuid/conversationId/role/content/sources/context/created)
		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						id: 1,
						uuid: 'msg-1',
						conversationId: 5,
						role: 'user',
						content: 'Hi there',
						sources: null,
						context: null,
						created: '2026-07-05T10:00:00+00:00',
					},
					{
						id: 2,
						uuid: 'msg-2',
						conversationId: 5,
						role: 'assistant',
						content: 'Hello! How can I help?',
						sources: [],
						context: null,
						created: '2026-07-05T10:00:05+00:00',
					},
				],
				total: 2,
				limit: 200,
				offset: 0,
			},
		})

		const stream = useAiChatStream(null)
		// Simulate a pending new-thread flag — resuming must clear it
		stream.startNewThread()
		await stream.loadConversation('conv-123')

		expect(axios.get).toHaveBeenCalledWith(
			expect.stringContaining('/api/conversations/conv-123/messages'),
			expect.objectContaining({ params: expect.objectContaining({ limit: expect.any(Number) }) }),
		)
		expect(stream.state.messages).toEqual([
			{ role: 'user', content: 'Hi there', toolCalls: [] },
			{ role: 'assistant', content: 'Hello! How can I help?', toolCalls: [] },
		])
		expect(stream.state._newThread).toBe(false)
	})

	it('loadConversation() degrades safely when the request fails', async () => {
		axios.get.mockRejectedValue(new Error('Network error'))

		const stream = useAiChatStream(null)
		stream.state.messages = [{ role: 'user', content: 'Existing', toolCalls: [] }]

		await expect(stream.loadConversation('conv-404')).resolves.toBeUndefined()
		// Existing thread is left intact — no crash, no wipe
		expect(stream.state.messages).toEqual([{ role: 'user', content: 'Existing', toolCalls: [] }])
	})

	// --- chatAppId parameterization (chat-appid-flip, default flipped to
	// hermiq by chat-appid-default-flip) -------------------------------------

	it('streams against the default backend app id (hermiq) when no chatAppId is given', async () => {
		setupSse([FINAL_EVENT])

		const stream = useAiChatStream(null)
		await stream.send('Hi')

		expect(fetchEventSource.mock.calls[0][0]).toBe('/index.php/apps/hermiq/api/chat/stream')
	})

	it('streams against an overridden chatAppId (openregister compat window)', async () => {
		setupSse([FINAL_EVENT])

		const stream = useAiChatStream(null, { chatAppId: 'openregister' })
		await stream.send('Hi')

		expect(fetchEventSource.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/chat/stream')
	})

	it('non-streaming fallback posts to the send URL of the overridden chatAppId', async () => {
		fetchEventSource.mockImplementation((_url, options) => {
			const fakeResponse = { ok: false, status: 404 }
			return (async () => {
				if (options.onopen) await options.onopen(fakeResponse)
			})()
		})
		axios.post.mockResolvedValue({ data: { content: 'Fallback', role: 'assistant' }, status: 200 })

		const stream = useAiChatStream(null, { chatAppId: 'openregister' })
		await stream.send('Hi')

		expect(axios.post).toHaveBeenCalledWith(
			'/index.php/apps/openregister/api/chat/send',
			expect.objectContaining({ content: 'Hi' }),
		)
	})

	it('loadConversation resolves the messages URL against the chatAppId (default + override)', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })

		const defaultStream = useAiChatStream(null)
		await defaultStream.loadConversation('conv-1')
		expect(axios.get).toHaveBeenLastCalledWith(
			'/index.php/apps/hermiq/api/conversations/conv-1/messages',
			expect.objectContaining({ params: expect.objectContaining({ limit: expect.any(Number) }) }),
		)

		const orStream = useAiChatStream(null, { chatAppId: 'openregister' })
		await orStream.loadConversation('conv-2')
		expect(axios.get).toHaveBeenLastCalledWith(
			'/index.php/apps/openregister/api/conversations/conv-2/messages',
			expect.objectContaining({ params: expect.objectContaining({ limit: expect.any(Number) }) }),
		)
	})

	it('outgoing request body contains current cnAiContext snapshot', async () => {
		setupSse([FINAL_EVENT])

		// Provide a fake instance with cnAiContext
		const fakeInstance = {
			cnAiContext: {
				appId: 'opencatalogi',
				pageKind: 'detail',
				objectUuid: 'abc-123',
				registerSlug: 'catalogus',
				schemaSlug: 'organisation',
				route: { path: '/test' },
			},
		}

		const stream = useAiChatStream(fakeInstance)
		await stream.send('Hi')

		const callArgs = fetchEventSource.mock.calls[0]
		const body = JSON.parse(callArgs[1].body)
		expect(body.context).toMatchObject({
			appId: 'opencatalogi',
			pageKind: 'detail',
			objectUuid: 'abc-123',
		})
	})
})
