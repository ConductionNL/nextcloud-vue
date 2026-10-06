/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockStore = {
	registerObjectType: jest.fn(),
	fetchCollectionForOptions: jest.fn(() => Promise.resolve([])),
	fetchObject: jest.fn(() => Promise.resolve(null)),
	saveObject: jest.fn((slug, payload) => Promise.resolve({ id: 'new-1', name: payload.name, '@self': { id: 'new-1' } })),
	collections: {},
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

import CnResourceSelect from '../../src/components/CnResourceSelect/CnResourceSelect.vue'

describe('CnResourceSelect', () => {
	const mount = (props = {}) => shallowMount(CnResourceSelect, {
		propsData: { register: 'pipelinq', schema: 'client', ...props },
	})

	beforeEach(() => {
		mockStore.registerObjectType.mockClear()
		mockStore.fetchCollectionForOptions.mockClear()
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
		mockStore.fetchCollectionForOptions.mockResolvedValueOnce([{ id: 'c1', name: 'Acme' }])
		const w = mount({ minChars: 2 })
		await w.vm.onSearch('Acme')
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('pipelinq-client', 'client', 'pipelinq')
		expect(mockStore.fetchCollectionForOptions).toHaveBeenCalled()
		expect(w.vm.options).toEqual([{ value: 'c1', label: 'Acme' }])
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

	it('scopes the search with filters, dropping empty entries', async () => {
		const w = mount({ minChars: 2, filters: { client: 'c-9', queue: null } })
		await w.vm.onSearch('Acme')
		expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledWith('pipelinq-client', {
			client: 'c-9',
			_search: 'Acme',
			_limit: 20,
		})
	})

	it('does not preload by default', () => {
		mount()
		expect(mockStore.fetchCollectionForOptions).not.toHaveBeenCalled()
	})

	it('preloads a first page on mount when asked', async () => {
		mockStore.fetchCollectionForOptions.mockResolvedValueOnce([{ id: 'c1', name: 'Acme' }])
		const w = mount({ preload: true })
		await flushPromises()
		expect(mockStore.fetchCollectionForOptions).toHaveBeenCalledWith('pipelinq-client', { _limit: 20 })
		expect(w.vm.options).toEqual([{ value: 'c1', label: 'Acme' }])
	})

	it('clears a now-out-of-scope selection when filters change', async () => {
		const w = mount({ modelValue: 'ct-1', filters: { client: 'c-1' } })
		w.setData({ localSelected: { value: 'ct-1', label: 'Jane' } })
		await w.vm.$nextTick()
		w.setProps({ filters: { client: 'c-2' } })
		await w.vm.$nextTick()
		expect(w.emitted()['update:modelValue'].pop()).toEqual([''])
		expect(w.vm.localSelected).toBeNull()
		expect(w.vm.options).toEqual([])
	})

	it('does not re-fire on a filters object with unchanged values', async () => {
		const w = mount({ modelValue: 'ct-1', filters: { client: 'c-1' } })
		await w.vm.$nextTick()
		w.setProps({ filters: { client: 'c-1' } })
		await w.vm.$nextTick()
		expect(w.emitted()['update:modelValue']).toBeUndefined()
	})

	it('uses createHandler instead of saveObject when given', async () => {
		const createHandler = jest.fn(() => Promise.resolve({ id: 'made-1', name: 'Delta' }))
		const w = mount({ minChars: 2, createHandler })
		await w.vm.createFromTerm('Delta')
		expect(mockStore.saveObject).not.toHaveBeenCalled()
		expect(createHandler).toHaveBeenCalledWith('Delta', { name: 'Delta' })
		expect(w.emitted()['update:modelValue'][0]).toEqual(['made-1'])
	})

	it('leaves the selection untouched when createHandler aborts', async () => {
		const createHandler = jest.fn(() => Promise.resolve(null))
		const w = mount({ minChars: 2, createHandler })
		await w.vm.createFromTerm('Cancelled')
		expect(w.emitted()['update:modelValue']).toBeUndefined()
		expect(w.vm.localSelected).toBeNull()
	})

	it('carries the active scope into the create payload', async () => {
		const w = mount({ minChars: 2, filters: { client: 'c-7' } })
		await w.vm.createFromTerm('Jane')
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-client', { client: 'c-7', name: 'Jane' })
	})

	it('routes a __create option through createFromTerm', async () => {
		const w = mount({ minChars: 2 })
		const spy = jest.spyOn(w.vm, 'createFromTerm').mockResolvedValue()
		await w.vm.onInput({ value: '__create__', label: 'Gamma', __create: true })
		expect(spy).toHaveBeenCalledWith('Gamma')
	})
})

describe('CnResourceSelect: multiple', () => {
	const mount = (props = {}) => shallowMount(CnResourceSelect, {
		propsData: { register: 'pipelinq', schema: 'product', multiple: true, modelValue: [], ...props },
	})

	beforeEach(() => {
		mockStore.saveObject.mockClear()
		mockStore.fetchObject.mockClear()
	})

	it('emits the array of chosen ids', async () => {
		const w = mount()
		await w.vm.onInput([{ value: 'p-1', label: 'Hosting' }, { value: 'p-2', label: 'SLA' }])
		expect(w.emitted('update:modelValue').pop()).toEqual([['p-1', 'p-2']])
	})

	it('adds a created object to the selection', async () => {
		const w = mount({ modelValue: ['p-1'] })
		await w.vm.onInput([{ value: 'p-1', label: 'Hosting' }, { value: '__create__', label: 'Support', __create: true }])
		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-product', { name: 'Support' })
		expect(w.emitted('update:modelValue').pop()).toEqual([['p-1', 'new-1']])
		expect(w.emitted('create')).toHaveLength(1)
	})

	it('keeps the labels of chosen options after the search moves on', async () => {
		const w = mount({ modelValue: ['p-1'] })
		await w.vm.onInput([{ value: 'p-1', label: 'Hosting' }])
		await w.setProps({ modelValue: ['p-1'] })
		w.setData({ options: [] })
		expect(w.vm.selectedOption).toEqual([{ value: 'p-1', label: 'Hosting' }])
	})

	it('loads labels for preselected ids', async () => {
		mockStore.fetchObject.mockResolvedValueOnce({ id: 'p-7', name: 'Implementation' })
		const w = mount({ modelValue: ['p-7'] })
		await flushPromises()
		expect(mockStore.fetchObject).toHaveBeenCalledWith('pipelinq-product', 'p-7')
		expect(w.vm.selectedOption).toEqual([{ value: 'p-7', label: 'Implementation' }])
	})

	it('hands the term to a createHandler and selects what it returns', async () => {
		const createHandler = jest.fn().mockResolvedValue({ id: 'p-9', name: 'Training' })
		const w = mount({ createHandler })
		await w.vm.onInput([{ value: '__create__', label: 'Training', __create: true }])
		expect(createHandler).toHaveBeenCalledWith('Training', { name: 'Training' })
		expect(mockStore.saveObject).not.toHaveBeenCalled()
		expect(w.emitted('update:modelValue').pop()).toEqual([['p-9']])
	})
})
