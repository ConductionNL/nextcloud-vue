/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `valueWhen` rules name what a cell holds by the row's other
 * fields: PtMededelingenActies draws a published notice whose window runs as
 * "Nu zichtbaar" and one whose window has passed as "Verlopen".
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/data-table/spec.md#requirement-a-column-can-name-its-value-by-the-rows-fields
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const HOUR = 3600 * 1000
const iso = (offset) => new Date(Date.now() + offset).toISOString()

const STATUS = {
	key: 'status',
	label: 'Status',
	valueWhen: [
		{ when: [{ field: 'status', value: 'published' }, { field: 'startsAt', op: 'lte', value: '@now' }, { field: 'endsAt', op: 'gte', value: '@now' }], value: 'visible' },
		{ when: [{ field: 'status', value: 'published' }, { field: 'endsAt', op: 'lt', value: '@now' }], value: 'expired' },
	],
}

function cells(rows) {
	const wrapper = mount(CnDataTable, {
		propsData: { rows, columns: [STATUS], rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
	return wrapper.findAll('.cell').map((w) => w.text())
}

describe('CnDataTable: column valueWhen', () => {
	it('takes the value of the first rule that holds, else the stored value', () => {
		expect(cells([
			{ id: '1', status: 'published', startsAt: iso(-HOUR), endsAt: iso(HOUR) },
			{ id: '2', status: 'published', startsAt: iso(-48 * HOUR), endsAt: iso(-HOUR) },
			{ id: '3', status: 'published', startsAt: iso(HOUR), endsAt: iso(48 * HOUR) },
			{ id: '4', status: 'draft', startsAt: iso(-HOUR), endsAt: iso(HOUR) },
		])).toEqual(['visible', 'expired', 'published', 'draft'])
	})
})
