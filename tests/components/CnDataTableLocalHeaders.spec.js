/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDataTable `localHeaders`: a table that holds all its rows (a settings
 * table read from an app endpoint) sorts and filters them from its own
 * headers, in the browser, without a host keeping the state. Boards
 * PqBeheerKassa and PqBeheerMarketing draw "Actief ▾" / "Standaard ▾".
 *
 * @spec openspec/changes/data-table-local-headers/specs/cn-data-table/spec.md#requirement-a-table-can-sort-and-filter-the-rows-it-holds
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const { mount, flushPromises } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const schema = {
	properties: {
		name: { type: 'string', title: 'Name' },
		kind: { type: 'string', enum: ['smtp', 'api'] },
		isActive: { type: 'boolean', title: 'Active' },
	},
}
const columns = [
	{ key: 'name', label: 'Name' },
	{ key: 'kind', label: 'Kind' },
	{ key: 'isActive', label: 'Active' },
]
const rows = [
	{ id: '1', name: 'Pin', kind: 'api', isActive: true },
	{ id: '2', name: 'Contant', kind: 'smtp', isActive: false },
	{ id: '3', name: 'Bon', kind: 'api', isActive: true },
]

function mountTable(props = {}) {
	return mount(CnDataTable, {
		props: { rows, columns, schema, filterable: true, localHeaders: true, ...props },
		global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ String(value) }}</span>' } } },
		attachTo: document.body,
	})
}

const headerFor = (wrapper, label) => wrapper.findAll('th').find((w) => w.text().includes(label))
const names = (wrapper) => wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[0].text())

describe('CnDataTable localHeaders', () => {
	it('sorts the rows it holds from a header click, and shows the sort', async () => {
		const wrapper = mountTable()
		await headerFor(wrapper, 'Name').trigger('click')
		expect(names(wrapper)).toEqual(['Bon', 'Contant', 'Pin'])
		expect(headerFor(wrapper, 'Name').attributes('aria-sort')).toBe('ascending')
		await headerFor(wrapper, 'Name').trigger('click')
		expect(names(wrapper)).toEqual(['Pin', 'Contant', 'Bon'])
		expect(wrapper.emitted('sort')).toHaveLength(2)
		wrapper.unmount()
	})

	it('filters the rows it holds from a header filter, and clears it from the chip', async () => {
		const wrapper = mountTable()
		await headerFor(wrapper, 'Kind').find('[data-testid="cn-table-header-filter"]').trigger('click')
		document.querySelectorAll('[data-testid="cn-column-filter-option"]')[0].click()
		document.querySelector('[data-testid="cn-column-filter-apply"]').click()
		await flushPromises()
		expect(names(wrapper)).toEqual(['Contant'])
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'kind', params: { kind: ['smtp'] } })
		await wrapper.find('[data-testid="cn-table-filter-chip-remove"]').trigger('click')
		await flushPromises()
		expect(names(wrapper)).toEqual(['Pin', 'Contant', 'Bon'])
		wrapper.unmount()
	})

	it('leaves the rows as given without it: the host owns sort and filter', async () => {
		const wrapper = mountTable({ localHeaders: false })
		await headerFor(wrapper, 'Name').trigger('click')
		expect(names(wrapper)).toEqual(['Pin', 'Contant', 'Bon'])
		wrapper.unmount()
	})
})
