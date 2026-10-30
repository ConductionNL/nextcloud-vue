/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Boards PqFlow and PqFlowRun: a run carries no editing chrome on any board
 * flow page, and `layout: "canvas"` draws the page as a canvas with a floating
 * inspector, the validity as a toolbar pill and, in a run, the status pills in
 * the header and the run card over the canvas.
 *
 * @spec openspec/changes/flow-board-canvas-layout/specs/flow-board/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnFlowDetail = require('../../src/components/CnFlowDetail/CnFlowDetail.vue').default

const DetailStub = {
	name: 'CnFlowDetail',
	props: { id: String, app: String, run: String, layoutDirection: String, fitMaxZoom: Number, nodeBadge: Function, toolbarActions: Boolean, addStep: Boolean, quietRun: Boolean },
	template: '<div class="detail"><slot name="toolbar-end" /></div>',
}
const stubs = { CnFlowDetail: DetailStub, CnFlowSidebar: { name: 'CnFlowSidebar', template: '<div class="runs" />' }, CnBuildiqEditButton: true, CnFlowRunSummary: { name: 'CnFlowRunSummary', template: '<div class="run-card" />' }, NcNoteCard: { template: '<div class="note"><slot /></div>' } }

const FLOW = { id: 'f1', name: 'Confirm receipt', nodes: [{ id: 'n1', type: 'openregister.send-email', name: 'Mail the resident', config: {} }, { id: 'n2', type: 'openregister.write', name: 'Post', config: {} }], edges: [] }
const RUN = { uuid: 'r1', status: 'completed', created: '2026-10-07T08:41:00Z', log: [{ transition: 'n1', status: 'completed' }, { transition: 'n2', status: 'failed' }] }

/**
 * @param {object} props Extra props.
 * @param {object} state Store fields to set.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(props = {}, state = {}) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: [], flow: FLOW, nodes: FLOW.nodes, ...state })
	await w.vm.$nextTick()
	return w
}

const inspector = (w) => w.find('[data-testid="flow-board-inspector"]')

describe('a run without editing chrome', () => {
	const { canvasMessages, editingShown } = CnFlowDetail.computed
	const ctx = (quietRun, inRunView) => ({
		quietRun,
		openingRun: false,
		t: (app, text) => text,
		store: { inRunView, graphLocked: true, viewingVersion: 1, dirty: true, catalogLoading: false, nodeCatalog: [], flow: { enabled: true, owner: '' }, error: 'boom', lifecycleRefusal: null, runGraphNotice: null, checkResult: null },
		errorText: 'boom',
		missingEndsMessage: 'no end',
		skippedRunTransitions: [],
		driftedSteps: [],
		runSkipDismissed: false,
	})

	it('🔴 drops the lock, version and setup notices from a quiet run', () => {
		const ids = canvasMessages.call(ctx(true, true)).map((m) => m.id)
		expect(ids).toEqual(['action-failed'])
	})

	it('keeps every notice in the editor and on a page that does not ask for quiet', () => {
		expect(canvasMessages.call(ctx(true, false)).map((m) => m.id)).toContain('graph-locked')
		expect(canvasMessages.call(ctx(false, true)).map((m) => m.id)).toContain('viewing-version')
	})

	it('🔴 hides the editing buttons in a quiet run only', () => {
		expect(typeof editingShown).toBe('function')
		expect(editingShown.call(ctx(true, true))).toBe(false)
		expect(editingShown.call(ctx(true, false))).toBe(true)
		expect(editingShown.call(ctx(false, true))).toBe(true)
	})

	it('🔴 the board asks its canvas for a quiet run', async () => {
		const w = await mountBoard()
		expect(w.findComponent({ name: 'CnFlowDetail' }).props('quietRun')).toBe(true)
	})
})

describe('the canvas layout', () => {
	it('keeps the card layout without layout', async () => {
		const w = await mountBoard()
		expect(w.classes()).not.toContain('cn-flow-board--canvas')
		expect(inspector(w).exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-validity"]').exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-validity-pill"]').exists()).toBe(false)
	})

	it('🔴 draws no inspector until a step is selected, then one that closes', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		expect(w.classes()).toContain('cn-flow-board--canvas')
		expect(inspector(w).exists()).toBe(false)
		w.vm.store.selectedNodeId = 'n1'
		await w.vm.$nextTick()
		expect(inspector(w).exists()).toBe(true)
		await w.find('[data-testid="flow-board-inspector-close"]').trigger('click')
		expect(w.vm.store.selectedNodeId).toBe(null)
		expect(inspector(w).exists()).toBe(false)
	})

	it('🔴 puts the validity pill and the side panel toggle in the canvas toolbar', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		expect(w.find('[data-testid="flow-board-validity"]').exists()).toBe(false)
		expect(w.find('.detail [data-testid="flow-board-validity-pill"]').exists()).toBe(true)
		await w.find('.detail [data-testid="flow-board-panel-toggle"]').trigger('click')
		expect(inspector(w).exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-inspector-empty"]').exists()).toBe(true)
	})

	it('opens the panel for the runs after Run', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		w.vm.onRun()
		await w.vm.$nextTick()
		expect(inspector(w).exists()).toBe(true)
	})

	it('🔴 shows a run with its pills in the header and its card over the canvas', async () => {
		const w = await mountBoard({ layout: 'canvas', run: 'r1' }, { inspectedRunUuid: 'r1', runDetail: RUN })
		const pills = w.find('[data-testid="flow-board-run-pills"]')
		expect(pills.exists()).toBe(true)
		expect(pills.text()).toContain('Finished')
		expect(pills.text()).toContain('1 step with a warning')
		expect(w.find('.cn-flow-board__canvas [data-testid="flow-board-run-card"]').exists()).toBe(true)
		expect(inspector(w).find('.run-card').exists()).toBe(false)
		expect(inspector(w).find('[role="tablist"]').exists()).toBe(true)
	})

	it('keeps the run card in the side column in the card layout', async () => {
		const w = await mountBoard({ run: 'r1' }, { inspectedRunUuid: 'r1', runDetail: RUN })
		expect(inspector(w).find('.run-card').exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-run-pills"]').exists()).toBe(false)
	})

	it('🔴 the editor page hands its layout to the board', () => {
		const CnFlowEditorPage = require('../../src/components/CnFlowsPage/CnFlowEditorPage.vue').default
		expect(CnFlowEditorPage.props.layout).toBeDefined()
	})
})
