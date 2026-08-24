/**
 * cnFetch / cnFetchJson — the library-owned HTTP client (ADR-071 Decision 1).
 */

import { cnFetch, cnFetchJson, CnHttpError } from '../../src/utils/cnFetch.js'

describe('cnFetch', () => {
	let originalFetch
	let originalOC

	beforeEach(() => {
		originalFetch = global.fetch
		originalOC = global.OC
		global.OC = { requestToken: 'tok-123' }
	})

	afterEach(() => {
		global.fetch = originalFetch
		global.OC = originalOC
	})

	/**
	 * Build a stub Response.
	 *
	 * @param {object} opts Options.
	 * @param {number} opts.status HTTP status.
	 * @param {string} opts.body Raw body text.
	 * @return {object} A Response-like object.
	 */
	function stubResponse({ status = 200, body = '' } = {}) {
		return {
			ok: status >= 200 && status < 300,
			status,
			statusText: `status ${status}`,
			text: async () => body,
		}
	}

	it('sends the Nextcloud CSRF token, so an app never hand-sets requesttoken', async () => {
		let seen = null
		global.fetch = async (url, opts) => {
			seen = { url, opts }
			return stubResponse({ body: '{}' })
		}

		await cnFetch('/apps/x/api/y')

		expect(seen.opts.headers.requesttoken).toBe('tok-123')
	})

	it('appends a serialised query string', async () => {
		let seenUrl = null
		global.fetch = async (url) => {
			seenUrl = url
			return stubResponse({ body: '{}' })
		}

		await cnFetch('/apps/x/api/y', { query: { limit: 5 } })

		expect(seenUrl).toContain('limit=5')
	})

	it('lets a caller override a header without bypassing the helper', async () => {
		// Bypassing is exactly how apps end up hand-setting requesttoken again,
		// so an override must not require dropping to raw fetch.
		let seen = null
		global.fetch = async (url, opts) => {
			seen = opts
			return stubResponse({ body: '{}' })
		}

		await cnFetch('/apps/x/api/y', { headers: { Accept: 'text/csv' } })

		expect(seen.headers.Accept).toBe('text/csv')
		expect(seen.headers.requesttoken).toBe('tok-123')
	})

	it('does NOT throw on a non-2xx, so a probe can read the status', async () => {
		global.fetch = async () => stubResponse({ status: 404, body: '{}' })

		const response = await cnFetch('/apps/x/api/missing')

		expect(response.status).toBe(404)
	})
})

describe('cnFetchJson', () => {
	let originalFetch
	let originalOC

	beforeEach(() => {
		originalFetch = global.fetch
		originalOC = global.OC
		global.OC = { requestToken: 'tok-123' }
	})

	afterEach(() => {
		global.fetch = originalFetch
		global.OC = originalOC
	})

	/**
	 * Build a stub Response.
	 *
	 * @param {object} opts Options.
	 * @param {number} opts.status HTTP status.
	 * @param {string} opts.body Raw body text.
	 * @return {object} A Response-like object.
	 */
	function stubResponse({ status = 200, body = '' } = {}) {
		return {
			ok: status >= 200 && status < 300,
			status,
			statusText: `status ${status}`,
			text: async () => body,
		}
	}

	it('returns the parsed body on success', async () => {
		global.fetch = async () => stubResponse({ body: '{"total":3}' })

		await expect(cnFetchJson('/apps/x/api/y')).resolves.toEqual({ total: 3 })
	})

	it('resolves an empty body to null rather than throwing', async () => {
		// DELETE endpoints in this stack answer 204. Making the happy path throw
		// teaches callers to wrap everything in try/catch, which is how real
		// errors get swallowed.
		global.fetch = async () => stubResponse({ status: 204, body: '' })

		await expect(cnFetchJson('/apps/x/api/y', { method: 'DELETE' })).resolves.toBeNull()
	})

	it('throws CnHttpError carrying the status, not just a message', async () => {
		// The status is the single most useful fact about a failure. A bare
		// Error(message) loses it and callers re-parse the string to recover it.
		global.fetch = async () => stubResponse({ status: 403, body: '{"error":"nope"}' })

		expect.assertions(3)
		try {
			await cnFetchJson('/apps/x/api/y')
		} catch (e) {
			expect(e).toBeInstanceOf(CnHttpError)
			expect(e.status).toBe(403)
			expect(e.body).toEqual({ error: 'nope' })
		}
	})

	it('reads the body ONCE, so the error path does not re-consume a spent stream', async () => {
		// A Response body is a stream: calling .json() again after .text() throws
		// "body stream already read" and masks the real HTTP error.
		let textCalls = 0
		global.fetch = async () => ({
			ok: false,
			status: 500,
			statusText: 'status 500',
			text: async () => {
				textCalls += 1
				return '{"error":"boom"}'
			},
		})

		await expect(cnFetchJson('/apps/x/api/y')).rejects.toBeInstanceOf(CnHttpError)
		expect(textCalls).toBe(1)
	})

	it('falls back to raw text when the body is not JSON', async () => {
		// An HTML error page with HTTP 500 must not become a JSON parse error
		// that hides the status.
		global.fetch = async () => stubResponse({ status: 500, body: '<html>oops</html>' })

		expect.assertions(2)
		try {
			await cnFetchJson('/apps/x/api/y')
		} catch (e) {
			expect(e.status).toBe(500)
			expect(e.body).toBe('<html>oops</html>')
		}
	})
})
