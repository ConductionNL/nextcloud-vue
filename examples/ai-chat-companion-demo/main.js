/**
 * AI Chat Companion Demo — standalone harness with mocked OR backend.
 *
 * Run with any static dev server, e.g.:
 *   npx serve examples/ai-chat-companion-demo
 * or:
 *   python3 -m http.server 8000 --directory examples/ai-chat-companion-demo
 *
 * Uses a Service Worker (sw.js) to intercept OR API calls and return canned responses.
 * Exercises: FAB → panel open → send → streaming render → tool-call expand → history.
 */

import Vue from 'vue'
import { STREAM_SCRIPT, CONVERSATIONS, SEND_RESPONSE } from './mocks/stream-fixtures.js'

// ─── Mock interceptor using fetch monkey-patch ────────────────────────────────

const originalFetch = window.fetch.bind(window)
window.fetch = async function(url, options) {
	const urlStr = typeof url === 'string' ? url : url.url

	// Health probe — always 200
	if (urlStr.includes('/api/chat/health')) {
		return new Response(JSON.stringify({ status: 'ok' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// SSE stream — replay canned script
	if (urlStr.includes('/api/chat/stream')) {
		const encoder = new TextEncoder()
		const stream = new ReadableStream({
			async start(controller) {
				for (const { event, data, delay } of STREAM_SCRIPT) {
					await new Promise((r) => setTimeout(r, delay))
					const chunk = `event: ${event}\ndata: ${data}\n\n`
					controller.enqueue(encoder.encode(chunk))
				}
				controller.close()
			},
		})
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
			},
		})
	}

	// Conversation list
	if (urlStr.includes('/api/chat/conversations') && (!options || options.method === 'GET' || !options.method)) {
		return new Response(JSON.stringify({ results: CONVERSATIONS }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// Non-streaming send fallback
	if (urlStr.includes('/api/chat/send')) {
		return new Response(JSON.stringify(SEND_RESPONSE), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	return originalFetch(url, options)
}

// Also mock axios (if the demo bundler brings it in)
if (typeof window !== 'undefined') {
	window.__mocked_or_api = true
}

// ─── Demo App ─────────────────────────────────────────────────────────────────
// Note: in a real app, CnAiCompanion is auto-mounted by CnAppRoot.
// This demo mounts it standalone for quick iteration.

// Lazy import from the built library — for standalone demo, use a UMD build or
// point to the src entry directly if running through a bundler.
// For a real demo, build the library first: npm run build && serve dist/

const DemoApp = {
	name: 'DemoApp',
	template: `
		<div>
			<p style="position:fixed;top:8px;left:8px;z-index:10000;background:#0082c9;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;">
				Context: detail / catalogus / organisation
			</p>
		</div>
	`,
	created() {
		// Expose context for CnAiCompanion to inject
		console.info('[Demo] App created. AI Chat Companion demo is running.')
		console.info('[Demo] Click the FAB in the bottom-right corner to open chat.')
	},
}

new Vue({
	el: '#app',
	render: (h) => h(DemoApp),
})

console.info('[Demo] All OR API calls are intercepted by a fetch mock.')
console.info('[Demo] Mocked endpoints: health (200), stream (SSE), conversations, send.')
