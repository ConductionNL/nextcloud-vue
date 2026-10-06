/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `columns[].secondary` draws a muted second line under a cell's value, so
 * one column reads "title" over "number · requester" as the Zuiddrecht case
 * list does. A column without it renders as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-table-column-carries-a-secondary-line
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: '1', title: 'Lighting Lindelaan', number: '2026-0082', requester: { name: 'S. de Vries' } },
	{ id: '2', title: 'Parking permits', number: '', requester: { name: '' } },
]

function mountTable(columns) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns, rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

describe('CnDataTable — secondary line', () => {
	it('draws nothing extra without a secondary', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Case' }])
		expect(wrapper.findAll('[data-testid="cn-cell-secondary"]')).toHaveLength(0)
	})

	it('fills a template from the row, dotted paths included', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Case', secondary: '{number} · {requester.name}' }])
		const lines = wrapper.findAll('[data-testid="cn-cell-secondary"]')
		expect(lines).toHaveLength(1)
		expect(lines[0].text()).toBe('2026-0082 · S. de Vries')
		expect(lines[0].classes()).toContain('cn-table-cell__secondary')
	})

	it('reads a bare field key and calls a function with the row', () => {
		const byKey = mountTable([{ key: 'title', label: 'Case', secondary: 'number' }])
		expect(byKey.find('[data-testid="cn-cell-secondary"]').text()).toBe('2026-0082')
		const byFn = mountTable([{ key: 'title', label: 'Case', secondary: (row) => `#${row.id}` }])
		expect(byFn.findAll('[data-testid="cn-cell-secondary"]').map((w) => w.text())).toEqual(['#1', '#2'])
	})
})
