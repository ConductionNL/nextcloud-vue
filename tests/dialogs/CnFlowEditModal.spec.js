/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import CnFlowEditModal from '../../src/dialogs/CnFlowEditModal.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u, generateOcsUrl: (u) => u }))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	CnFlowSidebar: true,
	CnFlowDetail: { name: 'CnFlowDetail', props: ['view'], template: '<div data-testid="detail"><slot name="toolbar-start" /></div>' },
}

describe('CnFlowEditModal', () => {
	it('opens on the list view of the one editor', () => {
		const wrapper = mount(CnFlowEditModal, { global: { stubs } })

		expect(wrapper.findComponent({ name: 'CnFlowDetail' }).props('view')).toBe('list')
	})

	it('still offers the canvas', async () => {
		const wrapper = mount(CnFlowEditModal, { global: { stubs } })

		await wrapper.find('[data-testid="flow-view-canvas"]').trigger('click')

		expect(wrapper.findComponent({ name: 'CnFlowDetail' }).props('view')).toBe('canvas')
	})

	it('can open on the canvas', () => {
		const wrapper = mount(CnFlowEditModal, { props: { view: 'canvas' }, global: { stubs } })

		expect(wrapper.findComponent({ name: 'CnFlowDetail' }).props('view')).toBe('canvas')
	})
})
