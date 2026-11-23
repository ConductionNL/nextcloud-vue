/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFlow's second header row: the pill ("Flow van zaaktype") first, then
 * "Instellingen / Flows / Omgevingsvergunning regulier" with each level its
 * own link, and a notice that names the case type ("Deze flow is de werkwijze
 * van het zaaktype Omgevingsvergunning regulier.").
 *
 * @spec openspec/changes/flow-board-trail/specs/flow-board/spec.md#requirement-the-flow-board-path-names-every-level-and-carries-the-pill
 * @spec openspec/changes/flow-board-trail/specs/flow-board/spec.md#requirement-the-flow-board-notice-can-name-the-flow
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = {
	CnFlowDetail: true,
	CnFlowSidebar: true,
	CnBuildiqEditButton: true,
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
}
const FLOW = { id: 'f1', name: 'Omgevingsvergunning regulier', trigger: 'manual', version: 4, enabled: true, nodes: [], edges: [] }

/**
 * Mount the board with the store's flow set.
 *
 * @param {object} props The board props.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { flow: { ...FLOW } })
	await w.vm.$nextTick()
	return w
}

describe('CnFlowBoard path', () => {
	it('draws every crumb of the trail as its own link, then the flow', async () => {
		const w = await mountBoard({ breadcrumb: [{ label: 'Instellingen', href: '/index.php/settings/admin/dossiq' }, { label: 'Flows' }] })
		const links = w.findAll('[data-testid="flow-board-path"] a')
		expect(links.map((link) => link.text())).toEqual(['Instellingen', 'Flows'])
		expect(links[0].attributes('href')).toBe('/index.php/settings/admin/dossiq')
		expect(links[1].attributes('href')).toBe('/flows')
		expect(w.find('[data-testid="flow-board-path"]').text()).toContain('Omgevingsvergunning regulier')
	})

	it('keeps the single list link without a trail', async () => {
		const w = await mountBoard({ listLabel: 'Settings / Flows' })
		const links = w.findAll('[data-testid="flow-board-path"] a')
		expect(links.map((link) => link.text())).toEqual(['Settings / Flows'])
	})

	it('draws the pill at the start of the path row, not beside the title', async () => {
		const w = await mountBoard({ pill: 'Flow van zaaktype' })
		expect(w.find('.cn-flow-board__heading').text()).not.toContain('Flow van zaaktype')
		expect(w.find('[data-testid="flow-board-path"]').text()).toContain('Flow van zaaktype')
	})
})

describe('CnFlowBoard notice', () => {
	it('fills {name} with the flow\'s name', async () => {
		const w = await mountBoard({ notice: 'Deze flow is de werkwijze van het zaaktype {name}.' })
		expect(w.find('.note').text()).toBe('Deze flow is de werkwijze van het zaaktype Omgevingsvergunning regulier.')
	})
})
