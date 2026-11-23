/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowEdgeEditModal from '../../src/dialogs/CnFlowEdgeEditModal.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const flow = {
	nodes: [
		{ id: 'check', exits: [{ id: 'large', condition: { '>': [{ var: 'json.amount' }, 1000] } }, { id: 'small' }] },
		{ id: 'tell' },
		{ id: 'mark' },
		{ id: 'next' },
	],
	edges: [
		{ from: 'check', fromExit: 'large', to: 'tell' },
		{ from: 'check', fromExit: 'small', to: 'mark' },
		{ from: 'tell', to: 'next' },
	],
}

/**
 * @param {object} line The edited line.
 * @return {Promise<object>} The mounted dialog, its slots rendered.
 */
async function dialogOn(line) {
	const wrapper = mount(CnFlowEdgeEditModal, {
		global: { stubs: { NcDialog: { template: '<div><slot /></div>' }, NcTextField: true, NcSelect: true, NcButton: true } },
	})
	wrapper.vm.store.flow = flow
	wrapper.vm.store.editingEdge = line
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('CnFlowEdgeEditModal condition line', () => {
	beforeEach(() => setActivePinia(createPinia()))

	it('says when a conditioned line is taken', async () => {
		const dialog = await dialogOn({ source: 'check', target: 'tell' })

		expect(dialog.find('[data-testid="flow-edge-condition"]').text()).toBe('Only if amount is more than 1000')
	})

	it('names the else', async () => {
		const dialog = await dialogOn({ source: 'check', target: 'mark' })

		expect(dialog.find('[data-testid="flow-edge-condition"]').text()).toBe('Otherwise')
	})

	it('says nothing on a plain line', async () => {
		const dialog = await dialogOn({ source: 'tell', target: 'next' })

		expect(dialog.find('[data-testid="flow-edge-condition"]').exists()).toBe(false)
	})
})
