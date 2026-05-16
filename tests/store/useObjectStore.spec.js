import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'
import { filesPlugin } from '../../src/store/plugins/files.js'
import { auditTrailsPlugin } from '../../src/store/plugins/auditTrails.js'
import { relationsPlugin } from '../../src/store/plugins/relations.js'
import { lifecyclePlugin } from '../../src/store/plugins/lifecycle.js'

describe('useObjectStore', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		const useStore = createObjectStore('test-store')
		store = useStore()
	})

	describe('registerObjectType', () => {
		it('registers a new object type', () => {
			store.registerObjectType('client', '28', '5')

			expect(store.objectTypeRegistry.client).toEqual({
				schema: '28',
				register: '5',
				registerSlug: null,
				schemaSlug: null,
			})
			expect(store.collections.client).toEqual([])
			expect(store.objects.client).toEqual({})
			expect(store.loading.client).toBe(false)
			expect(store.errors.client).toBe(null)
		})

		it('exposes the type in objectTypes getter', () => {
			store.registerObjectType('client', '28', '5')
			store.registerObjectType('lead', '30', '5')

			expect(store.objectTypes).toEqual(['client', 'lead'])
		})
	})

	describe('unregisterObjectType', () => {
		it('removes all state for a type', () => {
			store.registerObjectType('client', '28', '5')
			store.unregisterObjectType('client')

			expect(store.objectTypeRegistry.client).toBeUndefined()
			expect(store.collections.client).toBeUndefined()
		})
	})

	describe('_buildUrl', () => {
		it('builds URL from type config', () => {
			store.registerObjectType('client', '28', '5')
			expect(store._buildUrl('client')).toBe('/apps/openregister/api/objects/5/28')
		})

		it('appends object ID when provided', () => {
			store.registerObjectType('client', '28', '5')
			expect(store._buildUrl('client', 'abc-123')).toBe('/apps/openregister/api/objects/5/28/abc-123')
		})

		it('throws for unregistered types', () => {
			expect(() => store._buildUrl('unknown')).toThrow('Object type "unknown" is not registered')
		})
	})

	describe('configure', () => {
		it('overrides base URL', () => {
			store.configure({ baseUrl: '/custom/api' })
			store.registerObjectType('item', '1', '2')
			expect(store._buildUrl('item')).toBe('/custom/api/2/1')
		})
	})

	describe('search terms', () => {
		it('sets and clears search terms', () => {
			store.registerObjectType('client', '28', '5')
			store.setSearchTerm('client', 'test query')
			expect(store.getSearchTerm('client')).toBe('test query')

			store.clearSearchTerm('client')
			expect(store.getSearchTerm('client')).toBe('')
		})
	})

	describe('getters with defaults', () => {
		it('returns empty array for unknown collection', () => {
			expect(store.getCollection('nonexistent')).toEqual([])
		})

		it('returns null for unknown object', () => {
			expect(store.getObject('nonexistent', '123')).toBeNull()
		})

		it('returns false for unknown loading state', () => {
			expect(store.isLoading('nonexistent')).toBe(false)
		})

		it('returns default pagination for unknown type', () => {
			expect(store.getPagination('nonexistent')).toEqual({
				total: 0, page: 1, pages: 1, limit: 20,
			})
		})
	})

	describe('fetchCollection', () => {
		it('fetches and stores collection data', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: '1', name: 'Client A' }, { id: '2', name: 'Client B' }],
					total: 2,
					page: 1,
					pages: 1,
				}),
			})

			const result = await store.fetchCollection('client')

			expect(result).toHaveLength(2)
			expect(store.collections.client).toHaveLength(2)
			expect(store.pagination.client.total).toBe(2)
			expect(store.loading.client).toBe(false)
		})

		it('handles API errors', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: () => Promise.resolve({ message: 'Not found' }),
			})

			const result = await store.fetchCollection('client')

			expect(result).toEqual([])
			expect(store.errors.client).toBeTruthy()
			expect(store.errors.client.status).toBe(404)
		})

		it('handles network errors', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))

			const result = await store.fetchCollection('client')

			expect(result).toEqual([])
			expect(store.errors.client).toBeTruthy()
			expect(store.errors.client.status).toBe(0)
		})
	})

	describe('fetchObject', () => {
		it('fetches and caches a single object', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 'abc', name: 'Test Client' }),
			})

			const result = await store.fetchObject('client', 'abc')

			expect(result).toEqual({ id: 'abc', name: 'Test Client' })
			expect(store.getObject('client', 'abc')).toEqual({ id: 'abc', name: 'Test Client' })
		})
	})

	describe('saveObject', () => {
		it('creates new objects with POST', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 'new-1', name: 'New Client' }),
			})

			await store.saveObject('client', { name: 'New Client' })

			expect(global.fetch).toHaveBeenCalledWith(
				'/apps/openregister/api/objects/5/28',
				expect.objectContaining({ method: 'POST' }),
			)
		})

		it('updates existing objects with PUT', async () => {
			store.registerObjectType('client', '28', '5')

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 'abc', name: 'Updated' }),
			})

			await store.saveObject('client', { id: 'abc', name: 'Updated' })

			expect(global.fetch).toHaveBeenCalledWith(
				'/apps/openregister/api/objects/5/28/abc',
				expect.objectContaining({ method: 'PUT' }),
			)
		})
	})

	describe('deleteObject', () => {
		it('removes from cache and collection', async () => {
			store.registerObjectType('client', '28', '5')
			store.collections.client = [{ id: 'abc' }, { id: 'def' }]
			store.objects.client = { abc: { id: 'abc' }, def: { id: 'def' } }

			global.fetch = jest.fn().mockResolvedValue({ ok: true })

			const result = await store.deleteObject('client', 'abc')

			expect(result).toBe(true)
			expect(store.objects.client.abc).toBeUndefined()
			expect(store.collections.client).toHaveLength(1)
			expect(store.collections.client[0].id).toBe('def')
		})
	})

	describe('deleteObjects', () => {
		it('returns empty result for empty ids', async () => {
			store.registerObjectType('client', '28', '5')
			const result = await store.deleteObjects('client', [])
			expect(result).toEqual({ successfulIds: [], failedIds: [] })
		})

		it('deletes multiple objects in parallel and updates cache', async () => {
			store.registerObjectType('client', '28', '5')
			store.collections.client = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
			store.objects.client = { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } }

			global.fetch = jest.fn().mockResolvedValue({ ok: true })

			const result = await store.deleteObjects('client', ['a', 'b', 'c'])

			expect(result).toEqual({ successfulIds: ['a', 'b', 'c'], failedIds: [] })
			expect(store.objects.client).toEqual({})
			expect(store.collections.client).toEqual([])
			expect(global.fetch).toHaveBeenCalledTimes(3)
		})

		it('returns partial success when some deletes fail', async () => {
			store.registerObjectType('client', '28', '5')
			store.collections.client = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
			store.objects.client = { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } }

			global.fetch = jest.fn()
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false })
				.mockResolvedValueOnce({ ok: true })

			const result = await store.deleteObjects('client', ['a', 'b', 'c'])

			expect(result.successfulIds).toEqual(['a', 'c'])
			expect(result.failedIds).toEqual(['b'])
			expect(store.objects.client).toEqual({ b: { id: 'b' } })
			expect(store.collections.client.map((o) => o.id)).toEqual(['b'])
		})

		it('sets error when any delete fails', async () => {
			store.registerObjectType('client', '28', '5')
			global.fetch = jest.fn().mockResolvedValue({ ok: false })

			await store.deleteObjects('client', ['x'])

			expect(store.errors.client).toBeTruthy()
			expect(store.getError('client').message).toContain('Failed to delete')
		})
	})
})

describe('createObjectStore with plugins', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('merges plugin state into the store', () => {
		const useStore = createObjectStore('test-plugins', {
			plugins: [filesPlugin(), auditTrailsPlugin()],
		})
		store = useStore()

		expect(store.files).toBeDefined()
		expect(store.files.results).toEqual([])
		expect(store.filesLoading).toBe(false)
		expect(store.filesError).toBeNull()
		expect(store.auditTrails).toBeDefined()
		expect(store.auditTrailsLoading).toBe(false)
	})

	it('merges plugin actions', () => {
		const useStore = createObjectStore('test-actions', {
			plugins: [filesPlugin(), lifecyclePlugin()],
		})
		store = useStore()

		expect(typeof store.fetchFiles).toBe('function')
		expect(typeof store.uploadFiles).toBe('function')
		expect(typeof store.publishFile).toBe('function')
		expect(typeof store.deleteFile).toBe('function')
		expect(typeof store.batchFiles).toBe('function')
		expect(typeof store.fetchTags).toBe('function')
		expect(typeof store.lockObject).toBe('function')
		expect(typeof store.unlockObject).toBe('function')
		expect(typeof store.publishObject).toBe('function')
		expect(typeof store.revertObject).toBe('function')
	})

	it('files plugin exposes tags state and getters', () => {
		const useStore = createObjectStore('test-tags', {
			plugins: [filesPlugin()],
		})
		store = useStore()

		expect(store.tags).toEqual([])
		expect(store.tagsLoading).toBe(false)
		expect(store.tagsError).toBeNull()
		expect(store.getTags).toEqual([])
		expect(store.isTagsLoading).toBe(false)
		expect(store.getTagsError).toBeNull()
	})

	it('batchFiles posts to /files/batch with one round-trip for many ids', async () => {
		const useStore = createObjectStore('test-batch-files', {
			plugins: [filesPlugin()],
		})
		store = useStore()
		store.registerObjectType('case', '28', '5')

		// Two responses: the batch POST + the follow-up fetchFiles refresh.
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({
					results: [{ fileId: 1, ok: true }, { fileId: 2, ok: true }],
					summary: { succeeded: 2, failed: 0, total: 2 },
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [], total: 0, page: 1, pages: 1, limit: 20, offset: 0 }),
			})

		const result = await store.batchFiles('case', 'obj-uuid', 'publish', [1, 2])

		expect(global.fetch).toHaveBeenCalledTimes(2)
		const [url, opts] = global.fetch.mock.calls[0]
		expect(url).toContain('/files/batch')
		expect(opts.method).toBe('POST')
		expect(JSON.parse(opts.body)).toEqual({
			action: 'publish',
			fileIds: [1, 2],
		})
		expect(result.summary).toEqual({ succeeded: 2, failed: 0, total: 2 })
	})

	it('batchFiles accepts 207 partial-success without flagging error', async () => {
		const useStore = createObjectStore('test-batch-207', {
			plugins: [filesPlugin()],
		})
		store = useStore()
		store.registerObjectType('case', '28', '5')

		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 207,
				json: () => Promise.resolve({
					results: [{ fileId: 1, ok: true }, { fileId: 2, ok: false, error: 'locked' }],
					summary: { succeeded: 1, failed: 1, total: 2 },
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [], total: 0, page: 1, pages: 1, limit: 20, offset: 0 }),
			})

		const result = await store.batchFiles('case', 'obj-uuid', 'delete', [1, 2])

		expect(result).not.toBeNull()
		expect(result.summary.failed).toBe(1)
		expect(store.filesError).toBeNull()
	})

	it('fetchTags calls tags API and stores array of strings', async () => {
		const useStore = createObjectStore('test-fetch-tags', {
			plugins: [filesPlugin()],
		})
		store = useStore()

		const tagsPayload = ['important', 'draft', 'reviewed']
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(tagsPayload),
		})

		const result = await store.fetchTags()

		expect(global.fetch).toHaveBeenCalledWith(
			'/apps/openregister/api/tags',
			expect.objectContaining({ method: 'GET' }),
		)
		expect(store.tags).toEqual(tagsPayload)
		expect(store.getTags).toEqual(tagsPayload)
		expect(result).toEqual(tagsPayload)
	})

	it('merges relations plugin (3 sub-resources)', () => {
		const useStore = createObjectStore('test-relations', {
			plugins: [relationsPlugin()],
		})
		store = useStore()

		expect(store.contracts).toBeDefined()
		expect(store.uses).toBeDefined()
		expect(store.used).toBeDefined()
		expect(typeof store.fetchContracts).toBe('function')
		expect(typeof store.fetchUses).toBe('function')
		expect(typeof store.fetchUsed).toBe('function')
	})

	it('clearAllSubResources calls all plugin clear methods', () => {
		const useStore = createObjectStore('test-clear', {
			plugins: [filesPlugin(), auditTrailsPlugin()],
		})
		store = useStore()

		store.files = { results: [{ id: 1 }], total: 1, page: 1, pages: 1, limit: 20, offset: 0 }
		store.auditTrails = { results: [{ id: 2 }], total: 1, page: 1, pages: 1, limit: 20, offset: 0 }

		store.clearAllSubResources()

		expect(store.files.results).toEqual([])
		expect(store.auditTrails.results).toEqual([])
	})

	it('works without plugins (backwards compatible)', () => {
		const useStore = createObjectStore('test-no-plugins')
		store = useStore()

		expect(typeof store.fetchCollection).toBe('function')
		expect(typeof store.fetchObject).toBe('function')
		expect(typeof store.saveObject).toBe('function')
		expect(typeof store.deleteObject).toBe('function')
		expect(typeof store.deleteObjects).toBe('function')
		expect(store.files).toBeUndefined()
	})
})
