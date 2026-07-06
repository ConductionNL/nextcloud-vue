/**
 * Tests for CnFkResolveCell — the built-in `fkResolve` cell widget
 * (uuid → related object label via the shared object store).
 *
 * - store cache hit renders synchronously (no fetch)
 * - cache miss fetches via store.fetchObject (per-schema type slug)
 * - label precedence: labelField → title → @self.name → raw id
 * - array values resolve item-by-item and render comma-joined
 * - store failure / missing Pinia degrades to the raw id (never throws)
 */

import { mount } from '@vue/test-utils'

jest.mock('../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../src/store/useObjectStore.js')
const CnFkResolveCell = require('../../src/components/CnFkResolveCell/CnFkResolveCell.vue').default

/**
 * Fake useObjectStore-shaped store with a seeded object cache.
 *
 * @param {object} [objects] Pre-seeded `objects[type][id]` cache.
 * @param {object} [overrides] Method overrides.
 * @return {object} The fake store.
 */
function makeStore(objects = {}, overrides = {}) {
	return {
		objects,
		objectTypeRegistry: {},
		registerObjectType: jest.fn(function(slug, schemaId, registerId) {
			this.objectTypeRegistry[slug] = { schema: schemaId, register: registerId }
		}),
		fetchObject: jest.fn().mockResolvedValue(null),
		...overrides,
	}
}

const baseProps = { register: 'crm', schema: 'client', labelField: 'name' }

beforeEach(() => {
	useObjectStore.mockReset()
})

describe('CnFkResolveCell', () => {
	it('renders the cached label synchronously without fetching', async () => {
		const store = makeStore({ 'crm/client': { 'uuid-1': { name: 'Acme BV' } } })
		useObjectStore.mockReturnValue(store)
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: 'uuid-1' } })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toBe('Acme BV')
		expect(store.fetchObject).not.toHaveBeenCalled()
	})

	it('fetches a cache miss through the per-schema type slug', async () => {
		const store = makeStore({}, {
			fetchObject: jest.fn().mockResolvedValue({ name: 'Fetched BV' }),
		})
		useObjectStore.mockReturnValue(store)
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: 'uuid-2' } })
		await new Promise((resolve) => setTimeout(resolve))
		expect(store.fetchObject).toHaveBeenCalledWith('crm/client', 'uuid-2')
		expect(wrapper.text()).toBe('Fetched BV')
	})

	it('falls back labelField → title → @self.name → raw id', async () => {
		const store = makeStore({
			'crm/client': {
				't-1': { title: 'Titled' },
				't-2': { '@self': { name: 'Self name' } },
				't-3': { irrelevant: true },
			},
		})
		useObjectStore.mockReturnValue(store)
		const mountFor = (value) => mount(CnFkResolveCell, { propsData: { ...baseProps, value } })
		expect(mountFor('t-1').text()).toBe('Titled')
		expect(mountFor('t-2').text()).toBe('Self name')
		// No usable label anywhere → raw id stays.
		const w3 = mountFor('t-3')
		await new Promise((resolve) => setTimeout(resolve))
		expect(w3.text()).toBe('t-3')
	})

	it('resolves an array of uuids comma-joined', async () => {
		const store = makeStore({
			'crm/client': { a: { name: 'Alpha' }, b: { name: 'Beta' } },
		})
		useObjectStore.mockReturnValue(store)
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: ['a', 'b'] } })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toBe('Alpha, Beta')
	})

	it('collapses a translatable per-language label map to its first value', async () => {
		const store = makeStore({ 'crm/client': { 'uuid-9': { name: { nl: 'Klant', en: 'Client' } } } })
		useObjectStore.mockReturnValue(store)
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: 'uuid-9' } })
		await wrapper.vm.$nextTick()
		expect(['Klant', 'Client']).toContain(wrapper.text())
	})

	it('degrades to the raw id when the fetch fails', async () => {
		const store = makeStore({}, { fetchObject: jest.fn().mockRejectedValue(new Error('403')) })
		useObjectStore.mockReturnValue(store)
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: 'uuid-x' } })
		await new Promise((resolve) => setTimeout(resolve))
		expect(wrapper.text()).toBe('uuid-x')
	})

	it('degrades to the raw id when no Pinia store is active', () => {
		useObjectStore.mockImplementation(() => { throw new Error('no pinia') })
		const wrapper = mount(CnFkResolveCell, { propsData: { ...baseProps, value: 'uuid-x' } })
		expect(wrapper.text()).toBe('uuid-x')
	})

	it('renders nothing (empty) for a null / empty value', () => {
		useObjectStore.mockReturnValue(makeStore())
		expect(mount(CnFkResolveCell, { propsData: { ...baseProps, value: null } }).text()).toBe('')
		expect(mount(CnFkResolveCell, { propsData: { ...baseProps, value: [] } }).text()).toBe('')
	})
})
