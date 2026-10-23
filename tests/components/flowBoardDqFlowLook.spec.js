/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow board as DqFlow draws it: steps run top to bottom at their own
 * size, the palette has no title row above its uppercase app groups and sits
 * on the page ground beside a white dotted canvas, the columns are 220 / rest
 * / 280, and a palette step is set at 14px.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { flushPromises, mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const { createPinia, setActivePinia } = require('pinia')
const { FLOW_LAYOUT_COLUMN_WIDTH, FLOW_LAYOUT_LAYER_HEIGHT_DOWN, FLOW_LAYOUT_MARGIN, FLOW_LAYOUT_TOP, layoutFlowNodes } = require('../../src/composables/flowGraphLayout.js')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnGraphCanvas = require('../../src/components/CnGraphCanvas/CnGraphCanvas.vue').default

const boardSource = fs.readFileSync(path.join(__dirname, '../../src/components/CnFlowsPage/CnFlowBoard.vue'), 'utf8')
const style = boardSource.slice(boardSource.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the scoped rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(style))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }

beforeEach(() => setActivePinia(createPinia()))

describe('DqFlow: steps top to bottom at their own size', () => {
	const nodes = [{ id: 'start' }, { id: 'check' }, { id: 'yes' }, { id: 'no' }]
	const lines = [{ source: 'start', target: 'check' }, { source: 'check', target: 'yes' }, { source: 'check', target: 'no' }]

	it('lays the run order out as rows and the branches as columns', () => {
		const placed = Object.fromEntries(layoutFlowNodes(nodes, lines, ['start'], { direction: 'down' }).map((n) => [n.id, n.position]))
		expect(placed.start).toEqual({ x: FLOW_LAYOUT_MARGIN, y: FLOW_LAYOUT_TOP })
		expect(placed.check).toEqual({ x: FLOW_LAYOUT_MARGIN, y: FLOW_LAYOUT_TOP + FLOW_LAYOUT_LAYER_HEIGHT_DOWN })
		expect(placed.yes.y).toBe(FLOW_LAYOUT_TOP + (2 * FLOW_LAYOUT_LAYER_HEIGHT_DOWN))
		expect(placed.no).toEqual({ x: FLOW_LAYOUT_MARGIN + FLOW_LAYOUT_COLUMN_WIDTH, y: placed.yes.y })
	})

	it('keeps left to right without the option', () => {
		const placed = Object.fromEntries(layoutFlowNodes(nodes, lines, ['start']).map((n) => [n.id, n.position]))
		expect(placed.check).toEqual({ x: FLOW_LAYOUT_MARGIN + FLOW_LAYOUT_COLUMN_WIDTH, y: FLOW_LAYOUT_TOP })
	})

	it('hands the canvas the direction and a first frame no closer than 100%', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', flowDirection: 'down' }, global: { stubs } })
		await flushPromises()
		const detail = w.findComponent({ name: 'CnFlowDetail' })
		expect(detail.attributes('layoutdirection') ?? detail.props?.('layoutDirection')).toBe('down')
		expect(String(detail.attributes('fitmaxzoom') ?? detail.props?.('fitMaxZoom'))).toBe('1')
	})

	it('frames the graph once, capped, when the canvas is told a cap', () => {
		const fitViewNow = jest.fn()
		const vm = { fitView: true, fitMaxZoom: 1, framedOnce: false, fitViewNow }
		CnGraphCanvas.methods.onNodesInitialized.call(vm)
		CnGraphCanvas.methods.onNodesInitialized.call(vm)
		expect(fitViewNow).toHaveBeenCalledTimes(1)
		expect(fitViewNow).toHaveBeenCalledWith({ maxZoom: 1, padding: 0.1 })
		const uncapped = { fitView: true, fitMaxZoom: 0, framedOnce: false, fitViewNow: jest.fn() }
		CnGraphCanvas.methods.onNodesInitialized.call(uncapped)
		expect(uncapped.fitViewNow).not.toHaveBeenCalled()
	})
})

describe('DqFlow: the palette', () => {
	it('has no title row above its app groups, and keeps its name for assistive tech', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', palette: 'column' }, global: { stubs } })
		Object.assign(w.vm.store, { nodeCatalog: [{ id: 'dossiq.set-status', app: 'dossiq', displayName: 'Set status' }] })
		await flushPromises()
		const palette = w.find('[data-testid="flow-board-palette"]')
		expect(palette.find('.cn-flow-board__card-title').exists()).toBe(false)
		expect(palette.attributes('aria-label')).toBe('Steps')
		expect(rule('.cn-flow-board__palette-app')).toContain('text-transform: uppercase')
		expect(rule('.cn-flow-board__palette-app')).toContain('font-size: 12px')
	})

	it('sits on the page ground beside the white dotted canvas', () => {
		expect(rule('.cn-flow-board__palette')).toContain('background: transparent')
		expect(rule('.cn-flow-board__canvas')).toContain('background-color: var(--color-main-background)')
	})

	it('sets the columns at 220 / rest / 280', () => {
		expect(rule('.cn-flow-board--with-palette .cn-flow-board__body')).toContain('grid-template-columns: 220px minmax(0, 1fr) 280px')
	})

	it('sets a palette step at 14px', () => {
		expect(rule('.cn-flow-board__palette-step')).toContain('font-size: 14px')
	})
})
