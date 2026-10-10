/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Header sorting and filtering on CnDataTable: object-form manifest columns
 * sort by default, and a filterable header opens a panel whose state goes out
 * as the query parameters the facet sidebar uses.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path, params) => `/index.php${path.replace(/\{(\w+)\}/g, (_, k) => params[k])}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const schema = {
	properties: {
		title: { type: 'string', title: 'Title' },
		status: { type: 'string', enum: ['open', 'won'], 'x-enum-labels': { open: 'Open', won: 'Won' } },
		value: { type: 'number', title: 'Value' },
		client: { type: 'string', $ref: 'client' },
	},
}
const columns = [
	{ key: 'title', label: 'Title' },
	{ key: 'status', label: 'Status' },
	{ key: 'value', label: 'Value', filterable: false },
	{ key: 'client', label: 'Client' },
	{ key: 'openDeals', label: 'Open deals', widget: 'badge' },
]
const rows = [{ id: 'a', title: 'Deal', status: 'open', value: 5, client: 'c1' }]

function mountTable(props = {}) {
	return mount(CnDataTable, {
		props: { rows, columns, schema, filterable: true, filterRegister: 'pipelinq', ...props },
		global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } } },
		attachTo: document.body,
	})
}

const headerFor = (wrapper, label) => wrapper.findAll('th').find((w) => w.text().includes(label))

describe('CnDataTable header sorting', () => {
	it('sorts an object-form manifest column with no sortable flag, and not a widget column without a property', () => {
		const wrapper = mountTable({ filterable: false })
		expect(headerFor(wrapper, 'Title').classes()).toContain('cn-table-header--sortable')
		expect(headerFor(wrapper, 'Open deals').classes()).not.toContain('cn-table-header--sortable')
	})

	it('emits sort for such a column', async () => {
		const wrapper = mountTable({ filterable: false })
		await headerFor(wrapper, 'Title').trigger('click')
		expect(wrapper.emitted('sort')[0][0]).toMatchObject({ key: 'title', order: 'asc' })
	})
})

describe('CnDataTable header filters', () => {
	it('puts the filter button beside the sort button, not inside it, and a click on it does not sort', async () => {
		const wrapper = mountTable()
		const header = headerFor(wrapper, 'Status')
		const sort = header.find('[data-testid="cn-table-header-sort"]')
		const filter = header.find('[data-testid="cn-table-header-filter"]')
		expect(sort.exists()).toBe(true)
		expect(sort.find('[data-testid="cn-table-header-filter"]').exists()).toBe(false)
		expect(filter.element.tagName).toBe('BUTTON')
		await filter.trigger('click')
		expect(wrapper.emitted('sort')).toBeUndefined()
		wrapper.unmount()
	})

	beforeEach(() => {
		axios.get.mockReset()
	})

	it('puts a labelled filter button on each filterable column only', () => {
		const wrapper = mountTable()
		expect(headerFor(wrapper, 'Status').find('[data-testid="cn-table-header-filter"]').attributes('aria-label')).toBe('Filter by Status')
		expect(headerFor(wrapper, 'Value').find('[data-testid="cn-table-header-filter"]').exists()).toBe(false)
		expect(headerFor(wrapper, 'Open deals').find('[data-testid="cn-table-header-filter"]').exists()).toBe(false)
	})

	it('shows no filter buttons when the table is not filterable', () => {
		const wrapper = mountTable({ filterable: false })
		expect(wrapper.find('[data-testid="cn-table-header-filter"]').exists()).toBe(false)
	})

	it('opening the filter does not sort the column', async () => {
		const wrapper = mountTable()
		await headerFor(wrapper, 'Status').find('[data-testid="cn-table-header-filter"]').trigger('click')
		expect(wrapper.emitted('sort')).toBeUndefined()
		expect(document.querySelector('[data-testid="cn-column-filter"]')).not.toBeNull()
		wrapper.unmount()
	})

	it('applies an enum filter as the sidebar\'s parameter and closes the panel', async () => {
		const wrapper = mountTable()
		await headerFor(wrapper, 'Status').find('[data-testid="cn-table-header-filter"]').trigger('click')
		const options = document.querySelectorAll('[data-testid="cn-column-filter-option"]')
		expect([...options].map((o) => o.parentElement.textContent.trim())).toEqual(['Open', 'Won'])
		options[1].click()
		document.querySelector('[data-testid="cn-column-filter-apply"]').click()
		await flushPromises()
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'status', params: { status: ['won'] } })
		expect(document.querySelector('[data-testid="cn-column-filter"]')).toBeNull()
		wrapper.unmount()
	})

	// @spec openspec/changes/header-filter-contains/specs/cn-data-table/spec.md#requirement-a-text-header-filter-matches-on-contains
	it('a text filter says Contains and applies as title[like]', async () => {
		const wrapper = mountTable()
		await headerFor(wrapper, 'Title').find('[data-testid="cn-table-header-filter"]').trigger('click')
		const input = document.querySelector('[data-testid="cn-column-filter-text"]')
		expect(input.closest('label').textContent).toContain('Contains')
		input.value = ' acme '
		input.dispatchEvent(new Event('input'))
		document.querySelector('[data-testid="cn-column-filter-apply"]').click()
		await flushPromises()
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'title', params: { 'title[like]': ['acme'] } })
		wrapper.unmount()
	})

	it('does not show an exact sidebar filter as the text header filter', () => {
		const wrapper = mountTable({ activeFilters: { title: ['Acme'] } })
		const button = headerFor(wrapper, 'Title').find('[data-testid="cn-table-header-filter"]')
		expect(button.attributes('aria-label')).toBe('Filter by Title')
		wrapper.unmount()
	})

	it('Escape closes the panel without applying and returns focus to the button', async () => {
		const wrapper = mountTable()
		const button = headerFor(wrapper, 'Status').find('[data-testid="cn-table-header-filter"]')
		await button.trigger('click')
		const panel = document.querySelector('[data-testid="cn-column-filter"]')
		panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		await flushPromises()
		expect(document.querySelector('[data-testid="cn-column-filter"]')).toBeNull()
		expect(wrapper.emitted('column-filter')).toBeUndefined()
		expect(document.activeElement).toBe(button.element)
		wrapper.unmount()
	})

	it('marks an active filter on the header and as a removable chip', async () => {
		const wrapper = mountTable({ activeFilters: { status: ['open'] } })
		const button = headerFor(wrapper, 'Status').find('[data-testid="cn-table-header-filter"]')
		expect(button.attributes('aria-label')).toBe('Filter by Status, active')
		expect(button.classes()).toContain('cn-table-header__filter--active')
		expect(button.find('[data-testid="cn-table-header-filter-dot"]').exists()).toBe(true)
		expect(headerFor(wrapper, 'Title').find('[data-testid="cn-table-header-filter-dot"]').exists()).toBe(false)
		const chips = wrapper.find('[data-testid="cn-table-filter-chips"]')
		expect(chips.text()).toContain('Status: Open')
		await chips.find('[data-testid="cn-table-filter-chip-remove"]').trigger('click')
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'status', params: { status: [] } })
	})

	it('a reference filter searches the referenced objects and filters on their id', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ '@self': { id: 'c1' }, name: 'Acme' }, { '@self': { id: 'c2' }, name: 'Globex' }] } })
		const wrapper = mountTable()
		await headerFor(wrapper, 'Client').find('[data-testid="cn-table-header-filter"]').trigger('click')
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/pipelinq/client', { params: { _limit: 50 } })
		const options = document.querySelectorAll('[data-testid="cn-column-filter-option"]')
		expect([...options].map((o) => o.parentElement.textContent.trim())).toEqual(['Acme', 'Globex'])
		options[0].click()
		document.querySelector('[data-testid="cn-column-filter-apply"]').click()
		await flushPromises()
		expect(wrapper.emitted('column-filter')[0][0]).toEqual({ key: 'client', params: { client: ['c1'] } })
		wrapper.unmount()
	})
})
