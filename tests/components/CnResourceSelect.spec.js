/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'

const mockStore = {
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn(() => Promise.resolve([])),
	fetchObject: jest.fn(() => Promise.resolve(null)),
	saveObject: jest.fn((slug, payload) => Promise.resolve({ id: 'new-1', name: payload.name, '@self': { id: 'new-1' } })),
	collections: {},
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// eslint-disable-next-line import/first
import CnResourceSelect from '../../src/components/CnResourceSelect/CnResourceSelect.vue'

describe('CnResourceSelect', () => {
	const mount = (props = {}) => shallowMount(CnResourceSelect, {
		propsData: { register: 'pipelinq', schema: 'client', ...props },
	})

	beforeEach(() => {
		mockStore.registerObjectType.mockClear()
		mockStore.fetchCollection.mockClear()
		mockStore.saveObject.mockClear()
		mockStore.fetchObject.mockClear()
		mockStore.collections = {}
	})

	it('builds the type slug from register + schema', () => {
		const w = mount()
		expect(w.vm.typeSlug).toBe('pipelinq-client')
	})

	it('offers a "Create" synthetic option when no exact match and term long enough', async () => {
		const w = mount({ minChars: 2 })
		w.setData({ search: 'Acme', options: [{ value: '1', label: 'Other' }] })
		await w.vm.$nextTick()
		const create = w.vm.displayOptions.find((o) => o.__create)
		expect(create).toBeTruthy()
		expect(create.label).toBe('Acme')
	})

	it('suppresses the Create option on an exact (case-insensitive) match', async () => {
		const w = mount({ minChars: 2 })
		w.setData({ search: 'acme', options: [{ value: '1', label: 'Acme' }] })
		await w.vm.$nextTick()
		expect(w.vm.displayOptions.some((o) => o.__create)).toBe(false)
	})

	it('suppresses Create when allowCreate is false', async () => {
		const w = mount({ allowCreate: false, minChars: 2 })
		w.setData({ search: 'Acme', options: [] })
		await w.vm.$nextTick()
		expect(w.vm.displayOptions.some((o) => o.__create)).toBe(false)
	})

	it('searches the object store on input', async () => {
		const w = mount({ minChars: 2 })
		mockStore.fetchCollection.mockResolvedValueOnce([{ id: 'c1', name: 'Acme' }])
		await w.vm.onSearch('Acme')
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('pipelinq-client', 'client', 'pipelinq')
		expect(mockStore.fetchCollection).toHaveBeenCalledWith('pipelinq-client', { _search: 'Acme', _limit: 20 })
		expect(w.vm.options).toEqual([{ value: 'c1', label: 'Acme' }])
	})

	it('preloads the first page on mount so an untyped open has options', async () => {
		mockStore.fetchCollection.mockResolvedValueOnce([{ id: 'p1', name: 'CRM Basis Licentie' }])
		const w = mount({ minChars: 2 })
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		expect(mockStore.fetchCollection).toHaveBeenCalledWith('pipelinq-client', { _limit: 20 })
		expect(w.vm.options).toEqual([{ value: 'p1', label: 'CRM Basis Licentie' }])
	})

	it('restores the preloaded options when the search is cleared', async () => {
		mockStore.fetchCollection.mockResolvedValueOnce([{ id: 'p1', name: 'CRM Basis Licentie' }])
		const w = mount({ minChars: 2 })
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		mockStore.fetchCollection.mockResolvedValueOnce([{ id: 'p2', name: 'CRM Pro Licentie' }])
		await w.vm.onSearch('Pro')
		expect(w.vm.options).toEqual([{ value: 'p2', label: 'CRM Pro Licentie' }])
		await w.vm.onSearch('')
		expect(w.vm.options).toEqual([{ value: 'p1', label: 'CRM Basis Licentie' }])
	})

	it('creates an object from the term and selects + emits it', async () => {
		const w = mount({ minChars: 2 })
		await w.vm.createFromTerm('New Co')
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-client', { name: 'New Co' })
		expect(w.emitted()['update:modelValue'][0]).toEqual(['new-1'])
		expect(w.emitted().create[0][0].id).toBe('new-1')
		expect(w.vm.localSelected).toEqual({ value: 'new-1', label: 'New Co' })
	})

	it('merges createDefaults into the create payload', async () => {
		const w = mount({ minChars: 2, createDefaults: { type: 'organisation' } })
		await w.vm.createFromTerm('Beta')
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-client', { type: 'organisation', name: 'Beta' })
	})

	it('clears selection on a null input', async () => {
		const w = mount()
		await w.vm.onInput(null)
		expect(w.emitted()['update:modelValue'][0]).toEqual([''])
	})

	it('routes a __create option through createFromTerm', async () => {
		const w = mount({ minChars: 2 })
		const spy = jest.spyOn(w.vm, 'createFromTerm').mockResolvedValue()
		await w.vm.onInput({ value: '__create__', label: 'Gamma', __create: true })
		expect(spy).toHaveBeenCalledWith('Gamma')
	})
})
