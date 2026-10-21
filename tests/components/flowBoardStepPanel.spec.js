/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board flow editor's right panel (DqFlow): the selected step's settings,
 * labelled as the step's owner declares them; with nothing selected an empty
 * state, not the run history. The runs stay one click away.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: { name: 'CnFlowSidebar', template: '<div class="runs" />' }, CnBuildiqEditButton: true, NcNoteCard: { template: '<div class="note"><slot /></div>' } }

const CATALOG = [{
	id: 'openregister.decision-table',
	app: 'openregister',
	displayName: 'Decision table',
	configForm: [
		{ key: 'table', label: 'Decision table', type: 'select', options: [{ value: 'welstand', label: 'Welstand areas' }] },
		{ key: 'input', label: 'Input' },
		{ key: 'strict', label: 'Stop on no match', type: 'boolean' },
	],
}]
const FLOW = { id: 'f1', name: 'Permit', nodes: [{ id: 'n1', type: 'openregister.decision-table', name: 'Welstand needed?', config: { table: 'welstand', input: 'Case location', strict: true } }], edges: [] }

/**
 * @param {object} state Store fields to set.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(state = {}) {
	const w = mount(CnFlowBoard, { props: { id: 'f1' }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG, flow: FLOW, ...state })
	await w.vm.$nextTick()
	return w
}

describe('CnFlowBoard right panel', () => {
	it('shows an empty state, not the runs, when no step is selected', async () => {
		const w = await mountBoard()
		expect(w.find('[data-testid="flow-board-inspector-empty"]').exists()).toBe(true)
		expect(w.find('.runs').exists()).toBe(false)
	})

	it('keeps the runs one click away', async () => {
		const w = await mountBoard()
		await w.find('[data-testid="flow-board-show-runs"]').trigger('click')
		expect(w.find('.runs').exists()).toBe(true)
		await w.find('[data-testid="flow-board-hide-runs"]').trigger('click')
		expect(w.find('.runs').exists()).toBe(false)
	})

	it('shows the runs after Run', async () => {
		const w = await mountBoard()
		w.vm.onRun()
		await w.vm.$nextTick()
		expect(w.find('.runs').exists()).toBe(true)
	})

	it('lists the settings of the selected step with their labels', async () => {
		const w = await mountBoard({ selectedNodeId: 'n1' })
		const rows = w.findAll('[data-testid="flow-board-step-setting"]').map((row) => [row.find('dt').text(), row.find('dd').text()])
		expect(rows).toEqual([['Decision table', 'Welstand areas'], ['Input', 'Case location'], ['Stop on no match', 'Yes']])
	})

	it('names the step, then its type as a purple pill under the name (DqFlow)', async () => {
		const w = await mountBoard({ selectedNodeId: 'n1' })
		const name = w.find('[data-testid="flow-board-step-name"]')
		const pill = w.find('[data-testid="flow-board-step-type"]')
		expect(name.text()).toBe('Welstand needed?')
		expect(pill.text()).toBe(w.vm.stepTypeLabel)
		expect(pill.classes().join(' ')).toContain('purple')
		expect(name.element.compareDocumentPosition(pill.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		expect(w.find('.cn-flow-board__eyebrow').exists()).toBe(false)
	})
})
