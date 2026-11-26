/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for CnWeekGrid with the real `@nextcloud/vue`
 * components. Each axe scan is paired with a structural assertion axe in
 * jsdom cannot make: headers that name the day and the hour, today not by
 * colour alone, and a focusable, named scroll area.
 *
 * @spec openspec/specs/wcag-a11y-anchor/spec.md
 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnWeekGrid = require('../../src/components/CnWeekGrid/CnWeekGrid.vue').default

const NOW = new Date(2026, 9, 7, 10, 0) // Wednesday 7 October 2026

const props = {
	now: NOW,
	caption: 'Week 41',
	rows: [
		{ key: '1', label: '1st hour', start: '08:30', end: '09:20' },
		{ key: '2', label: '2nd hour', start: '09:20', end: '10:10' },
	],
	items: [
		{ key: 'a', date: '2026-10-05', row: '1', title: 'Maths', meta: 'H4b', href: 'https://example.org/a' },
		{ key: 'b', date: '2026-10-07', row: '2', title: 'History', pill: { label: 'Cancelled', variant: 'cancelled' } },
	],
}

describe('CnWeekGrid: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations', async () => {
		wrapper = mountAttached(CnWeekGrid, { propsData: props })
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations without rows', async () => {
		wrapper = mountAttached(CnWeekGrid, { propsData: { now: NOW, rows: [] } })
		await expectAccessible(wrapper)
	})

	it('names every column by its day and every row by its slot', () => {
		wrapper = mountAttached(CnWeekGrid, { propsData: props })
		expect(wrapper.findAll('th[scope="col"]')).toHaveLength(5)
		expect(wrapper.findAll('th[scope="row"]').map((th) => th.text())).toEqual(['1st hour08:30–09:20', '2nd hour09:20–10:10'])
	})

	it('marks today in words and with aria-current, not by colour alone', () => {
		wrapper = mountAttached(CnWeekGrid, { propsData: props })
		const today = wrapper.find('th[aria-current="date"]')
		expect(today.text()).toContain('today')
	})

	it('lets a keyboard user reach the named scroll area', () => {
		wrapper = mountAttached(CnWeekGrid, { propsData: props })
		const region = wrapper.find('[role="region"]')
		expect(region.attributes('tabindex')).toBe('0')
		expect(region.attributes('aria-label')).toBe('Week 41')
	})
})
