/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * `rowAttributes` binds extra HTML attributes on a row's `<tr>`, after the
 * table's own, so an app moving a hand-built table onto CnDataTable keeps the
 * row test ids its end-to-end tests locate (OpenRegister's quality pages:
 * `mdm-duplicate-row`, `mdm-master-entity-row`, `mdm-merge-operation-row`).
 */

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [{ id: '1', title: 'One' }, { id: '2', title: 'Two' }]
const columns = [{ key: 'title', label: 'Title' }]
const stubs = { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } }

describe('CnDataTable rowAttributes', () => {
	it('keeps the default row test id without the prop', () => {
		const wrapper = mount(CnDataTable, { propsData: { rows, columns }, stubs })
		const trs = wrapper.findAll('tbody tr')
		expect(trs.map((tr) => tr.attributes('data-testid'))).toEqual(['cn-object-row', 'cn-object-row'])
	})

	it('binds the attributes the function returns for each row, replacing the default test id', () => {
		const wrapper = mount(CnDataTable, {
			propsData: {
				rows,
				columns,
				rowAttributes: (row) => ({ 'data-testid': 'my-row', 'data-row-title': row.title }),
			},
			stubs,
		})
		const trs = wrapper.findAll('tbody tr')
		expect(trs.map((tr) => tr.attributes('data-testid'))).toEqual(['my-row', 'my-row'])
		expect(trs.map((tr) => tr.attributes('data-row-title'))).toEqual(['One', 'Two'])
		expect(trs[0].classes()).toContain('cn-table-row')
	})

	it('still emits row-click from a row carrying extra attributes', async () => {
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns, rowAttributes: () => ({ 'data-testid': 'my-row' }) },
			stubs,
		})
		await wrapper.findAll('tbody tr')[1].trigger('click')
		expect(wrapper.emitted('row-click')[0][0]).toEqual(rows[1])
	})
})
