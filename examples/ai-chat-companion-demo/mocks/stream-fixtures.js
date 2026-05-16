/**
 * Canned SSE script for the AI Chat Companion demo.
 * Use with a Service Worker or local dev server to mock the streaming endpoint.
 */

/**
 * A canned stream response script.
 * Each entry is a SSE event: { event, data, delay }
 */
export const STREAM_SCRIPT = [
	{ event: 'token', data: JSON.stringify({ delta: 'Hello! ' }), delay: 100 },
	{ event: 'token', data: JSON.stringify({ delta: "I'm your " }), delay: 100 },
	{ event: 'token', data: JSON.stringify({ delta: 'AI assistant. ' }), delay: 100 },
	{
		event: 'tool_call',
		data: JSON.stringify({ toolId: 'opencatalogi.searchCatalogues', arguments: { q: 'broker' } }),
		delay: 200,
	},
	{
		event: 'tool_result',
		data: JSON.stringify({
			toolId: 'opencatalogi.searchCatalogues',
			result: { items: [{ name: 'Broker A' }, { name: 'Broker B' }] },
			isError: false,
		}),
		delay: 500,
	},
	{ event: 'token', data: JSON.stringify({ delta: 'I found 2 brokers. ' }), delay: 100 },
	{ event: 'token', data: JSON.stringify({ delta: 'How can I help further?' }), delay: 100 },
	{ event: 'final', data: JSON.stringify({ done: true }), delay: 50 },
]

/** Canned conversation list */
export const CONVERSATIONS = [
	{
		uuid: 'conv-001',
		title: 'Search for brokers in the catalogue',
		updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
	},
	{
		uuid: 'conv-002',
		title: 'Help with API documentation',
		updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
	},
]

/** Canned send response (non-streaming fallback) */
export const SEND_RESPONSE = {
	role: 'assistant',
	content: 'This is a canned non-streaming response.',
}
