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
			key: 'status',
			order: 'asc',
			keys: [{ key: 'status', order: 'asc' }],
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

	it('shows no badge for a single rendered key plus a key whose column is not rendered', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'createdAt', order: 'desc' }, { key: '_uuid', order: 'asc' }] })
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('desc')
	})

	it('shows no badge for a single rendered key in a one-entry sortKeys list', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }] })
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('asc')
	})

	it('numbers rendered keys without a gap when a hidden key sits between them', () => {
		const wrapper = mountTable({
			sortKeys: [
				{ key: 'name', order: 'asc' },
				{ key: '_uuid', order: 'asc' },
				{ key: 'status', order: 'desc' },
			],
		})
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').text()).toBe('1')
		expect(headerFor(wrapper, 'Status').find('.cn-table-sort-badge').text()).toBe('2')
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('asc')
		expect(headerFor(wrapper, 'Status').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('desc')
	})

	it('drops and restores badges as a sorted column leaves and returns', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }] })
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').text()).toBe('1')
		await wrapper.setProps({ columns: columns.filter((c) => c.key !== 'createdAt') })
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('asc')
		await wrapper.setProps({ columns })
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').text()).toBe('1')
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-badge').text()).toBe('2')
	})

	it('does not count a sort key whose column is not sortable', () => {
		const wrapper = mountTable({
			columns: [columns[0], { key: 'createdAt', label: 'Created', sortable: false }, columns[2]],
			sortKeys: [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }],
		})
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('asc')
	})

	it('counts a duplicated key once', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }, { key: 'name', order: 'desc' }] })
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
	})

	it('keeps a hidden key in the sort payload', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'createdAt', order: 'desc' }, { key: '_uuid', order: 'asc' }] })
		await headerFor(wrapper, 'Name').trigger('click', { shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'createdAt', order: 'desc' },
			{ key: '_uuid', order: 'asc' },
			{ key: 'name', order: 'asc' },
		])
	})
})

describe('CnDataTable — aria-sort', () => {
	it('sets aria-sort on the primary key only', () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'desc' }, { key: 'createdAt', order: 'asc' }] })
		expect(headerFor(wrapper, 'Name').attributes('aria-sort')).toBe('descending')
		expect(headerFor(wrapper, 'Created').attributes('aria-sort')).toBeUndefined()
		expect(headerFor(wrapper, 'Status').attributes('aria-sort')).toBeUndefined()
	})

	it('sets aria-sort on the first rendered key when the primary key is not rendered', () => {
		const wrapper = mountTable({ sortKeys: [{ key: '_uuid' }, { key: 'createdAt', order: 'desc' }] })
		expect(wrapper.find('.cn-table-sort-badge').exists()).toBe(false)
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('desc')
		expect(headerFor(wrapper, 'Created').attributes('aria-sort')).toBe('descending')
		expect(wrapper.findAll('th[aria-sort]').length).toBe(1)
	})

	it('sets aria-sort on the first rendered key and numbers the rendered keys after a hidden primary', () => {
		const wrapper = mountTable({
			sortKeys: [
				{ key: '_uuid', order: 'asc' },
				{ key: 'status', order: 'asc' },
				{ key: 'name', order: 'desc' },
			],
		})
		expect(headerFor(wrapper, 'Status').attributes('aria-sort')).toBe('ascending')
		expect(wrapper.findAll('th[aria-sort]').length).toBe(1)
		expect(headerFor(wrapper, 'Status').find('.cn-table-sort-badge').text()).toBe('1')
		expect(headerFor(wrapper, 'Name').find('.cn-table-sort-badge').text()).toBe('2')
		expect(headerFor(wrapper, 'Created').find('.cn-table-sort-badge').exists()).toBe(false)
	})

	it('omits aria-sort entirely when no sort is active', () => {
		const wrapper = mountTable({})
		expect(headerFor(wrapper, 'Name').attributes('aria-sort')).toBeUndefined()
	})
})

describe('CnDataTable — keyboard operability', () => {
	it('Enter on a focused sortable header behaves like a plain click', async () => {
		const wrapper = mountTable({})
		// VTU v2's `trigger('keydown.enter')` synthesises `key: 'enter'` — the
		// lowercase MODIFIER name, which no browser ever emits — and that value
		// overrides an explicit `key` option. Vue 3's `withKeys` hyphenates, so
		// the handler still fires, but `onHeaderKeydown`'s `event.key ===
		// 'Enter'` guard (matching the real DOM value) rejects it. Trigger a
		// plain `keydown` with the browser-accurate `key` instead.
		await headerFor(wrapper, 'Name').trigger('keydown', { key: 'Enter' })
		expect(wrapper.emitted('sort')[0][0]).toEqual({ key: 'name', order: 'asc', keys: [{ key: 'name', order: 'asc' }] })
	})

	it('Shift+Enter appends a secondary key like shift+click', async () => {
		const wrapper = mountTable({ sortKeys: [{ key: 'name', order: 'asc' }] })
		// See above — browser-accurate `key: 'Enter'`, not VTU's `'enter'`.
		await headerFor(wrapper, 'Created').trigger('keydown', { key: 'Enter', shiftKey: true })
		expect(wrapper.emitted('sort')[0][0].keys).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('a sortable header holds a real sort button named by its label, and the header itself is not a tab stop', () => {
		const wrapper = mountTable({})
		const button = headerFor(wrapper, 'Name').find('[data-testid="cn-table-header-sort"]')
		expect(button.element.tagName).toBe('BUTTON')
		expect(button.attributes('type')).toBe('button')
		expect(button.text()).toBe('Name')
		expect(headerFor(wrapper, 'Name').attributes('tabindex')).toBeUndefined()
	})

	it('a click on the sort button sorts once', async () => {
		const wrapper = mountTable({})
		await headerFor(wrapper, 'Name').find('[data-testid="cn-table-header-sort"]').trigger('click')
		expect(wrapper.emitted('sort')).toHaveLength(1)
		expect(wrapper.emitted('sort')[0][0]).toMatchObject({ key: 'name', order: 'asc' })
	})

	it('Enter on the sort button sorts once and suppresses the native click', async () => {
		const wrapper = mountTable({})
		const button = headerFor(wrapper, 'Name').find('[data-testid="cn-table-header-sort"]')
		const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
		button.element.dispatchEvent(event)
		await wrapper.vm.$nextTick()
		expect(event.defaultPrevented).toBe(true)
		expect(wrapper.emitted('sort')).toHaveLength(1)
	})

	it('a non-sortable header has no sort button, no chevron, and does not emit sort', async () => {
		const wrapper = mountTable({ columns: [{ key: 'name', label: 'Name', sortable: false }] })
		expect(headerFor(wrapper, 'Name').find('[data-testid="cn-table-header-sort"]').exists()).toBe(false)
		expect(headerFor(wrapper, 'Name').find('.cn-table-header__chevron').exists()).toBe(false)
		await headerFor(wrapper, 'Name').trigger('click')
		expect(wrapper.emitted('sort')).toBeFalsy()
	})
})

describe('CnDataTable — sort chevrons', () => {
	it('an unsorted sortable column shows a pale chevron and no aria-sort', () => {
		const wrapper = mountTable({})
		const header = headerFor(wrapper, 'Name')
		expect(header.find('.cn-table-header__chevron--idle').exists()).toBe(true)
		expect(header.find('.cn-table-sort-indicator').exists()).toBe(false)
		expect(header.attributes('aria-sort')).toBeUndefined()
	})

	it('the sorted column shows the direction instead of the pale chevron, with aria-sort', () => {
		const asc = mountTable({ sortKey: 'name', sortOrder: 'asc' })
		expect(headerFor(asc, 'Name').find('.cn-table-header__chevron--idle').exists()).toBe(false)
		expect(headerFor(asc, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('asc')
		expect(headerFor(asc, 'Name').attributes('aria-sort')).toBe('ascending')
		expect(headerFor(asc, 'Created').find('.cn-table-header__chevron--idle').exists()).toBe(true)

		const desc = mountTable({ sortKey: 'name', sortOrder: 'desc' })
		expect(headerFor(desc, 'Name').find('.cn-table-sort-indicator').attributes('data-sort-direction')).toBe('desc')
		expect(headerFor(desc, 'Name').attributes('aria-sort')).toBe('descending')
	})

	it('keeps the chevron icons out of the accessible name', () => {
		const wrapper = mountTable({ sortKey: 'name', sortOrder: 'asc' })
		const icons = headerFor(wrapper, 'Name').findAll('.cn-table-header__chevron .material-design-icon')
		expect(icons.length).toBe(1)
		expect(icons[0].attributes('aria-hidden')).toBe('true')
	})
})
