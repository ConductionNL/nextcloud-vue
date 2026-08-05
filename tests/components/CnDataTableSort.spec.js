/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDataTable's multi-column ("shift+click") sort: plain-click
 * single-sort regression, shift+click append/cycle/cap, numbered priority
 * badges, aria-sort placement, and keyboard operability (Enter / Shift+Enter).
 */

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const rows = [
	{ id: 'a', name: 'Charlie', createdAt: '2026-01-01', status: 'open' },
	{ id: 'b', name: 'Alice', createdAt: '2026-02-01', status: 'closed' },
]
const columns = [
	{ key: 'name', label: 'Name', sortable: true },
	{ key: 'createdAt', label: 'Created', sortable: true },
	{ key: 'status', label: 'Status', sortable: true },
]

/**
 * Mount helper.
 *
 * @param {object} propsData Component props.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountTable(propsData) {
	return mount(CnDataTable, {
		propsData: { rows, columns, ...propsData },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

function headerFor(wrapper, label) {
	return wrapper.findAll('th').filter((w) => w.text().includes(label)).at(0)
}

describe('CnDataTable — plain click (single-sort regression)', () => {
	it('plain click on an unsorted table sorts ascending and emits the extended payload', async () => {
		const wrapper = mountTable({})
		await headerFor(wrapper, 'Name').trigger('click')
		const evt = wrapper.emitted('sort')[0][0]
		expect(evt).toEqual({ key: 'name', order: 'asc', keys: [{ key: 'name', order: 'asc' }] })
	})

	it('plain-click legacy contract: key/order alone are byte-identical to the pre-multi-sort shape', async () => {
		const wrapper = mountTable({ sortKey: 'name', sortOrder: 'asc' })
		await headerFor(wrapper, 'Name').trigger('click')
		const { key, order } = wrapper.emitted('sort')[0][0]
		expect({ key, order }).toEqual({ key: 'name', order: 'desc' })
	})

	it('cycles the sole active key asc -> desc -> cleared', async () => {
		const wrapper = mountTable({ sortKey: 'name', sortOrder: 'desc' })
		await headerFor(wrapper, 'Name').trigger('click')
		expect(wrapper.emitted('sort')[0][0]).toEqual({ key: null, order: null, keys: [] })
	})

	it('plain click on a different column collapses an active multi-sort', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }] })
		await headerFor(wrapper, 'Status').trigger('click')
		expect(wrapper.emitted('sort')[0][0]).toEqual({
			key: 'status', order: 'asc', keys: [{ key: 'status', order: 'asc' }],
		})
	})
})

describe('CnDataTable — shift+click multi-sort', () => {
	it('appends a second key without disturbing the first', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }] })
		await headerFor(wrapper, 'Created').trigger('click', { shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('caps at 3 keys: a 4th shift+click on a new column is a no-op', async () => {
		const wrapper = mountTable({
			columns: [...columns, { key: 'owner', label: 'Owner', sortable: true }],
			sortKeys: [
				{ key: 'name', order: 'asc' },
				{ key: 'createdAt', order: 'asc' },
				{ key: 'status', order: 'asc' },
			],
		})
		await headerFor(wrapper, 'Owner').trigger('click', { shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
			{ key: 'status', order: 'asc' },
		])
	})

	it('shift+click cycles a secondary key without touching the primary', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'asc' }] })
		await headerFor(wrapper, 'Created').trigger('click', { shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'desc' },
		])
	})
})

describe('CnDataTable — numbered priority badges', () => {
	it('shows no badge for a single active sort key', () => {
		const wrapper = mountTable({ sortKey: 'name', sortOrder: 'asc' })
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-indicator').exists()).toBe(true)
	})

	it('shows numbered badges once a second key is active', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }] })
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').text()).toBe('1')
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-badge').text()).toBe('2')
		expect(headerFor(wrapper, 'Status').find('.cn-table-sort-badge').exists()).toBe(false)
	})
})

describe('CnDataTable — aria-sort', () => {
	it('sets aria-sort on the primary key only', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'desc' }, { key: 'createdAt', order: 'asc' }] })
		expect(headerFor(wrapper, 'Name').attributes('aria-sort')).toBe('descending')
		expect(headerFor(wrapper, 'Created').attributes('aria-sort')).toBeUndefined()
		expect(headerFor(wrapper, 'Status').attributes('aria-sort')).toBeUndefined()
	})

	it('omits aria-sort entirely when no sort is active', () => {
		const wrapper = mountTable({})
		expect(headerFor(wrapper, 'Name').attributes('aria-sort')).toBeUndefined()
	})
})

describe('CnDataTable — keyboard operability', () => {
	it('Enter on a focused sortable header behaves like a plain click', async () => {
		const wrapper = mountTable({})
		await headerFor(wrapper, 'Name').trigger('keydown.enter')
		expect(wrapper.emitted('sort')[0][0]).toEqual({ key: 'name', order: 'asc', keys: [{ key: 'name', order: 'asc' }] })
	})

	it('Shift+Enter appends a secondary key like shift+click', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }] })
		await headerFor(wrapper, 'Created').trigger('keydown.enter', { shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('sortable headers are focusable (tabindex 0)', () => {
		const wrapper = mountTable({})
		expect(headerFor(wrapper, 'Name').attributes('tabindex')).toBe('0')
	})

	it('a non-sortable header is not focusable and does not emit sort', async () => {
		const wrapper = mountTable({ columns: [{ key: 'name', label: 'Name', sortable: false }] })
		expect(headerFor(wrapper, 'Name').attributes('tabindex')).toBeUndefined()
		await headerFor(wrapper, 'Name').trigger('click')
		expect(wrapper.emitted('sort')).toBeFalsy()
	})
})
