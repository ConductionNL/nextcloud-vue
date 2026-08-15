/**
 * Tests for the multi-tenancy plumbing on the object + crud stores.
 *
 * Covers REQ-MT-2..3 from openspec/changes/multi-tenancy-context:
 *   - `organisationUuidGetter` stamps the X-OpenRegister-Organisation
 *      header on every plugin request.
 *   - `setActiveTenantOrganisation(uuid)` clears in-memory caches.
 *   - pre-tenant-switch cached data is NOT returned post-switch.
 */

import { createPinia, setActivePinia } from 'pinia'

import { createObjectStore } from '../../src/store/useObjectStore.js'
import { auditTrailsPlugin } from '../../src/store/plugins/auditTrails.js'

// jsdom defaults `OC.requestToken` to undefined; make it deterministic
global.OC = { requestToken: 'token-test' }

describe('multi-tenancy / object store', () => {
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

	it('stamps X-OpenRegister-Organisation when the factory getter returns a UUID', async () => {
		let currentUuid = 'tenant-a'
		const useStore = createObjectStore('mt-test', {
			plugins: [auditTrailsPlugin()],
			organisationUuidGetter: () => currentUuid,
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		expect(fetchMock).toHaveBeenCalled()
		const lastCall = fetchMock.mock.calls.at(-1)
		const headers = lastCall[1].headers
		expect(headers['X-OpenRegister-Organisation']).toBe('tenant-a')

		// And it flips when the getter's value flips
		fetchMock.mockClear()
		currentUuid = 'tenant-b'
		await store.fetchCollection('case', {})
		const swapped = fetchMock.mock.calls.at(-1)[1].headers
		expect(swapped['X-OpenRegister-Organisation']).toBe('tenant-b')
	})

	it('omits the header when no tenant is active', async () => {
		const useStore = createObjectStore('mt-none', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		await store.fetchCollection('case', {})

		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers).not.toHaveProperty('X-OpenRegister-Organisation')
	})

	it('setActiveTenantOrganisation(uuid) clears the in-memory caches', async () => {
		const useStore = createObjectStore('mt-clear', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')

		// Seed caches
		store.collections = { case: [{ id: 'x' }] }
		store.objects = { case: { x: { id: 'x' } } }
		store.facets = { case: { status: { values: [] } } }

		store.setActiveTenantOrganisation('tenant-zzz')

		expect(store.activeTenantOrganisationUuid).toBe('tenant-zzz')
		expect(store.collections).toEqual({})
		expect(store.objects).toEqual({})
		expect(store.facets).toEqual({})
	})

	it('setActiveTenantOrganisation is idempotent (no-op on same uuid)', () => {
		const useStore = createObjectStore('mt-idem', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')
		store.setActiveTenantOrganisation('A')
		store.collections = { case: [{ id: 'cached' }] }
		store.setActiveTenantOrganisation('A')
		// No reset because uuid did not change
		expect(store.collections).toEqual({ case: [{ id: 'cached' }] })
	})

	it('falls back to activeTenantOrganisationUuid when no factory getter is set', async () => {
		const useStore = createObjectStore('mt-fallback', {})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')
		store.setActiveTenantOrganisation('fallback-tenant')

		await store.fetchCollection('case', {})

		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers['X-OpenRegister-Organisation']).toBe('fallback-tenant')
	})

	it('errors thrown by the getter are downgraded to "no header"', async () => {
		const useStore = createObjectStore('mt-erroring', {
			organisationUuidGetter: () => { throw new Error('boom') },
		})
		const store = useStore()
		store.registerObjectType('case', 'sch-1', 'reg-1')
		await store.fetchCollection('case', {})
		const headers = fetchMock.mock.calls.at(-1)[1].headers
		expect(headers).not.toHaveProperty('X-OpenRegister-Organisation')
	})
})
