/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table drawn without its header row (`hideHeader`, the dashboard list
 * widgets) still names its columns for a screen reader: a header row of plain
 * `<th scope="col">` cells, visually hidden, with no controls in it (WCAG 1.3.1).
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: 'a', title: 'Zaak 1', status: 'Open' }]
const columns = [{ key: 'title', label: 'Zaak', sortable: true }, { key: 'status', label: 'Status' }]

function mountTable(props = {}) {
	return mount(CnDataTable, {
		propsData: { rows, columns, hideHeader: true, ...props },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

describe('CnDataTable — hidden header', () => {
	it('keeps a header cell per column, scoped to the column', () => {
		const ths = mountTable({ selectable: false }).findAll('thead th')
		expect(ths.map((th) => th.text())).toEqual(['Zaak', 'Status'])
		expect(ths.every((th) => th.attributes('scope') === 'col')).toBe(true)
	})

	it('marks the header row as hidden and puts no controls in it', () => {
		const wrapper = mountTable({ selectable: true })
		const thead = wrapper.find('thead')
		expect(thead.classes()).toContain('cn-data-table__hidden-head')
		expect(thead.findAll('button, input').length).toBe(0)
		expect(thead.findAll('th').length).toBe(3)
	})

	it('matches the body row cell count', () => {
		const wrapper = mountTable({ selectable: true })
		expect(wrapper.findAll('thead th').length).toBe(wrapper.findAll('tbody tr').at(0).findAll('td').length)
	})

	it('draws the full header when hideHeader is off', () => {
		const wrapper = mountTable({ hideHeader: false, selectable: false })
		expect(wrapper.find('thead').classes()).not.toContain('cn-data-table__hidden-head')
		expect(wrapper.find('thead button').exists()).toBe(true)
	})
})
