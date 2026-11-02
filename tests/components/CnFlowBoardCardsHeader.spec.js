/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqFlow: the flow's name is the page's heading, and a page can name
 * the Active switch once so the switch alone says whether the flow runs.
 *
 * @spec openspec/changes/flow-board-cards-header/specs/flow-board/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnFlowEditorPage = require('../../src/components/CnFlowsPage/CnFlowEditorPage.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div class="note"><slot /></div>' } }
const FLOW = { id: 'f1', name: 'Omgevingsvergunning regulier', enabled: false, nodes: [], edges: [] }

/**
 * @param {object} props Extra props.
 * @param {object} state Store fields to set.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(props = {}, state = {}) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: [], flow: FLOW, nodes: [], ...state })
	await w.vm.$nextTick()
	return w
}

describe('the flow board header (DqFlow)', () => {
	it('draws the flow name as the page heading', async () => {
		const w = await mountBoard()
		const title = w.find('[data-testid="flow-board-title"]')
		expect(title.element.tagName).toBe('H1')
		expect(title.text()).toBe('Omgevingsvergunning regulier')
	})

	it('names the switch after its state by default', async () => {
		const w = await mountBoard()
		expect(w.find('[data-testid="flow-board-enabled"]').text()).toBe('Paused')
		expect(w.find('[data-testid="flow-board-enabled-switch"]').attributes('aria-checked')).toBe('false')
	})

	it('keeps the switch named Active when the page asks for a fixed label', async () => {
		const w = await mountBoard({ toggleLabel: 'fixed' })
		expect(w.find('[data-testid="flow-board-enabled"]').text()).toBe('Active')
		expect(w.find('[data-testid="flow-board-enabled-switch"]').attributes('aria-checked')).toBe('false')

		Object.assign(w.vm.store, { flow: { ...FLOW, enabled: true } })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="flow-board-enabled"]').text()).toBe('Active')
		expect(w.find('[data-testid="flow-board-enabled-switch"]').attributes('aria-checked')).toBe('true')
	})

	it('takes the label mode from the manifest page config', () => {
		expect(CnFlowEditorPage.props.toggleLabel).toEqual(expect.objectContaining({ type: String, default: 'state' }))
	})
})

describe('the cards layout head spacing (DqFlow)', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
	const cards = '.cn-look-board .cn-flow-board:not(.cn-flow-board--canvas):not(.cn-look-nextcloud *)'
	const rule = (selector) => {
		const at = css.indexOf(selector + ' {')
		return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
	}

	it('puts the head, the notice and the cards 20px apart', () => {
		expect(rule(cards)).toMatch(/gap: 20px;/)
		expect(rule(`${cards} > .cn-flow-board__notice`)).toMatch(/margin: 0;/)
	})

	it('draws the path 6px under the title row with 8px of head below it', () => {
		expect(rule(`${cards} > .cn-flow-board__header`)).toMatch(/padding-top: 4px;/)
		expect(rule(`${cards} > .cn-flow-board__path`)).toMatch(/margin-top: -14px;[^}]*padding-bottom: 8px;/)
	})

	it('leaves the canvas layout and the Nextcloud look alone', () => {
		const flowRules = css.split('}').filter((block) => /\.cn-flow-board(?:[ :>]|__header|__path|__notice)/.test(block) && !/__actions/.test(block))
		flowRules.forEach((block) => {
			expect(block).toMatch(/:not\(\.cn-flow-board--canvas\)/)
			expect(block).toMatch(/:not\(\.cn-look-nextcloud \*\)/)
		})
	})
})
