/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * cnFetch under `host: 'public'`: bearer auth, a configured base, no
 * requesttoken, no generateUrl, and no credential in anything that escapes.
 *
 * @spec openspec/changes/public-manifest-runtime/tasks.md#task-2
 */
const mockGenerateUrl = jest.fn((p) => `/index.php${p}`)
jest.mock('@nextcloud/router', () => ({ generateUrl: (...a) => mockGenerateUrl(...a) }))

import { cnFetch, cnFetchJson, CnHttpError, configureCnFetch } from '../../src/utils/cnFetch.js'

const SECRET = 'bearer-secret-9f3a'

function stub({ status = 200, body = '{}' } = {}) {
	return { ok: status >= 200 && status < 300, status, statusText: `status ${status}`, text: async () => body }
}

describe('cnFetch public transport', () => {
	let originalFetch
	beforeEach(() => {
		originalFetch = global.fetch
		global.OC = { requestToken: 'tok-123' }
		mockGenerateUrl.mockClear()
	})
	afterEach(() => {
		global.fetch = originalFetch
		delete global.OC
		configureCnFetch({ host: 'nextcloud' })
	})

	it('sends the bearer credential and no requesttoken, from the configured base', async () => {
		let seen
		global.fetch = async (url, opts) => {
			seen = { url, opts }
			return stub()
		}
		configureCnFetch({ host: 'public', baseUrl: 'https://portal.example/api/', credential: SECRET })
		await cnFetch('/cases', { query: { limit: 5 } })
		expect(seen.url).toBe('https://portal.example/api/cases?limit=5')
		expect(seen.opts.headers.Authorization).toBe(`Bearer ${SECRET}`)
		expect(seen.opts.headers).not.toHaveProperty('requesttoken')
		expect(seen.opts.headers).not.toHaveProperty('OCS-APIREQUEST')
		expect(mockGenerateUrl).not.toHaveBeenCalled()
	})

	it('reads a credential function on every request', async () => {
		const tokens = ['one', 'two']
		const seen = []
		global.fetch = async (url, opts) => {
			seen.push(opts.headers.Authorization)
			return stub()
		}
		configureCnFetch({ host: 'public', baseUrl: 'https://p', credential: () => tokens.shift() })
		await cnFetch('/a')
		await cnFetch('/b')
		expect(seen).toEqual(['Bearer one', 'Bearer two'])
	})

	it('keeps the credential out of a failed request, the URL and the error payload', async () => {
		global.fetch = async () => stub({ status: 500, body: JSON.stringify({ error: `bad token ${SECRET}`, echo: { auth: `Bearer ${SECRET}` } }) })
		configureCnFetch({ host: 'public', baseUrl: 'https://p', credential: SECRET })
		let caught
		try {
			await cnFetchJson('/cases')
		} catch (err) {
			caught = err
		}
		expect(caught).toBeInstanceOf(CnHttpError)
		const everything = JSON.stringify({ message: caught.message, body: caught.body, url: caught.url, stack: String(caught.stack).split('\n')[0] })
		expect(everything).not.toContain(SECRET)
		expect(caught.message).toContain('[redacted]')
	})

	it('leaves nextcloud mode as it was', async () => {
		let seen
		global.fetch = async (url, opts) => {
			seen = { url, opts }
			return stub()
		}
		await cnFetch('/apps/x/api/y')
		expect(seen.opts.headers.requesttoken).toBe('tok-123')
		expect(seen.opts.headers).not.toHaveProperty('Authorization')
		expect(mockGenerateUrl).toHaveBeenCalled()
	})

	it('refuses an unrecognised host, naming the accepted values', () => {
		expect(() => configureCnFetch({ host: 'portal' })).toThrow(/nextcloud, public/)
	})
})
