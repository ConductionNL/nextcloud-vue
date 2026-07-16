/**
 * SSE event fixtures for useAiChatStream tests.
 */

const TOKEN_EVENTS = [
	{ event: 'token', data: JSON.stringify({ delta: 'Hello ' }) },
	{ event: 'token', data: JSON.stringify({ delta: 'world' }) },
	{ event: 'token', data: JSON.stringify({ delta: '!' }) },
]

const FINAL_EVENT = { event: 'final', data: JSON.stringify({ done: true }) }

const HEARTBEAT_EVENT = { event: 'heartbeat', data: JSON.stringify({ ts: Date.now() }) }

const ERROR_EVENT = { event: 'error', data: JSON.stringify({ code: 'rate_limited', message: 'Try again later' }) }

const TOOL_CALL_EVENT = {
	event: 'tool_call',
	data: JSON.stringify({ toolId: 'search', arguments: { q: 'broker' } }),
}

const TOOL_RESULT_EVENT = {
	event: 'tool_result',
	data: JSON.stringify({ toolId: 'search', result: { items: [] }, isError: false }),
}

module.exports = {
	TOKEN_EVENTS,
	FINAL_EVENT,
	HEARTBEAT_EVENT,
	ERROR_EVENT,
	TOOL_CALL_EVENT,
	TOOL_RESULT_EVENT,
}
