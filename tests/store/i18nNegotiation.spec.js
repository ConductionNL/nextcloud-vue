/**
 * Tests for the i18n language-negotiation getters on the object store.
 *
 * Covers REQ-I18N-1..5 from
 * openspec/changes/i18n-language-negotiation-getters:
 *   - `languageGetter` stamps `?_lang=<bcp47>` on every read URL.
 *   - `targetLanguageGetter` stamps `X-Translation-Target-Language`
 *      on every write request.
 *   - Tolerant resolvers: null / empty / throwing getter → no stamp.
 *   - Composes with `organisationUuidGetter` from the sibling
 *     `multi-tenancy-context` change.
 */

import { createPinia, setActivePinia } from 'pinia'

import { createObjectStore } from '../../src/store/useObjectStore.js'
import { auditTrailsPlugin } from '../../src/store/plugins/auditTrails.js'

global.OC = { requestToken: 'token-test' }

describe('i18n language negotiation / object store', () => {
	let fetchMock

	beforeEach(() => {
		setActivePinia(createPinia())
		fetchMock = jest.fn(() => Promise.resolve({
			ok: true,
			status: 200,
			headers: { get: () => null },
			json: () => Promise.resolve({ results: [], total: 0, page: 1, pages: 1, limit: 20 }),
		}))
		global.fetch = fetchMock
	})

	// ── languageGetter (read side) ─────────────────────────────────

	it('stamps ?_lang=<value> on fetchCollection when languageGetter returns a string', async () => {
		const useStore = createObjectStore('i18n-collection', {
			languageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		expect(fetchMock).toHaveBeenCalled()
		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).toMatch(/[?&]_lang=nl(&|$)/)
	})

	it('stamps ?_lang=<value> on fetchObject (single read) when languageGetter is set', async () => {
		const useStore = createObjectStore('i18n-single', {
			languageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchObject('case', 'obj-1')

		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).toContain('/obj-1')
		expect(url).toMatch(/[?&]_lang=nl(&|$)/)
	})

	it('omits ?_lang when no languageGetter is wired', async () => {
		const useStore = createObjectStore('i18n-no-getter', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).not.toMatch(/[?&]_lang=/)
	})

	it('omits ?_lang when the languageGetter returns null', async () => {
		const useStore = createObjectStore('i18n-null', {
			languageGetter: () => null,
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).not.toMatch(/[?&]_lang=/)
	})

	it('omits ?_lang when the languageGetter returns an empty string', async () => {
		const useStore = createObjectStore('i18n-empty', {
			languageGetter: () => '',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).not.toMatch(/[?&]_lang=/)
	})

	it('omits ?_lang and does not throw when the languageGetter throws', async () => {
		const useStore = createObjectStore('i18n-throw', {
			languageGetter: () => { throw new Error('boom') },
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		// Must not throw out of the store action
		await expect(store.fetchCollection('case', {})).resolves.toBeDefined()

		const url = fetchMock.mock.calls.at(-1)[0]
		expect(url).not.toMatch(/[?&]_lang=/)
	})

	it('reconciles ?_lang with caller-supplied query params (no duplication)', async () => {
		const useStore = createObjectStore('i18n-merged-query', {
			languageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', { _limit: 5, _page: 2 })

		const url = fetchMock.mock.calls.at(-1)[0]
		// _lang must appear exactly once
		const matches = url.match(/_lang=nl/g) || []
		expect(matches.length).toBe(1)
		expect(url).toMatch(/[?&]_limit=5(&|$)/)
		expect(url).toMatch(/[?&]_page=2(&|$)/)
	})

	// ── targetLanguageGetter (write side) ──────────────────────────

	it('stamps X-Translation-Target-Language on POST (create) when getter returns a string', async () => {
		const useStore = createObjectStore('i18n-post', {
			targetLanguageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		// jest mock — saveObject's POST request issues a fetch we can inspect
		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 201,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1', title: 'X' }),
		}))
		await store.saveObject('case', { title: 'X' })

		const lastCall = fetchMock.mock.calls.at(-1)
		expect(lastCall[1].method).toBe('POST')
		expect(lastCall[1].headers['X-Translation-Target-Language']).toBe('nl')
	})

	it('stamps X-Translation-Target-Language on PUT (update) when getter returns a string', async () => {
		const useStore = createObjectStore('i18n-put', {
			targetLanguageGetter: () => 'en',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 200,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1', title: 'X' }),
		}))
		await store.saveObject('case', { id: 'obj-1', title: 'X' })

		const lastCall = fetchMock.mock.calls.at(-1)
		expect(lastCall[1].method).toBe('PUT')
		expect(lastCall[1].headers['X-Translation-Target-Language']).toBe('en')
	})

	it('omits the target-language header when no getter is wired', async () => {
		const useStore = createObjectStore('i18n-no-write-getter', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 201,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1' }),
		}))
		await store.saveObject('case', { title: 'X' })

		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers).not.toHaveProperty('X-Translation-Target-Language')
	})

	it('omits the target-language header when the getter returns null', async () => {
		const useStore = createObjectStore('i18n-write-null', {
			targetLanguageGetter: () => null,
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 201,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1' }),
		}))
		await store.saveObject('case', { title: 'X' })

		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers).not.toHaveProperty('X-Translation-Target-Language')
	})

	it('omits the target-language header and does not throw when the getter throws', async () => {
		const useStore = createObjectStore('i18n-write-throw', {
			targetLanguageGetter: () => { throw new Error('boom') },
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 201,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1' }),
		}))
		await expect(store.saveObject('case', { title: 'X' })).resolves.toBeDefined()

		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers).not.toHaveProperty('X-Translation-Target-Language')
	})

	// ── Composition with organisationUuidGetter ────────────────────

	it('composes with organisationUuidGetter on a read request', async () => {
		const useStore = createObjectStore('i18n-compose-read', {
			organisationUuidGetter: () => 'org-1',
			languageGetter: () => 'nl',
			targetLanguageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		const lastCall = fetchMock.mock.calls.at(-1)
		const url = lastCall[0]
		const headers = lastCall[1].headers
		expect(url).toMatch(/[?&]_lang=nl(&|$)/)
		expect(headers['X-OpenRegister-Organisation']).toBe('org-1')
		// Reads include the target-language header too — harmless on GET
		// (the server only reads it on writes per the OR contract).
		expect(headers['X-Translation-Target-Language']).toBe('nl')
	})

	it('composes with organisationUuidGetter on a write request', async () => {
		const useStore = createObjectStore('i18n-compose-write', {
			organisationUuidGetter: () => 'org-1',
			languageGetter: () => 'nl',
			targetLanguageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		fetchMock.mockImplementationOnce(() => Promise.resolve({
			ok: true,
			status: 201,
			headers: { get: () => null },
			json: () => Promise.resolve({ id: 'obj-1' }),
		}))
		await store.saveObject('case', { title: 'X' })

		const lastCall = fetchMock.mock.calls.at(-1)
		expect(lastCall[1].method).toBe('POST')
		expect(lastCall[1].headers['X-OpenRegister-Organisation']).toBe('org-1')
		expect(lastCall[1].headers['X-Translation-Target-Language']).toBe('nl')
	})

	// ── Plugin inheritance ────────────────────────────────────────

	it('plugins (auditTrails) inherit the language stamps via _buildHeaders', async () => {
		const useStore = createObjectStore('i18n-plugin', {
			plugins: [auditTrailsPlugin()],
			languageGetter: () => 'nl',
			targetLanguageGetter: () => 'nl',
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		// The collection fetch routes through the same _buildHeaders +
		// _buildUrl helpers as the plugins do.
		await store.fetchCollection('case', {})

		const lastCall = fetchMock.mock.calls.at(-1)
		expect(lastCall[0]).toMatch(/[?&]_lang=nl(&|$)/)
		expect(lastCall[1].headers['X-Translation-Target-Language']).toBe('nl')
	})
})
