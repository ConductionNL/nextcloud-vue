/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnRelationLinkModal — picks an existing object from a target schema
 * and PATCHes a foreign-key field on the current object with its id.
 */

const mockStore = {
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn(() => Promise.resolve([])),
	fetchObject: jest.fn(() => Promise.resolve(null)),
	saveObject: jest.fn((slug, payload) => Promise.resolve({ ...payload, id: 'obj-1' })),
	errors: {},
	collections: {},
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

// eslint-disable-next-line import/first
import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first
import CnRelationLinkModal from '../../src/modals/CnRelationLinkModal.vue'

describe('CnRelationLinkModal', () => {
	beforeEach(() => {
		mockStore.saveObject.mockClear()
		mockStore.errors = {}
	})

	const mountModal = (props = {}) => shallowMount(CnRelationLinkModal, {
		propsData: {
			register: 'pipelinq',
			schema: 'client',
			currentType: 'pipelinq-contact',
			currentObject: { id: 'obj-1', name: 'Jane' },
			fkField: 'client',
			...props,
		},
		stubs: { NcModal: { template: '<div><slot /></div>' } },
	})

	it('patches the FK field on the current object and saves on confirm', async () => {
		const wrapper = mountModal()
		wrapper.setData({ selectedId: 'client-99' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.onConfirm()

		expect(mockStore.saveObject).toHaveBeenCalledWith('pipelinq-contact', {
			id: 'obj-1',
			name: 'Jane',
			client: 'client-99',
		})
		expect(wrapper.emitted('linked')[0][0]).toMatchObject({ id: 'obj-1', client: 'client-99' })
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('does nothing when no object is selected', async () => {
		const wrapper = mountModal()
		await wrapper.vm.onConfirm()
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('surfaces the store error and does not emit linked when save fails', async () => {
		mockStore.saveObject.mockResolvedValueOnce(null)
		mockStore.errors = { 'pipelinq-contact': { toString() { return 'Save rejected.' } } }
		const wrapper = mountModal()
		wrapper.setData({ selectedId: 'client-99' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.onConfirm()

		expect(wrapper.vm.error).toBe('Save rejected.')
		expect(wrapper.emitted('linked')).toBeFalsy()
	})
})
