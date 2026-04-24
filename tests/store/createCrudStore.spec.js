import { createPinia, setActivePinia } from 'pinia'
import { createCrudStore } from '../../src/store/createCrudStore.js'

// Simple entity class for testing
class TestEntity {

	constructor(data) {
		Object.assign(this, data)
	}

}

describe('createCrudStore', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		jest.clearAllMocks()
	})

	describe('factory validation', () => {
		it('throws if endpoint is missing', () => {
			expect(() => createCrudStore('test', {})).toThrow('config.endpoint is required')
		})

		it('creates a usable store composable', () => {
			const useStore = createCrudStore('test', { endpoint: 'tests' })
			store = useStore()
			expect(store).toBeDefined()
			expect(typeof store.setItem).toBe('function')
		})
	})

	describe('initial state', () => {
		beforeEach(() => {
			const useStore = createCrudStore('basic', { endpoint: 'items' })
			store = useStore()
		})

		it('has correct default state', () => {
			expect(store.item).toBeNull()
			expect(store.list).toEqual([])
			expect(store.filters).toEqual({})
			expect(store.pagination).toEqual({ page: 1, limit: 20 })
		})

		it('does not include loading/viewMode state by default', () => {
			expect(store.loading).toBeUndefined()
			expect(store.error).toBeUndefined()
			expect(store.viewMode).toBeUndefined()
		})
	})

	describe('feature flags', () => {
		it('adds loading state when features.loading is true', () => {
			const useStore = createCrudStore('loadable', {
				endpoint: 'items',
				features: { loading: true },
			})
			store = useStore()
			expect(store.loading).toBe(false)
			expect(store.error).toBeNull()
			expect(store.isLoading).toBe(false)
			expect(store.getError).toBeNull()
		})

		it('adds viewMode state when features.viewMode is true', () => {
			const useStore = createCrudStore('viewable', {
				endpoint: 'items',
				features: { viewMode: true },
			})
			store = useStore()
			expect(store.viewMode).toBe('cards')
			expect(store.getViewMode).toBe('cards')
		})

		it('setViewMode updates viewMode', () => {
			const useStore = createCrudStore('vm', {
				endpoint: 'items',
				features: { viewMode: true },
			})
			store = useStore()
			store.setViewMode('table')
			expect(store.viewMode).toBe('table')
		})
	})

	describe('setItem', () => {
		it('sets item without entity class', () => {
			const useStore = createCrudStore('raw', { endpoint: 'items' })
			store = useStore()
			const data = { id: 1, name: 'Test' }
			store.setItem(data)
			expect(store.item).toEqual(data)
		})

		it('wraps item in entity class when configured', () => {
			const useStore = createCrudStore('wrapped', {
				endpoint: 'items',
				entity: TestEntity,
			})
			store = useStore()
			store.setItem({ id: 1, name: 'Test' })
			expect(store.item).toBeInstanceOf(TestEntity)
			expect(store.item.name).toBe('Test')
		})

		it('sets item to null when passed null', () => {
			const useStore = createCrudStore('nullable', {
				endpoint: 'items',
				entity: TestEntity,
			})
			store = useStore()
			store.setItem({ id: 1 })
			store.setItem(null)
			expect(store.item).toBeNull()
		})
	})

	describe('setList', () => {
		it('sets list without entity class', () => {
			const useStore = createCrudStore('rawlist', { endpoint: 'items' })
			store = useStore()
			const data = [{ id: 1 }, { id: 2 }]
			store.setList(data)
			expect(store.list).toHaveLength(2)
			expect(store.list[0]).toEqual({ id: 1 })
		})

		it('wraps list items in entity class when configured', () => {
			const useStore = createCrudStore('wrappedlist', {
				endpoint: 'items',
				entity: TestEntity,
			})
			store = useStore()
			store.setList([{ id: 1 }, { id: 2 }])
			expect(store.list).toHaveLength(2)
			store.list.forEach((item) => {
				expect(item).toBeInstanceOf(TestEntity)
			})
		})

		it('creates a new array (no reference sharing)', () => {
			const useStore = createCrudStore('copy', { endpoint: 'items' })
			store = useStore()
			const original = [{ id: 1 }]
			store.setList(original)
			original.push({ id: 2 })
			expect(store.list).toHaveLength(1)
		})
	})

	describe('setPagination', () => {
		it('sets page and limit', () => {
			const useStore = createCrudStore('pag', { endpoint: 'items' })
			store = useStore()
			store.setPagination(3, 50)
			expect(store.pagination).toEqual({ page: 3, limit: 50 })
		})

		it('defaults limit to 20', () => {
			const useStore = createCrudStore('pag2', { endpoint: 'items' })
			store = useStore()
			store.setPagination(2)
			expect(store.pagination).toEqual({ page: 2, limit: 20 })
		})
	})

	describe('setFilters', () => {
		it('merges filters into existing', () => {
			const useStore = createCrudStore('filt', { endpoint: 'items' })
			store = useStore()
			store.setFilters({ type: 'a' })
			store.setFilters({ status: 'active' })
			expect(store.filters).toEqual({ type: 'a', status: 'active' })
		})
	})

	describe('cleanForSave', () => {
		it('strips default fields', () => {
			const useStore = createCrudStore('clean', { endpoint: 'items' })
			store = useStore()
			const cleaned = store.cleanForSave({
				id: 1,
				uuid: 'abc',
				created: '2024-01-01',
				updated: '2024-01-02',
				name: 'Test',
			})
			expect(cleaned.name).toBe('Test')
			expect(cleaned.id).toBeUndefined()
			expect(cleaned.uuid).toBeUndefined()
			expect(cleaned.created).toBeUndefined()
			expect(cleaned.updated).toBeUndefined()
		})

		it('uses custom cleanFields', () => {
			const useStore = createCrudStore('customclean', {
				endpoint: 'items',
				cleanFields: ['id', 'secret'],
			})
			store = useStore()
			const cleaned = store.cleanForSave({
				id: 1,
				secret: 'hidden',
				uuid: 'keep-me',
				name: 'Test',
			})
			expect(cleaned.id).toBeUndefined()
			expect(cleaned.secret).toBeUndefined()
			expect(cleaned.uuid).toBe('keep-me')
			expect(cleaned.name).toBe('Test')
		})
	})

	describe('extend', () => {
		it('adds custom state', () => {
			const useStore = createCrudStore('ext-state', {
				endpoint: 'items',
				extend: {
					state: () => ({ customField: 'hello' }),
				},
			})
			store = useStore()
			expect(store.customField).toBe('hello')
		})

		it('adds custom getters', () => {
			const useStore = createCrudStore('ext-get', {
				endpoint: 'items',
				extend: {
					state: () => ({ extra: 42 }),
					getters: {
						doubleExtra: (state) => state.extra * 2,
					},
				},
			})
			store = useStore()
			expect(store.doubleExtra).toBe(84)
		})

		it('adds custom actions', () => {
			const useStore = createCrudStore('ext-act', {
				endpoint: 'items',
				extend: {
					actions: {
						customAction() {
							this.item = { custom: true }
						},
					},
				},
			})
			store = useStore()
			store.customAction()
			expect(store.item).toEqual({ custom: true })
		})

		it('allows overriding base actions', () => {
			const useStore = createCrudStore('ext-override', {
				endpoint: 'items',
				extend: {
					actions: {
						setItem(data) {
							this.item = data ? { ...data, overridden: true } : null
						},
					},
				},
			})
			store = useStore()
			store.setItem({ id: 1 })
			expect(store.item.overridden).toBe(true)
		})
	})

	describe('refreshList', () => {
		beforeEach(() => {
			const useStore = createCrudStore('fetchlist', {
				endpoint: 'items',
				features: { loading: true },
			})
			store = useStore()
		})

		it('fetches and sets list from API', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ results: [{ id: 1 }, { id: 2 }] }),
			})

			const result = await store.refreshList()

			expect(global.fetch).toHaveBeenCalledTimes(1)
			expect(store.list).toHaveLength(2)
			expect(result.data).toHaveLength(2)
			expect(store.loading).toBe(false)
		})

		it('appends search param when provided', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ results: [] }),
			})

			await store.refreshList('test query')

			const calledUrl = global.fetch.mock.calls[0][0]
			expect(calledUrl).toContain('_search=test%20query')
		})

		it('sets loading state during fetch', async () => {
			let loadingDuringFetch = false
			global.fetch = jest.fn().mockImplementation(() => {
				loadingDuringFetch = store.loading
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ results: [] }),
				})
			})

			await store.refreshList()

			expect(loadingDuringFetch).toBe(true)
			expect(store.loading).toBe(false)
		})

		it('skips loading toggle when soft=true', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ results: [] }),
			})

			let loadingDuringFetch = false
			const origFetch = global.fetch
			global.fetch = jest.fn().mockImplementation((...args) => {
				loadingDuringFetch = store.loading
				return origFetch(...args)
			})

			await store.refreshList(null, true)
			expect(loadingDuringFetch).toBe(false)
		})

		it('throws and sets error on failed response', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: () => Promise.resolve({ message: 'Server error' }),
			})

			await expect(store.refreshList()).rejects.toBeDefined()
			expect(store.loading).toBe(false)
			expect(store.error).toBeTruthy()
		})
	})

	describe('refreshList with custom parseListResponse', () => {
		it('uses custom parser', async () => {
			const useStore = createCrudStore('custom-parse', {
				endpoint: 'items',
				parseListResponse(json) {
					return json.data.items
				},
			})
			store = useStore()

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: { items: [{ id: 1 }] } }),
			})

			await store.refreshList()
			expect(store.list).toHaveLength(1)
		})

		it('parser receives store as this', async () => {
			let receivedThis = null
			const useStore = createCrudStore('parse-this', {
				endpoint: 'items',
				parseListResponse(json) {
					receivedThis = this
					return json.results || []
				},
			})
			store = useStore()

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ results: [] }),
			})

			await store.refreshList()
			expect(receivedThis).toBe(store)
		})
	})

	describe('getOne', () => {
		beforeEach(() => {
			const useStore = createCrudStore('getone', {
				endpoint: 'items',
				entity: TestEntity,
				features: { loading: true },
			})
			store = useStore()
		})

		it('fetches item by ID and sets it', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 42, name: 'Fetched' }),
			})

			const data = await store.getOne(42)

			expect(global.fetch).toHaveBeenCalledTimes(1)
			const calledUrl = global.fetch.mock.calls[0][0]
			expect(calledUrl).toContain('/42')
			expect(data).toEqual({ id: 42, name: 'Fetched' })
			expect(store.item).toBeInstanceOf(TestEntity)
			expect(store.item.name).toBe('Fetched')
			expect(store.loading).toBe(false)
		})

		it('throws on error response', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				json: () => Promise.resolve({ message: 'Not found' }),
			})

			await expect(store.getOne(999)).rejects.toBeDefined()
			expect(store.loading).toBe(false)
			expect(store.error).toBeTruthy()
		})
	})

	describe('save', () => {
		beforeEach(() => {
			const useStore = createCrudStore('saveable', {
				endpoint: 'items',
				entity: TestEntity,
				features: { loading: true },
			})
			store = useStore()
			// Mock refreshList to avoid secondary fetch
			store.refreshList = jest.fn().mockResolvedValue({ response: {}, data: [] })
		})

		it('throws if item is falsy', async () => {
			await expect(store.save(null)).rejects.toThrow('No saveable to save')
		})

		it('POSTs for new items (no id)', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1, name: 'Created' }),
			})

			const result = await store.save({ name: 'New Item' })

			expect(global.fetch).toHaveBeenCalledWith(
				expect.not.stringContaining('/undefined'),
				expect.objectContaining({ method: 'POST' }),
			)
			expect(result.data).toBeInstanceOf(TestEntity)
			expect(store.item).toBeInstanceOf(TestEntity)
		})

		it('PUTs for existing items (has id)', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 5, name: 'Updated' }),
			})

			await store.save({ id: 5, name: 'Updated' })

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/5'),
				expect.objectContaining({ method: 'PUT' }),
			)
		})

		it('strips cleanFields from request body', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1, name: 'Test' }),
			})

			await store.save({ name: 'Test' })

			const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
			expect(sentBody.id).toBeUndefined()
			expect(sentBody.uuid).toBeUndefined()
			expect(sentBody.created).toBeUndefined()
			expect(sentBody.updated).toBeUndefined()
		})

		it('refreshes list after save', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1 }),
			})

			await store.save({ name: 'Test' })

			expect(store.refreshList).toHaveBeenCalled()
		})
	})

	describe('deleteOne', () => {
		beforeEach(() => {
			const useStore = createCrudStore('deleteable', {
				endpoint: 'items',
				features: { loading: true },
			})
			store = useStore()
			store.refreshList = jest.fn().mockResolvedValue({ response: {}, data: [] })
		})

		it('throws if item has no id', async () => {
			await expect(store.deleteOne({ name: 'No ID' })).rejects.toThrow('No deleteable to delete')
		})

		it('sends DELETE request for item', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await store.deleteOne({ id: 7 })

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/7'),
				expect.objectContaining({ method: 'DELETE' }),
			)
		})

		it('clears item and refreshes list after delete', async () => {
			store.item = { id: 7, name: 'Doomed' }
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})

			await store.deleteOne({ id: 7 })

			expect(store.item).toBeNull()
			expect(store.refreshList).toHaveBeenCalled()
		})
	})

	describe('_options', () => {
		it('exposes internal config for extend actions', () => {
			const useStore = createCrudStore('opts', {
				endpoint: 'widgets',
				cleanFields: ['id', 'secret'],
			})
			store = useStore()
			expect(store._options.endpoint).toBe('widgets')
			expect(store._options.cleanFields).toEqual(['id', 'secret'])
			expect(store._options.baseApiUrl).toContain('/widgets')
		})

		it('exposes the entity class for plugins', () => {
			const useStore = createCrudStore('with-entity', {
				endpoint: 'items',
				entity: TestEntity,
			})
			store = useStore()
			expect(store._options.entity).toBe(TestEntity)
		})
	})

	describe('plugins', () => {
		const makePlugin = () => ({
			name: 'test',
			state: () => ({ pluginValue: 'hello', counter: 0 }),
			getters: {
				getPluginValue: (state) => state.pluginValue,
				doubledCounter: (state) => state.counter * 2,
			},
			actions: {
				bump() {
					this.counter += 1
				},
				setPluginValue(v) {
					this.pluginValue = v
				},
			},
		})

		it('merges plugin state into the store', () => {
			const useStore = createCrudStore('p-state', {
				endpoint: 'items',
				plugins: [makePlugin()],
			})
			store = useStore()
			expect(store.pluginValue).toBe('hello')
			expect(store.counter).toBe(0)
		})

		it('merges plugin getters', () => {
			const useStore = createCrudStore('p-getters', {
				endpoint: 'items',
				plugins: [makePlugin()],
			})
			store = useStore()
			expect(store.getPluginValue).toBe('hello')
			expect(store.doubledCounter).toBe(0)
			store.bump()
			expect(store.doubledCounter).toBe(2)
		})

		it('merges plugin actions and they can access plugin state via this', () => {
			const useStore = createCrudStore('p-actions', {
				endpoint: 'items',
				plugins: [makePlugin()],
			})
			store = useStore()
			store.bump()
			store.bump()
			expect(store.counter).toBe(2)
			store.setPluginValue('world')
			expect(store.pluginValue).toBe('world')
		})

		it('multiple plugins merge side by side', () => {
			const a = { name: 'a', state: () => ({ a: 1 }), actions: { incA() { this.a += 1 } } }
			const b = { name: 'b', state: () => ({ b: 10 }), actions: { incB() { this.b += 1 } } }
			const useStore = createCrudStore('p-multi', {
				endpoint: 'items',
				plugins: [a, b],
			})
			store = useStore()
			store.incA()
			store.incB()
			expect(store.a).toBe(2)
			expect(store.b).toBe(11)
		})

		it('extend.actions overrides plugin actions with the same name', () => {
			const useStore = createCrudStore('p-override', {
				endpoint: 'items',
				plugins: [makePlugin()],
				extend: {
					actions: {
						bump() {
							this.counter += 10
						},
					},
				},
			})
			store = useStore()
			store.bump()
			expect(store.counter).toBe(10)
		})

		it('plugin setItem override replaces the base setItem', () => {
			const plugin = {
				name: 'wrap',
				state: () => ({ setItemCalls: 0 }),
				actions: {
					setItem(data) {
						this.setItemCalls += 1
						this.item = data ? { ...data, tagged: true } : null
					},
				},
			}
			const useStore = createCrudStore('p-setitem', {
				endpoint: 'items',
				plugins: [plugin],
			})
			store = useStore()
			store.setItem({ id: 1, name: 'x' })
			expect(store.setItemCalls).toBe(1)
			expect(store.item.tagged).toBe(true)
		})
	})

	describe('plugin setup hook', () => {
		it('runs setup(store) once per store instance', () => {
			const setup = jest.fn()
			const useStore = createCrudStore('setup-once', {
				endpoint: 'items',
				plugins: [{ name: 'p', setup }],
			})
			const a = useStore()
			const b = useStore()
			const c = useStore()

			expect(setup).toHaveBeenCalledTimes(1)
			expect(setup).toHaveBeenCalledWith(a)
			expect(a).toBe(b)
			expect(b).toBe(c)
		})

		it('does not call setup when no plugin defines one', () => {
			const useStore = createCrudStore('setup-none', {
				endpoint: 'items',
				plugins: [{ name: 'p', state: () => ({ x: 1 }) }],
			})
			const s = useStore()
			expect(s.x).toBe(1)
		})

		it('runs setup for every plugin that defines one', () => {
			const calls = []
			const pa = { name: 'a', setup: (s) => calls.push(['a', s]) }
			const pb = { name: 'b', setup: (s) => calls.push(['b', s]) }
			const useStore = createCrudStore('setup-many', {
				endpoint: 'items',
				plugins: [pa, pb],
			})
			const s = useStore()
			expect(calls.map((c) => c[0])).toEqual(['a', 'b'])
			expect(calls[0][1]).toBe(s)
			expect(calls[1][1]).toBe(s)
		})

		it('supports multiple $onAction observers watching the same action', () => {
			const aAfter = jest.fn()
			const bAfter = jest.fn()
			const pa = {
				name: 'a',
				setup(s) {
					s.$onAction(({ name, after }) => {
						if (name === 'setItem') after(aAfter)
					})
				},
			}
			const pb = {
				name: 'b',
				setup(s) {
					s.$onAction(({ name, after }) => {
						if (name === 'setItem') after(bAfter)
					})
				},
			}
			const useStore = createCrudStore('setup-onaction', {
				endpoint: 'items',
				plugins: [pa, pb],
			})
			const s = useStore()

			s.setItem({ id: 1 })

			expect(aAfter).toHaveBeenCalledTimes(1)
			expect(bAfter).toHaveBeenCalledTimes(1)
		})

		it('setup-triggered observers do not re-arm when the store is re-used', () => {
			const after = jest.fn()
			const plugin = {
				name: 'p',
				setup(s) {
					s.$onAction(({ name, after: afterCb }) => {
						if (name === 'setItem') afterCb(after)
					})
				},
			}
			const useStore = createCrudStore('setup-rearm', {
				endpoint: 'items',
				plugins: [plugin],
			})
			useStore()
			useStore()
			useStore().setItem({ id: 1 })

			expect(after).toHaveBeenCalledTimes(1)
		})

		it('runs setup again for a fresh store under a new Pinia instance', () => {
			const setup = jest.fn()
			const useStore = createCrudStore('setup-fresh', {
				endpoint: 'items',
				plugins: [{ name: 'p', setup }],
			})
			useStore()
			setActivePinia(createPinia())
			useStore()
			expect(setup).toHaveBeenCalledTimes(2)
		})
	})
})
