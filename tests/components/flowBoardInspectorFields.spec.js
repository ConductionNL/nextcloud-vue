/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board inspector (DqFlow "Welstand nodig?"): the selected step's
 * settings as fields that edit the step, its type as "Beslistabel van
 * OpenRegister", and where it goes next ("Ja  Deelzaak welstandsadvies").
 *
 * @spec openspec/changes/flow-board-inspector-fields/specs/flow-board/spec.md#requirement-the-flow-board-inspector-edits-the-selected-steps-settings-and-names-its-outcomes
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }
const CATALOG = [{
	id: 'openregister.decision-table',
	displayName: 'Beslistabel toepassen',
	configForm: [
		{ key: 'table', label: 'Inline table', type: 'textarea' },
		{ key: 'tableRef', label: 'Beslistabel', type: 'select', options: [{ value: 'welstand', label: 'Welstandsgebieden Zuiddrecht' }, { value: 'parkeren', label: 'Parkeerzones' }] },
		{ key: 'inputMapping', label: 'Invoer', type: 'textarea' },
		{ key: 'resultKey', label: 'Result', type: 'text', required: true },
	],
}, { id: 'dossiq.createSubCase', displayName: 'Deelzaak aanmaken' }, { id: 'dossiq.besluitvormingPublish', displayName: 'Besluit publiceren' }]
const FLOW = {
	id: 'f1',
	name: 'Omgevingsvergunning regulier',
	lifecycleStatus: 'draft',
	nodes: [
		{ id: 'w', type: 'openregister.decision-table', name: 'Welstand nodig?', config: { tableRef: 'welstand', inputMapping: { locatie: 'item.locatie' } } },
		{ id: 'd', type: 'dossiq.createSubCase', name: 'Deelzaak welstandsadvies', config: {} },
		{ id: 'b', type: 'dossiq.besluitvormingPublish', name: 'Besluit publiceren', config: {} },
	],
	edges: [{ from: 'w', to: 'd', label: 'Ja' }, { from: 'w', to: 'b', label: 'Nee' }],
}
const GROUPS = [{ app: 'openregister', label: 'OpenRegister', entries: [{ type: 'openregister.decision-table', label: 'Beslistabel' }] }]

/**
 * @return {Promise<object>} The board with "Welstand nodig?" selected.
 */
async function mountBoard() {
	const w = mount(CnFlowBoard, { props: { id: 'f1', paletteGroups: GROUPS }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG, flow: JSON.parse(JSON.stringify(FLOW)), selectedNodeId: 'w' })
	await w.vm.$nextTick()
	return w
}

describe('the board inspector edits the selected step', () => {
	it('shows the settings the step sets and the required ones, as fields', async () => {
		const w = await mountBoard()
		expect(w.vm.stepFields.map((field) => [field.key, field.widget])).toEqual([['tableRef', 'select'], ['inputMapping', 'textarea'], ['resultKey', 'text']])
		expect(w.vm.stepFields[0].option).toEqual({ value: 'welstand', label: 'Welstandsgebieden Zuiddrecht' })
	})

	it('writes a chosen option to the step', async () => {
		const w = await mountBoard()
		w.vm.setStepField(w.vm.stepFields[0], 'parkeren')
		expect(w.vm.store.selectedNode.config.tableRef).toBe('parkeren')
		expect(w.vm.store.dirty).toBe(true)
	})

	it('writes an object setting back as an object when the text is JSON, and leaves it on bad JSON', async () => {
		const w = await mountBoard()
		const field = w.vm.stepFields[1]
		w.vm.drafts.inputMapping = '{"locatie": "item.adres"}'
		w.vm.commitStepField(field)
		expect(w.vm.store.selectedNode.config.inputMapping).toEqual({ locatie: 'item.adres' })
		w.vm.drafts.inputMapping = '{not json'
		w.vm.commitStepField(w.vm.stepFields[1])
		expect(w.vm.store.selectedNode.config.inputMapping).toEqual({ locatie: 'item.adres' })
	})

	it('names the type with its app, and the outcomes with their steps', async () => {
		const w = await mountBoard()
		expect(w.vm.stepTypePill).toBe('Beslistabel from OpenRegister')
		const rows = w.findAll('.cn-flow-board__outcome').map((row) => [row.find('dt').text(), row.find('dd').text()])
		expect(rows).toEqual([['Ja', 'Deelzaak welstandsadvies'], ['Nee', 'Besluit publiceren']])
	})

	it('locks the fields on a locked flow', async () => {
		const w = await mountBoard()
		w.vm.store.flow.lifecycleStatus = 'deprecated'
		await w.vm.$nextTick()
		expect(w.vm.store.graphLocked).toBe(true)
		w.vm.setStepField(w.vm.stepFields[0], 'parkeren')
		expect(w.vm.store.selectedNode.config.tableRef).toBe('welstand')
	})
})
