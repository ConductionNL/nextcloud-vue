/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-calendar-view-mode/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnObjectCalendar from '../../src/components/CnObjectCalendar/CnObjectCalendar.vue'

const OBJECTS = [
	{ id: 'a', title: 'A', due: '2026-09-10' },
	{ id: 'b', title: 'B', due: '2026-09-10' },
	{ id: 'c', title: 'C', due: '2026-09-10' },
	{ id: 'd', title: 'D', due: '2026-09-10' },
	{ id: 'e', title: 'E', due: '2026-09-10' },
]

function mountCalendar(props = {}) {
	return mount(CnObjectCalendar, {
		attachTo: document.body,
		propsData: { objects: OBJECTS, dateField: 'due', visibleDate: '2026-09-15', maxEventsPerDay: 3, ...props },
		stubs: { NcButton: true, NcLoadingIcon: true, ChevronLeft: true, ChevronRight: true },
	})
}

const cell = (w, iso) => w.find(`[data-iso="${iso}"]`)

describe('CnObjectCalendar keyboard', () => {
	it('is a grid with one tab stop', () => {
		const w = mountCalendar()
		expect(w.find('[role="grid"]').exists()).toBe(true)
		expect(w.findAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1)
		w.unmount()
	})

	it('moves focus with the arrow keys', async () => {
		const w = mountCalendar()
		await cell(w, '2026-09-15').trigger('keydown', { key: 'ArrowRight' })
		await w.vm.$nextTick()
		expect(document.activeElement.getAttribute('data-iso')).toBe('2026-09-16')
		await cell(w, '2026-09-16').trigger('keydown', { key: 'ArrowDown' })
		await w.vm.$nextTick()
		expect(document.activeElement.getAttribute('data-iso')).toBe('2026-09-23')
		await cell(w, '2026-09-23').trigger('keydown', { key: 'ArrowUp' })
		await w.vm.$nextTick()
		expect(document.activeElement.getAttribute('data-iso')).toBe('2026-09-16')
		w.unmount()
	})

	it('moves to the next month when the arrow leaves the grid', async () => {
		const w = mountCalendar()
		const last = w.vm.monthGrid[w.vm.monthGrid.length - 1].iso
		await cell(w, last).trigger('keydown', { key: 'ArrowRight' })
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		expect(w.emitted('range-change').length).toBeGreaterThan(1)
		expect(w.vm.monthLabel.toLowerCase()).toContain('2026')
		w.unmount()
	})

	it('renders entries and +N as buttons, and +N asks for that day', async () => {
		const w = mountCalendar()
		const day = cell(w, '2026-09-10')
		expect(day.findAll('button.cn-object-calendar__event')).toHaveLength(3)
		const more = day.find('button.cn-object-calendar__overflow')
		expect(more.text()).toBe('+2')
		await more.trigger('click')
		expect(w.emitted('day-select')[0]).toEqual(['2026-09-10'])
		await day.find('button.cn-object-calendar__event').trigger('click')
		expect(w.emitted('object-click')[0][0].id).toBe('a')
		w.unmount()
	})
})
