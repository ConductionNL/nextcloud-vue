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
const axios = require('@nextcloud/axios').default
const { useAiChatStream } = require('../../src/composables/useAiChatStream.js')

/**
 * Helper: simulate SSE by capturing the onmessage callback from fetchEventSource
 * and replaying events through it.
 */
function setupSse(events, rejectWithError) {
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
		// Simulate 404 response from SSE endpoint
		fetchEventSource.mockImplementation((_url, options) => {
			return new Promise((resolve, reject) => {
				const fakeOpen = async () => {
					// onopen throws with isFallback when status is 404
					const err = Object.assign(new Error('streaming_unavailable'), {
						isFallback: true,
						status: 404,
					})
					throw err
				}
				if (options.onopen) {
					options.onopen({ ok: false, status: 404 }).catch(reject)
					resolve()
				}
			}).catch((err) => {
				if (err && err.isFallback) return
				throw err
			})
		})

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
		let capturedAbort
		fetchEventSource.mockImplementation((_url, options) => {
			return new Promise((resolve, reject) => {
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
