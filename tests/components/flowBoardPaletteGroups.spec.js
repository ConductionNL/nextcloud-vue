/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A flow page can curate its palette: the groups it names, in its order,
 * with its own step labels (board DqFlow: four groups, nine steps). The rest
 * of the catalogue stays one click away behind "More steps".
 *
 * @spec openspec/changes/flow-board-palette-groups/specs/flow-board/spec.md#requirement-a-flow-page-can-curate-its-palette
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { ocs: { data: [{ app: 'dossiq', name: 'Dossiq' }] } } })),
		post: jest.fn(),
	},
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const { clearAppDisplayNames } = require('../../src/utils/nextcloudApps.js')

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, CnFlowStepPickerModal: { name: 'CnFlowStepPickerModal', template: '<div class="picker" />' }, NcNoteCard: { template: '<div class="note"><slot /></div>' } }
const CATALOG = [
	{ id: 'dossiq.setStatus', displayName: 'Status zetten' },
	{ id: 'dossiq.suspendTerm', displayName: 'Termijn opschorten' },
	{ id: 'openregister.decision-table', displayName: 'Beslistabel toepassen' },
	{ id: 'openconnector.source-call', displayName: 'Een bron aanroepen' },
	{ id: 'hermiq.agent-step', displayName: 'Agent step' },
]
const GROUPS = [
	{ app: 'dossiq', entries: [{ type: 'dossiq.setStatus' }] },
	{ label: 'OpenRegister', tone: 'purple', entries: [{ type: 'openregister.decision-table', label: 'Beslistabel', short: 'beslistabel' }, { type: 'openregister.gone' }] },
	{ label: 'Integriq', tone: 'teal', entries: [{ type: 'openconnector.source-call', label: 'Externe aanroep' }] },
	{ label: 'Empty', entries: [{ type: 'nobody.home' }] },
]

/**
 * @param {object} props The board props.
 * @return {Promise<object>} The wrapper, with the catalogue seeded.
 */
async function mountBoard(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', app: 'dossiq', palette: 'column', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG, flow: { ...w.vm.store.flow, lifecycleStatus: 'draft' } })
	await flushPromises()
	return w
}

beforeEach(() => clearAppDisplayNames())

describe('curated flow palette', () => {
	it('draws only the groups and steps the page names, in its order and words', async () => {
		const w = await mountBoard({ paletteGroups: GROUPS })
		expect(w.findAll('.cn-flow-board__palette-app').map((h) => h.text())).toEqual(['Dossiq', 'OpenRegister', 'Integriq'])
		expect(w.findAll('.cn-flow-board__palette-step').map((b) => b.text())).toEqual(['Status zetten', 'Beslistabel', 'Externe aanroep'])
	})

	it('adds the catalogue step behind a curated label', async () => {
		const w = await mountBoard({ paletteGroups: GROUPS })
		const spy = jest.spyOn(w.vm.store, 'addNode').mockImplementation(() => {})
		await w.find('[data-testid="flow-board-palette-openregister.decision-table"]').trigger('click')
		expect(spy).toHaveBeenCalledWith('openregister.decision-table')
	})

	it('keeps every other step behind More steps', async () => {
		const w = await mountBoard({ paletteGroups: GROUPS })
		expect(w.find('.picker').exists()).toBe(false)
		await w.find('[data-testid="flow-board-palette-more"]').trigger('click')
		expect(w.find('.picker').exists()).toBe(true)
	})

	it('keeps the whole catalogue, grouped per app, when the page names no groups', async () => {
		const w = await mountBoard({})
		expect(w.findAll('.cn-flow-board__palette-step')).toHaveLength(CATALOG.length)
		expect(w.find('[data-testid="flow-board-palette-more"]').exists()).toBe(false)
	})
})
