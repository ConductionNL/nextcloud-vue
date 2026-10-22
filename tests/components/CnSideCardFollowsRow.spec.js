/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A side card that follows the selected row of a list on the same detail
 * page (DqZaaktypeVelden: "Keuzelijst: Soort bouwwerk" shows the options of
 * the field selected in the Velden table, with "Optie toevoegen").
 *
 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md
 */
import { mount } from '@vue/test-utils'
import CnFieldListWidget from '../../src/components/CnFieldListWidget/CnFieldListWidget.vue'
import CnFollowingWidgetHost from '../../src/components/CnFollowingWidgetHost/CnFollowingWidgetHost.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { createWidgetSelection, WIDGET_SELECTION } from '../../src/utils/widgetSelection.js'

const ROWS = [
	{ id: 'a', name: 'Bouwkosten', enumValues: [] },
	{ id: 'b', name: 'Soort bouwwerk', enumValues: ['Woning', 'Dakkapel'] },
]
const WIDGET = {
	id: 'choice-list',
	type: 'field-list',
	title: 'Choice list: {name}',
	follows: { widget: 'fields', register: 'dossiq', schema: 'propertyDefinition', when: { field: 'enumValues', op: 'notEmpty' } },
	content: { field: 'enumValues' },
}
const HostStub = { name: 'CnDetailWidgetHost', props: ['widget', 'object', 'objectId', 'register', 'schema', 'objectType'], template: '<div class="host-stub" />' }

/**
 * Mount the following host over a selection.
 *
 * @param {object} selection The page selection.
 * @return {object} The wrapper.
 */
function mountFollower(selection) {
	return mount(CnFollowingWidgetHost, {
		props: { widget: WIDGET, object: { id: 'case-type-1' }, objectId: 'case-type-1', register: 'dossiq', schema: 'caseType' },
		global: { provide: { [WIDGET_SELECTION]: selection }, stubs: { CnDetailWidgetHost: HostStub } },
	})
}

describe('a side card that follows a row', () => {
	it('hosts the followed row as its record, under the followed register and schema, titled from it', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		const host = mountFollower(selection).findComponent(HostStub)
		expect(host.props('object')).toEqual(ROWS[1])
		expect(host.props('objectId')).toBe('b')
		expect(host.props('register')).toBe('dossiq')
		expect(host.props('schema')).toBe('propertyDefinition')
		expect(host.props('objectType')).toBe('propertyDefinition')
		expect(host.props('widget').title).toBe('Choice list: Soort bouwwerk')
	})

	it('draws nothing while there is no row to follow', () => {
		const wrapper = mountFollower(createWidgetSelection())
		expect(wrapper.find('.host-stub').exists()).toBe(false)
	})

	it('follows a row the reader selects', async () => {
		const selection = createWidgetSelection()
		const rows = [...ROWS, { id: 'c', name: 'Gebruik', enumValues: ['Wonen'] }]
		selection.publishRows('fields', rows)
		const wrapper = mountFollower(selection)
		selection.select('fields', rows[2])
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(HostStub).props('objectId')).toBe('c')
	})
})

describe('a list that publishes its rows', () => {
	/**
	 * An object-list context for its methods.
	 *
	 * @param {object} content The widget content.
	 * @param {object} selection The page selection.
	 * @return {object} The context.
	 */
	function list(content, selection) {
		return { content, cnWidgetSelection: selection, cnHostWidgetId: () => 'fields', openRowRoute: () => {}, $emit: () => {} }
	}

	it('selects the clicked row when it offers row selection', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		CnObjectListWidget.methods.onRowClick.call(list({ rowSelection: true }, selection), ROWS[1])
		expect(selection.entry('fields').selected).toEqual(ROWS[1])
	})

	it('selects nothing without row selection', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		CnObjectListWidget.methods.onRowClick.call(list({}, selection), ROWS[1])
		expect(selection.entry('fields').selected).toBeNull()
	})

	it('publishes the rows it shows under its widget id', () => {
		const selection = createWidgetSelection()
		CnObjectListWidget.methods.publishSelectionRows.call({ ...list({ rowSelection: true }, selection), facetedRows: ROWS })
		expect(selection.entry('fields').rows).toEqual(ROWS)
	})

	it('marks the selected row', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		selection.select('fields', ROWS[1])
		const rowClass = CnObjectListWidget.computed.selectionRowClass.call(list({ rowSelection: true }, selection))
		expect(rowClass(ROWS[1])).toBe('cn-object-list-widget__row--selected')
		expect(rowClass(ROWS[0])).toBe('')
	})
})

describe('a field list of plain values', () => {
	it('adds the value itself to a list of strings (add.scalar)', () => {
		const ctx = { content: { add: { scalar: true, fields: [{ key: 'value', label: 'Option' }] } }, addFields: [{ key: 'value', label: 'Option' }], draft: { value: '  Schuur ' } }
		expect(CnFieldListWidget.methods.newEntry.call(ctx)).toBe('Schuur')
	})

	it('adds an object without add.scalar', () => {
		const ctx = { content: { add: { fields: [{ key: 'name' }], defaults: { isDefault: false } } }, addFields: [{ key: 'name' }], draft: { name: 'Regulier' } }
		expect(CnFieldListWidget.methods.newEntry.call(ctx)).toEqual({ isDefault: false, name: 'Regulier' })
	})
})
