/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectCalendar: date-range bucketing (an object appears only
 * on/around its `dateField`), `endDateField` spanning across multiple days
 * (REQ-VIEW-CAL-04), month navigation, and the `range-change` emission the
 * host uses to re-fetch.
 */
import { mount } from '@vue/test-utils'
import CnObjectCalendar from '../../src/components/CnObjectCalendar/CnObjectCalendar.vue'

function mountCalendar(propsData) {
	return mount(CnObjectCalendar, { propsData })
}

describe('CnObjectCalendar — plotting by dateField', () => {
	it('places an object on its dateField day only (no endDateField)', () => {
		const objects = [{ id: '1', dueDate: '2026-07-15', title: 'Task' }]
		const wrapper = mountCalendar({ objects, dateField: 'dueDate', visibleDate: '2026-07-10' })

		const day15 = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-15')
		const day16 = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-16')
		expect(day15.objects.map((o) => o.id)).toEqual(['1'])
		expect(day16.objects.map((o) => o.id)).toEqual([])
	})

	it('only plots objects whose dateField falls within the visible grid range', () => {
		const objects = [
			{ id: 'in-range', dueDate: '2026-07-15' },
			{ id: 'next-month', dueDate: '2026-08-20' },
		]
		const wrapper = mountCalendar({ objects, dateField: 'dueDate', visibleDate: '2026-07-01' })
		const allPlotted = wrapper.vm.monthGrid.flatMap((d) => d.objects.map((o) => o.id))
		expect(allPlotted).toContain('in-range')
		expect(allPlotted).not.toContain('next-month')
	})

	it('spans an object across every day from dateField to endDateField inclusive', () => {
		const objects = [{ id: 'trip', startDate: '2026-07-10', endDate: '2026-07-13', title: 'Trip' }]
		const wrapper = mountCalendar({
			objects,
			dateField: 'startDate',
			endDateField: 'endDate',
			visibleDate: '2026-07-01',
		})

		for (const iso of ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13']) {
			const day = wrapper.vm.monthGrid.find((d) => d.iso === iso)
			expect(day.objects.map((o) => o.id)).toEqual(['trip'])
		}
		const dayBefore = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-09')
		const dayAfter = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-14')
		expect(dayBefore.objects).toEqual([])
		expect(dayAfter.objects).toEqual([])
	})

	it('ignores endDateField when it is before dateField (treats it as a single-day event)', () => {
		const objects = [{ id: 'bad-range', startDate: '2026-07-10', endDate: '2026-07-05' }]
		const wrapper = mountCalendar({
			objects,
			dateField: 'startDate',
			endDateField: 'endDate',
			visibleDate: '2026-07-01',
		})
		const day10 = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-10')
		const day5 = wrapper.vm.monthGrid.find((d) => d.iso === '2026-07-05')
		expect(day10.objects.map((o) => o.id)).toEqual(['bad-range'])
		expect(day5.objects).toEqual([])
	})

	it('skips objects with an unparsable dateField', () => {
		const objects = [{ id: 'broken', dueDate: 'not-a-date' }]
		const wrapper = mountCalendar({ objects, dateField: 'dueDate', visibleDate: '2026-07-01' })
		const allPlotted = wrapper.vm.monthGrid.flatMap((d) => d.objects.map((o) => o.id))
		expect(allPlotted).not.toContain('broken')
	})
})

describe('CnObjectCalendar — range-change + navigation', () => {
	it('emits range-change on mount with the grid window (padded to whole weeks)', () => {
		const wrapper = mountCalendar({ objects: [], dateField: 'dueDate', visibleDate: '2026-07-15' })
		expect(wrapper.emitted('range-change')).toBeTruthy()
		const [{ rangeStart, rangeEnd }] = wrapper.emitted('range-change')[0]
		// July 2026: 1st is a Wednesday → grid starts Sun 2026-06-28.
		expect(rangeStart).toBe('2026-06-28')
		expect(rangeEnd >= '2026-07-31').toBe(true)
	})

	it('goToNextMonth advances the month, emits update:visibleDate and a new range-change', async () => {
		const wrapper = mountCalendar({ objects: [], dateField: 'dueDate', visibleDate: '2026-07-15' })
		wrapper.vm.goToNextMonth()
		await wrapper.vm.$nextTick()

		expect(wrapper.emitted('update:visibleDate')).toBeTruthy()
		const events = wrapper.emitted('range-change')
		const last = events[events.length - 1][0]
		expect(last.rangeStart >= '2026-07-26').toBe(true) // now in August's grid
	})

	it('goToPreviousMonth moves back a month', async () => {
		const wrapper = mountCalendar({ objects: [], dateField: 'dueDate', visibleDate: '2026-07-15' })
		wrapper.vm.goToPreviousMonth()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.internalDate.getMonth()).toBe(5) // June (0-indexed)
	})

	it('emits object-click with the clicked object', () => {
		const object = { id: '1', dueDate: '2026-07-15', title: 'Task' }
		const wrapper = mountCalendar({ objects: [object], dateField: 'dueDate', visibleDate: '2026-07-10' })
		wrapper.vm.onObjectClick(object)
		expect(wrapper.emitted('object-click')).toBeTruthy()
		expect(wrapper.emitted('object-click')[0]).toEqual([object])
	})
})
