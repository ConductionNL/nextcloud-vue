/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqFlowRun: the run card over the canvas carries a status stripe, the
 * status pill with its icon (14/700, 25px), the title 15/700 and the facts in
 * one row, label over value; the pressed side panel toggle is tonal.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnFlowRunSummary = require('../../src/components/CnFlowDetail/CnFlowRunSummary.vue').default
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'src', f), 'utf8')
const RUN = { uuid: 'r1', status: 'completed', created: '2026-10-07T08:41:00Z', log: [{ transition: 'n1', status: 'completed' }] }

describe('CnFlowRunSummary statusIcon', () => {
	it('🔴 draws the status pill with an icon when asked', () => {
		const w = mount(CnFlowRunSummary, { props: { run: RUN, statusIcon: true } })
		expect(w.find('.cn-flow-run-summary__head .cn-status-badge .material-design-icon').exists()).toBe(true)
	})

	it('draws the pill as text only by default', () => {
		const w = mount(CnFlowRunSummary, { props: { run: RUN } })
		expect(w.find('.cn-flow-run-summary__head .cn-status-badge .material-design-icon').exists()).toBe(false)
	})
})

describe('CnFlowBoard run card', () => {
	const DetailStub = { name: 'CnFlowDetail', props: { fitInset: [Object, Function], layoutDirection: String, fitMaxZoom: Number, id: String, app: String, run: String, nodeBadge: Function, toolbarActions: Boolean, addStep: Boolean, quietRun: Boolean }, template: '<div class="detail"><slot name="toolbar-end" /></div>' }
	const RunCardStub = { name: 'CnFlowRunSummary', props: { run: Object, statusIcon: Boolean }, template: '<div class="run-card" />' }
	const stubs = { CnFlowDetail: DetailStub, CnFlowSidebar: true, CnBuildiqEditButton: true, CnFlowRunSummary: RunCardStub, NcNoteCard: true }
	const FLOW = { id: 'f1', name: 'Confirm receipt', nodes: [{ id: 'n1', type: 'openregister.send-email', name: 'Mail', config: {} }], edges: [] }

	it('🔴 marks the card with the run\'s tone and asks for the pill icon', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', layout: 'canvas', run: 'r1' }, global: { stubs } })
		Object.assign(w.vm.store, { nodeCatalog: [], flow: FLOW, nodes: FLOW.nodes, inspectedRunUuid: 'r1', runDetail: RUN })
		await w.vm.$nextTick()
		const card = w.findComponent({ name: 'CnFlowRunSummary' })
		expect(card.classes()).toContain('cn-flow-board__run-card--success')
		expect(card.props('statusIcon')).toBe(true)
	})

	it('🔴 the toggle carries a class for its pressed look', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', layout: 'canvas' }, global: { stubs } })
		Object.assign(w.vm.store, { nodeCatalog: [], flow: FLOW, nodes: FLOW.nodes })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="flow-board-panel-toggle"]').classes()).toContain('cn-flow-board__panel-toggle')
	})

	describe('stylesheet', () => {
		const css = read('components/CnFlowsPage/CnFlowBoard.vue')

		it('🔴 draws the status stripe and the board padding', () => {
			expect(css).toMatch(/\.cn-flow-board__run-card--success \{[^}]*--cn-flow-run-tone: var\(--color-success/)
			expect(css).toMatch(/\.cn-flow-board--canvas \.cn-flow-board__run-card \{[^}]*padding: 12px 18px 12px 22px;[^}]*box-shadow: inset 4px 0 0 var\(--cn-flow-run-tone/)
		})

		it('🔴 sets the pill, title and facts as the board', () => {
			expect(css).toMatch(/\.cn-flow-board__run-card :deep\(\.cn-flow-run-summary__head \.cn-status-badge\) \{[^}]*min-height: 25px;[^}]*font-size: 14px;[^}]*font-weight: 700;/)
			expect(css).toMatch(/\.cn-flow-board__run-card :deep\(\.cn-flow-run-summary__title\) \{[^}]*font-size: 15px;[^}]*font-weight: 700;/)
			expect(css).toMatch(/\.cn-flow-board__run-card :deep\(\.cn-flow-run-summary__facts\) \{[^}]*display: flex;/)
			expect(css).toMatch(/\.cn-flow-board__run-card :deep\(\.cn-flow-run-summary__fact dt\) \{[^}]*font-size: 12px;/)
		})

		it('🔴 the pressed side panel toggle is tonal', () => {
			expect(css).toMatch(/\.cn-flow-board__panel-toggle\[aria-pressed='true'\] \{[^}]*background-color: var\(--color-primary-element-light/)
		})
	})
})
