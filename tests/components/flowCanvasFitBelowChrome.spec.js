/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Boards PqFlow and PqFlowRun: the canvas page frames its steps below the
 * floating toolbar (and the run card), beside the open side panel and above
 * the legend, so no chrome lies over a step and takes its clicks. The canvas
 * also gets a definite height, so Vue Flow measures a real pane.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnGraphCanvas = require('../../src/components/CnGraphCanvas/CnGraphCanvas.vue').default
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'src', f), 'utf8')

describe('CnGraphCanvas fitInset', () => {
	const { onNodesInitialized, fitToView } = CnGraphCanvas.methods

	it('🔴 frames the graph clear of the inset on the first render, also without a zoom cap', () => {
		const vm = { fitView: true, fitMaxZoom: 0, fitInset: { top: 48 }, framedOnce: false, fitViewNow: jest.fn() }
		onNodesInitialized.call(vm)
		onNodesInitialized.call(vm)
		expect(vm.fitViewNow).toHaveBeenCalledTimes(1)
		expect(vm.fitViewNow).toHaveBeenCalledWith({ padding: { top: '72px', right: '24px', bottom: '24px', left: '24px' } })
	})

	it('🔴 asks a function inset at the moment it fits, and keeps the cap', () => {
		const inset = jest.fn(() => ({ top: 140, right: 346 }))
		const vm = { fitView: true, fitMaxZoom: 1, fitInset: inset, framedOnce: false, fitViewNow: jest.fn() }
		onNodesInitialized.call(vm)
		expect(inset).toHaveBeenCalled()
		expect(vm.fitViewNow).toHaveBeenCalledWith({ maxZoom: 1, padding: { top: '164px', right: '370px', bottom: '24px', left: '24px' } })
	})

	it('🔴 the fit control keeps clear of the inset too', () => {
		const vm = { fitInset: { bottom: 50 }, fitViewNow: jest.fn() }
		fitToView.call(vm)
		expect(vm.fitViewNow).toHaveBeenCalledWith({ padding: { top: '24px', right: '24px', bottom: '74px', left: '24px' } })
	})

	it('leaves Vue Flow\'s own first fit alone without an inset', () => {
		const w = mount(CnGraphCanvas, { props: { nodes: [], edges: [] } })
		expect(w.vm.fitOnInit).toBe(true)
		const vm = { fitView: true, fitMaxZoom: 0, fitInset: null, framedOnce: false, fitViewNow: jest.fn() }
		onNodesInitialized.call(vm)
		expect(vm.fitViewNow).not.toHaveBeenCalled()
		const ctrl = { fitInset: null, fitViewNow: jest.fn() }
		fitToView.call(ctrl)
		expect(ctrl.fitViewNow).toHaveBeenCalledWith({ padding: 0.1 })
	})

	it('🔴 hands the first fit to onNodesInitialized when an inset is set', async () => {
		const w = mount(CnGraphCanvas, { props: { nodes: [], edges: [], fitInset: { top: 48 } } })
		expect(w.vm.fitOnInit).toBe(false)
	})
})

describe('CnFlowDetail passes the inset on', () => {
	it('🔴 declares fitInset and binds it to the canvas', () => {
		const detail = require('../../src/components/CnFlowDetail/CnFlowDetail.vue').default
		expect(detail.props.fitInset).toBeDefined()
		expect(read('components/CnFlowDetail/CnFlowDetail.vue')).toMatch(/<CnGraphCanvas[^>]*:fitInset="fitInset"/)
	})
})

describe('CnFlowBoard canvas layout', () => {
	const DetailStub = {
		name: 'CnFlowDetail',
		props: { id: String, app: String, run: String, layoutDirection: String, fitMaxZoom: Number, fitInset: [Object, Function], nodeBadge: Function, toolbarActions: Boolean, addStep: Boolean, quietRun: Boolean },
		template: '<div class="detail"><div class="cn-flow-detail__toolbar" /><slot name="toolbar-end" /></div>',
	}
	const stubs = { CnFlowDetail: DetailStub, CnFlowSidebar: true, CnBuildiqEditButton: true, CnFlowRunSummary: { name: 'CnFlowRunSummary', template: '<div class="run-card" />' }, NcNoteCard: true }
	const FLOW = { id: 'f1', name: 'Confirm receipt', nodes: [{ id: 'n1', type: 'openregister.send-email', name: 'Mail', config: {} }], edges: [] }

	const mountBoard = async (props) => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
		Object.assign(w.vm.store, { nodeCatalog: [], flow: FLOW, nodes: FLOW.nodes })
		await w.vm.$nextTick()
		return w
	}

	it('🔴 gives the canvas a function that measures the chrome over it', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		const inset = w.findComponent({ name: 'CnFlowDetail' }).props('fitInset')
		expect(typeof inset).toBe('function')
		const frame = { top: 100, left: 300, right: 1300, bottom: 740, width: 1000, height: 640 }
		w.find('.cn-flow-board__canvas').element.getBoundingClientRect = () => frame
		w.find('.cn-flow-detail__toolbar').element.getBoundingClientRect = () => ({ top: 100, left: 300, right: 900, bottom: 148, width: 600, height: 48 })
		expect(inset()).toEqual({ top: 48, right: 0, bottom: 0, left: 0 })
	})

	it('leaves the card layout\'s fit as it was', async () => {
		const w = await mountBoard({})
		expect(w.findComponent({ name: 'CnFlowDetail' }).props('fitInset')).toBeFalsy()
	})

	it('🔴 the canvas fills the body, so its height is definite', () => {
		expect(read('components/CnFlowsPage/CnFlowBoard.vue')).toMatch(/\.cn-flow-board--canvas \.cn-flow-board__canvas \{[^}]*position: absolute;[^}]*inset: 0;/)
	})
})
