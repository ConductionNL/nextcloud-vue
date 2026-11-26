/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnWeekGrid: day columns, slot rows, entries in their cell, change pills,
 * today, the empty week, links and buttons, and week navigation.
 *
 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-the-week-grid-navigates-by-week
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnWeekGrid from '../../src/components/CnWeekGrid/CnWeekGrid.vue'
import { CnWeekGrid as FromBarrel } from '../../src/index.js'

// Wednesday 7 October 2026. The week runs Monday 5 to Friday 9.
const NOW = new Date(2026, 9, 7, 10, 0)

const ROWS = [
	{ key: '1', label: '1st hour', start: '08:30', end: '09:20' },
	{ key: '2', label: '2nd hour', start: '09:20', end: '10:10' },
]

const ITEMS = [
	{ key: 'a', date: '2026-10-05', row: '1', title: 'Maths', meta: ['H4b', 'room 12'] },
	{ key: 'b', date: '2026-10-07', row: '2', title: 'English', meta: 'H4a', pill: { label: 'Room 14', variant: 'changed' }, href: '/apps/learniq/lessons/b' },
	{ key: 'c', date: '2026-10-09', row: '1', title: 'History', pill: { label: 'Cancelled', variant: 'cancelled' } },
	{ key: 'd', date: '2026-10-12', row: '1', title: 'Next week' },
	{ key: 'e', date: '2026-10-06', row: '9', title: 'No such slot' },
	{ key: 'f', date: '2026-10-06', row: '1', title: '' },
]

/**
 * Mount the grid at NOW.
 *
 * @param {object} props Extra props.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function grid(props = {}) {
	return mount(CnWeekGrid, { props: { now: NOW, rows: ROWS, items: ITEMS, ...props } })
}

/**
 * The cell of a row and a day.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper The grid.
 * @param {string} row The row key.
 * @param {string} day The day key.
 * @return {import('@vue/test-utils').DOMWrapper}
 */
function cell(wrapper, row, day) {
	return wrapper.find(`tr[data-row="${row}"] td[data-day="${day}"]`)
}

describe('CnWeekGrid', () => {
	it('is exported from the library entry', () => {
		expect(FromBarrel).toBe(CnWeekGrid)
	})

	it('draws Monday to Friday as column headers and the slots as row headers', () => {
		const wrapper = grid()
		const days = wrapper.findAll('thead th[scope="col"]').map((th) => th.attributes('data-day'))
		expect(days).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
		const rows = wrapper.findAll('tbody th[scope="row"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].text()).toContain('1st hour')
		expect(rows[0].text()).toContain('08:30–09:20')
	})

	it('draws the whole week with days: 7', () => {
		const wrapper = grid({ days: 7 })
		expect(wrapper.findAll('thead th[scope="col"]')).toHaveLength(7)
	})

	it('puts each entry in the cell of its day and slot, with its meta joined', () => {
		const wrapper = grid()
		const monday = cell(wrapper, '1', '2026-10-05')
		expect(monday.text()).toContain('Maths')
		expect(monday.text()).toContain('H4b, room 12')
		expect(cell(wrapper, '2', '2026-10-07').text()).toContain('English')
		expect(cell(wrapper, '1', '2026-10-07').text()).toBe('')
	})

	it('leaves out an entry of another week, of an unknown slot or without a title', () => {
		const wrapper = grid()
		const titles = wrapper.findAll('[data-testid="cn-week-grid-item"]').map((item) => item.find('.cn-week-grid__title').text())
		// Row by row: the first hour (Monday, Friday), then the second (Wednesday).
		expect(titles).toEqual(['Maths', 'History', 'English'])
	})

	it('draws a change pill with its variant, falling back to changed', () => {
		const wrapper = grid({ items: [...ITEMS, { key: 'g', date: '2026-10-08', row: '2', title: 'Art', pill: { label: 'Other', variant: 'odd' } }] })
		const pills = wrapper.findAll('[data-testid="cn-week-grid-pill"]')
		expect(pills.map((pill) => pill.text())).toEqual(['Cancelled', 'Room 14', 'Other'])
		expect(pills[0].classes()).toContain('cn-week-grid__pill--cancelled')
		expect(pills[2].classes()).toContain('cn-week-grid__pill--changed')
	})

	it('marks today in the header and its cells', () => {
		const wrapper = grid()
		const today = wrapper.find('thead th[data-day="2026-10-07"]')
		expect(today.attributes('aria-current')).toBe('date')
		expect(today.classes()).toContain('cn-week-grid__day--today')
		expect(cell(wrapper, '1', '2026-10-07').classes()).toContain('cn-week-grid__cell--today')
		expect(wrapper.findAll('[aria-current="date"]')).toHaveLength(1)
	})

	it('marks no day in another week', () => {
		const wrapper = grid({ week: '2026-10-14' })
		expect(wrapper.findAll('[aria-current="date"]')).toHaveLength(0)
		expect(wrapper.find('thead th[scope="col"]').attributes('data-day')).toBe('2026-10-12')
		expect(cell(wrapper, '1', '2026-10-12').text()).toContain('Next week')
	})

	it('makes an entry with href a link and one without a button, and emits item-click with the entry', async () => {
		const wrapper = grid()
		const maths = cell(wrapper, '1', '2026-10-05').find('[data-testid="cn-week-grid-item"]')
		const english = cell(wrapper, '2', '2026-10-07').find('[data-testid="cn-week-grid-item"]')
		expect(maths.element.tagName).toBe('BUTTON')
		expect(english.element.tagName).toBe('A')
		expect(english.attributes('href')).toBe('/apps/learniq/lessons/b')
		await maths.trigger('click')
		expect(wrapper.emitted('item-click')[0][0]).toEqual(ITEMS[0])
	})

	it('drops an unsafe href', () => {
		const wrapper = grid({ items: [{ key: 'x', date: '2026-10-05', row: '1', title: 'X', href: 'javascript:alert(1)' }] })
		expect(wrapper.find('[data-testid="cn-week-grid-item"]').element.tagName).toBe('BUTTON')
	})

	it('lets the item slot draw an entry', () => {
		const wrapper = mount(CnWeekGrid, {
			props: { now: NOW, rows: ROWS, items: ITEMS.slice(0, 1) },
			slots: { item: ({ item }) => h('em', { class: 'own' }, `${item.title}!`) },
		})
		expect(wrapper.find('.own').text()).toBe('Maths!')
	})

	it('says so when there are no rows, with its own text when given', () => {
		expect(grid({ rows: [] }).find('.cn-week-grid__empty').text()).toBe('Nothing planned this week')
		expect(grid({ rows: [], emptyText: 'No lessons' }).find('.cn-week-grid__empty').text()).toBe('No lessons')
	})

	it('shows the loading state instead of the table', () => {
		const wrapper = grid({ loading: true })
		expect(wrapper.find('table').exists()).toBe(false)
		expect(wrapper.find('[role="status"]').exists()).toBe(true)
	})

	it('names the scroll region and the table by the caption', () => {
		const wrapper = grid({ caption: 'Week 41' })
		expect(wrapper.find('caption').text()).toBe('Week 41')
		expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Week 41')
		expect(grid().find('[role="region"]').attributes('aria-label')).toBe('Week timetable')
	})

	it('emits week-change with the Monday of the previous, current and next week', async () => {
		const wrapper = grid({ week: '2026-10-14' })
		await wrapper.find('[data-testid="cn-week-grid-previous"]').trigger('click')
		await wrapper.find('[data-testid="cn-week-grid-next"]').trigger('click')
		await wrapper.find('[data-testid="cn-week-grid-current"]').trigger('click')
		const asked = wrapper.emitted('week-change').map(([date]) => date.toDateString())
		expect(asked).toEqual([
			new Date(2026, 9, 5).toDateString(),
			new Date(2026, 9, 19).toDateString(),
			new Date(2026, 9, 5).toDateString(),
		])
	})

	it('disables "This week" on the current week and hides navigation when asked', () => {
		expect(grid().find('[data-testid="cn-week-grid-current"]').attributes('disabled')).toBeDefined()
		expect(grid({ navigation: false }).find('.cn-week-grid__nav').exists()).toBe(false)
	})
})
