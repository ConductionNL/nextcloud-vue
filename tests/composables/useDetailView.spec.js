/**
 * Tests for `useDetailView` — both the new objectStore-backed API and the
 * legacy options-object API.
 *
 * Covers:
 * - `useDetailView(objectType, id, options)`: fetch on mount, refetch on id
 *   change, save (create vs update branches with router navigation), delete
 *   (with router list-route navigation), and 422 validation-error capture.
 * - Legacy `useDetailView(options)`: fetchFn / saveFn / deleteFn + onSaved /
 *   onDeleted callback fan-out + error propagation.
 */

jest.mock('../../src/store/index.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../src/store/index.js')
const { useDetailView } = require('../../src/composables/useDetailView.js')

const { defineComponent, h, ref } = require('vue')
const { mount } = require('@vue/test-utils')

/**
 * Flush microtasks + onMounted.
 *
 * @param {number} [ms] Timer delay
 * @return {Promise<void>} Settles after the delay
 */
function flush(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Build a fake objectStore exposing the surface the composable touches.
 *
 * @param {object} [over] Per-test overrides
 * @return {object} Fake store
 */
function makeStore(over = {}) {
	return {
		objects: { client: { 'id-1': { id: 'id-1', name: 'Acme' } } },
		loading: {},
		errors: {},
		getObject: jest.fn((type, id) => ({ client: { 'id-1': { id: 'id-1', name: 'Acme' } } })[type]?.[id] || null),
		fetchObject: jest.fn().mockResolvedValue({ id: 'id-1', name: 'Acme' }),
		saveObject: jest.fn().mockImplementation(async (type, data) => ({ ...data, id: data.id || 'id-new' })),
		deleteObject: jest.fn().mockResolvedValue(true),
		...over,
	}
}

/**
 * Mount a host that calls `useDetailView(...)` with the given args and exposes
 * the returned API as `vm.detail`.
 *
 * @param {Array} args Positional args forwarded to `useDetailView`
 * @return {object} Vue Test Utils wrapper
 */
function mountDetail(args) {
	const Comp = defineComponent({
		setup() {
			const detail = useDetailView(...args)
			return { detail }
		},
		render() { return h('div') },
	})
	return mount(Comp)
}

beforeEach(() => {
	jest.clearAllMocks()
})

describe('useDetailView — new API (objectStore-backed)', () => {
	it('fetches the object on mount when id is set', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		mountDetail(['client', 'id-1', {}])
		await flush()
		expect(store.fetchObject).toHaveBeenCalledWith('client', 'id-1')
	})

	it('does NOT fetch on mount when id is "new"', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const w = mountDetail(['client', 'new', {}])
		await flush()
		expect(store.fetchObject).not.toHaveBeenCalled()
		expect(w.vm.detail.isNew.value).toBe(true)
	})

	it('re-fetches when a ref id changes', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const idRef = ref('id-1')
		mountDetail(['client', idRef, {}])
		await flush()
		expect(store.fetchObject).toHaveBeenCalledWith('client', 'id-1')

		idRef.value = 'id-2'
		await flush()
		expect(store.fetchObject).toHaveBeenCalledWith('client', 'id-2')
	})

	it('onSave update branch: keeps id, clears editing, refetches', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const w = mountDetail(['client', 'id-1', {}])
		await flush()
		store.fetchObject.mockClear()

		const result = await w.vm.detail.onSave({ name: 'Acme 2' })
		expect(store.saveObject).toHaveBeenCalledWith('client', { name: 'Acme 2', id: 'id-1' })
		expect(result).toMatchObject({ id: 'id-1', name: 'Acme 2' })
		expect(w.vm.detail.editing.value).toBe(false)
		expect(store.fetchObject).toHaveBeenCalledWith('client', 'id-1')
	})

	it('onSave create branch: routes to detailRouteName when set', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		store.saveObject.mockResolvedValue({ id: 'id-99', name: 'Brand new' })
		const push = jest.fn()
		const w = mountDetail(['client', 'new', { router: { push }, detailRouteName: 'ClientDetail' }])
		await flush()

		await w.vm.detail.onSave({ name: 'Brand new' })
		expect(store.saveObject).toHaveBeenCalledWith('client', { name: 'Brand new' })
		expect(push).toHaveBeenCalledWith({ name: 'ClientDetail', params: { id: 'id-99' } })
	})

	it('onSave 422 captures validation errors into validationErrors', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		store.saveObject.mockRejectedValue({
			response: { status: 422, data: { errors: { name: 'is required' } } },
		})
		const w = mountDetail(['client', 'id-1', {}])
		await flush()
		const result = await w.vm.detail.onSave({ name: '' })
		expect(result).toBeNull()
		expect(w.vm.detail.validationErrors.value).toEqual({ name: 'is required' })
		expect(w.vm.detail.error.value).toBeNull()
	})

	it('onSave generic error populates error.value and clears saving', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		store.saveObject.mockRejectedValue(new Error('boom'))
		const w = mountDetail(['client', 'id-1', {}])
		await flush()
		const result = await w.vm.detail.onSave({})
		expect(result).toBeNull()
		expect(w.vm.detail.error.value).toBe('boom')
		expect(w.vm.detail.saving.value).toBe(false)
	})

	it('confirmDelete navigates to listRouteName on success', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const push = jest.fn()
		const w = mountDetail(['client', 'id-1', { router: { push }, listRouteName: 'ClientList' }])
		await flush()
		const ok = await w.vm.detail.confirmDelete()
		expect(ok).toBe(true)
		expect(store.deleteObject).toHaveBeenCalledWith('client', 'id-1')
		expect(push).toHaveBeenCalledWith({ name: 'ClientList' })
		expect(w.vm.detail.showDeleteDialog.value).toBe(false)
	})

	it('confirmDelete failure surfaces the store error', async () => {
		const store = makeStore({ errors: { client: { message: 'cannot delete' } } })
		store.deleteObject = jest.fn().mockResolvedValue(false)
		useObjectStore.mockReturnValue(store)
		const w = mountDetail(['client', 'id-1', {}])
		await flush()
		const ok = await w.vm.detail.confirmDelete()
		expect(ok).toBe(false)
		expect(w.vm.detail.error.value).toBe('cannot delete')
	})
})

describe('useDetailView — legacy API (options object)', () => {
	it('load() populates objectData and clears loading', async () => {
		const fetchFn = jest.fn().mockResolvedValue({ id: 'x', name: 'Y' })
		const w = mountDetail([{ objectType: 'client', fetchFn }])
		const result = await w.vm.detail.load('x')
		expect(result).toEqual({ id: 'x', name: 'Y' })
		expect(w.vm.detail.objectData.value).toEqual({ id: 'x', name: 'Y' })
		expect(w.vm.detail.loading.value).toBe(false)
	})

	it('save() fires onSaved and exits edit mode on success', async () => {
		const onSaved = jest.fn()
		const saveFn = jest.fn().mockResolvedValue({ id: 'x', name: 'updated' })
		const w = mountDetail([{ objectType: 'client', saveFn, onSaved }])
		w.vm.detail.editing.value = true
		const result = await w.vm.detail.save({ id: 'x', name: 'updated' })
		expect(saveFn).toHaveBeenCalledWith('client', { id: 'x', name: 'updated' })
		expect(result).toEqual({ id: 'x', name: 'updated' })
		expect(w.vm.detail.editing.value).toBe(false)
		expect(onSaved).toHaveBeenCalledWith({ id: 'x', name: 'updated' })
	})

	it('save() propagates the error message into error.value', async () => {
		const saveFn = jest.fn().mockRejectedValue(new Error('nope'))
		const w = mountDetail([{ objectType: 'client', saveFn }])
		const result = await w.vm.detail.save({ name: 'x' })
		expect(result).toBeNull()
		expect(w.vm.detail.error.value).toBe('nope')
		expect(w.vm.detail.saving.value).toBe(false)
	})

	it('confirmDelete() opens the delete dialog without firing deleteFn', async () => {
		const deleteFn = jest.fn()
		const w = mountDetail([{ objectType: 'client', deleteFn }])
		w.vm.detail.confirmDelete()
		expect(w.vm.detail.showDeleteDialog.value).toBe(true)
		expect(deleteFn).not.toHaveBeenCalled()
	})

	it('executeDelete() calls deleteFn and onDeleted on success', async () => {
		const onDeleted = jest.fn()
		const deleteFn = jest.fn().mockResolvedValue(true)
		const w = mountDetail([{ objectType: 'client', deleteFn, onDeleted }])
		w.vm.detail.objectData.value = { id: 'x' }
		const ok = await w.vm.detail.executeDelete()
		expect(ok).toBe(true)
		expect(deleteFn).toHaveBeenCalledWith('client', 'x')
		expect(onDeleted).toHaveBeenCalled()
		expect(w.vm.detail.showDeleteDialog.value).toBe(false)
	})
})
