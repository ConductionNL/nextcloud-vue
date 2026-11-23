/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow board header as DqFlow draws it: the Active switch at the board's
 * size with its label beside it, a check on Save and the test button's icon.
 *
 * @spec openspec/changes/flow-board-header-board-look/specs/flow-board/spec.md#requirement-the-flow-board-header-draws-the-boards-switch-and-icons
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }

/**
 * @param {object} flow Flow fields.
 * @return {Promise<object>} The board.
 */
async function mountBoard(flow = {}) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', testSubject: { register: 'dossiq', schema: 'case', label: 'Testen met een zaak' } }, global: { stubs } })
	Object.assign(w.vm.store, { flow: { ...w.vm.store.flow, id: 'f1', name: 'Flow', enabled: true, ...flow } })
	await w.vm.$nextTick()
	return w
}

describe('the flow board header', () => {
	it('draws Active as a switch with its label, and flips it', async () => {
		const w = await mountBoard()
		const toggle = w.find('[data-testid="flow-board-enabled-switch"]')
		expect(toggle.attributes('role')).toBe('switch')
		expect(toggle.attributes('aria-checked')).toBe('true')
		expect(w.find('.cn-flow-board__toggle-label').text()).toBe('Active')
		await toggle.trigger('click')
		expect(w.vm.store.flow.enabled).toBe(false)
		expect(w.vm.store.dirty).toBe(true)
		expect(toggle.attributes('aria-checked')).toBe('false')
		expect(w.find('.cn-flow-board__toggle-label').text()).toBe('Paused')
	})

	it('puts a check on Save and the board icon on the test button', async () => {
		const w = await mountBoard()
		expect(w.findComponent({ name: 'CheckIcon' }).exists()).toBe(true)
		expect(w.findComponent({ name: 'AutorenewIcon' }).exists()).toBe(true)
	})
})
