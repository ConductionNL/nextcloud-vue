/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * `rowAttrs` gives each data row extra attributes, so an app that moves a
 * hand-built table onto CnDataTable keeps the row test ids its end-to-end
 * tests find rows by (OpenRegister's `mdm-master-entity-row`).
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: 'a', title: 'One' }, { id: 'b', title: 'Two' }]
const columns = [{ key: 'title', label: 'Title' }]
const stubs = { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } }

/**
 * Mount the table with the given extra props.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function table(props = {}) {
	return mount(CnDataTable, { propsData: { rows, columns, ...props }, stubs })
}

describe('CnDataTable rowAttrs', () => {
	it('keeps the default row test id without rowAttrs', () => {
		const ids = table().findAll('tr.cn-table-row').map((tr) => tr.attributes('data-testid'))
		expect(ids).toEqual(['cn-object-row', 'cn-object-row'])
	})

	it('sets the attributes it returns per row, a data-testid replacing the default', () => {
		const wrapper = table({
			rowAttrs: (row) => ({ 'data-testid': 'entity-row', 'data-entity': row.id }),
		})
		const trs = wrapper.findAll('tr.cn-table-row')
		expect(trs.map((tr) => tr.attributes('data-testid'))).toEqual(['entity-row', 'entity-row'])
		expect(trs.map((tr) => tr.attributes('data-entity'))).toEqual(['a', 'b'])
	})

	it('keeps the attributes the table sets after it and adds a class to its own', () => {
		const wrapper = table({
			rowAttrs: () => ({ 'data-testid-row-id': 'x', class: 'extra' }),
		})
		const tr = wrapper.find('tr.cn-table-row')
		expect(tr.attributes('data-testid-row-id')).toBe('a')
		expect(tr.classes()).toEqual(expect.arrayContaining(['cn-table-row', 'extra']))
	})

	it('leaves the empty row alone', () => {
		const wrapper = table({ rows: [], rowAttrs: () => ({ 'data-testid': 'entity-row' }) })
		expect(wrapper.find('[data-testid="entity-row"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-object-list-empty"]').exists()).toBe(true)
	})
})
