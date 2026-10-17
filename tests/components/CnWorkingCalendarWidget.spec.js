/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWorkingCalendarWidget: one month of a working calendar object, closures
 * from OpenRegister's calendar preview, Add day as one update of the object.
 *
 * @spec openspec/changes/working-calendar-widget/specs/working-calendar-widget/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))

import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnWorkingCalendarWidget from '../../src/components/CnWorkingCalendarWidget/CnWorkingCalendarWidget.vue'
import { fetchReferenceObjects } from '../../src/utils/boardReferenceColumns.js'

const CALENDAR = {
	id: 'cal-1',
	slug: 'default',
	workingWeekdays: [1, 2, 3, 4, 5],
	hoursPerWorkingDay: 8,
	rules: [{ kind: 'fixed', month: 12, day: 25, name: 'Christmas Day' }],
	exceptions: [{ date: '2026-12-24', name: 'Office closed' }],
}

const CONTENT = { calendar: { register: 'flow-timers', schema: 'working-calendar', filter: { slug: 'default' } } }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

async function mountDecember(content = CONTENT) {
	const w = mount(CnWorkingCalendarWidget, {
		props: { content },
		global: { stubs: { NcLoadingIcon: true } },
		attachTo: document.body,
	})
	await flush()
	w.vm.year = 2026
	w.vm.month = 11
	w.vm.focusDate = '2026-12-01'
	await flush()
	return w
}

const day = (w, date) => w.find(`[data-date="${date}"]`)

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.patch.mockReset()
	fetchReferenceObjects.mockReset()
	fetchReferenceObjects.mockResolvedValue([CALENDAR])
	getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
	axios.post.mockImplementation(async (_url, body) => ({
		data: {
			dates: body.year === 2026
				? [{ date: '2026-12-24', name: 'Office closed' }, { date: '2026-12-25', name: 'Christmas Day' }]
				: [],
		},
	}))
	axios.patch.mockImplementation(async (_url, body) => ({ data: { ...CALENDAR, ...body } }))
})

describe('CnWorkingCalendarWidget', () => {
	it('reads the calendar, asks the preview for the year and marks closures, weekends and working days', async () => {
		const w = await mountDecember()
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'flow-timers', schema: 'working-calendar', filter: { slug: 'default' }, limit: 1 })
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flow-timers/calendars/preview', { calendar: CALENDAR, year: 2026 })
		expect(day(w, '2026-12-25').classes()).toContain('cn-working-calendar__day--closed')
		expect(day(w, '2026-12-25').attributes('title')).toBe('Christmas Day')
		expect(day(w, '2026-12-25').attributes('aria-label')).toMatch(/closed: Christmas Day$/)
		expect(day(w, '2026-12-05').classes()).toContain('cn-working-calendar__day--off')
		expect(day(w, '2026-12-07').attributes('aria-label')).toMatch(/working day$/)
		expect(w.findAll('[role="columnheader"]')).toHaveLength(7)
		w.unmount()
	})

	it('moves a month and asks the preview for a new year once', async () => {
		const w = await mountDecember()
		await w.find('[data-testid="cn-working-calendar-next"]').trigger('click')
		await flush()
		expect(w.vm.year).toBe(2027)
		expect(w.vm.month).toBe(0)
		expect(axios.post).toHaveBeenCalledWith(expect.any(String), { calendar: CALENDAR, year: 2027 })
		await w.find('[data-testid="cn-working-calendar-previous"]').trigger('click')
		await flush()
		expect(axios.post.mock.calls.filter(([, body]) => body.year === 2026)).toHaveLength(1)
		w.unmount()
	})

	it('moves focus across the grid with the arrow keys and pages months', async () => {
		const w = await mountDecember()
		const grid = w.find('[data-testid="cn-working-calendar-grid"]')
		await grid.trigger('keydown', { key: 'ArrowDown' })
		expect(w.vm.focusDate).toBe('2026-12-08')
		await grid.trigger('keydown', { key: 'End' })
		expect(w.vm.focusDate).toBe('2026-12-13')
		await grid.trigger('keydown', { key: 'PageDown' })
		expect(w.vm.focusDate).toBe('2027-01-13')
		expect(w.vm.month).toBe(0)
		w.unmount()
	})

	it('adds a day to the exceptions with one update and reads the closures again', async () => {
		const w = await mountDecember()
		await w.find('[data-testid="cn-working-calendar-add"]').trigger('click')
		await w.find('[data-testid="cn-working-calendar-date"]').setValue('2026-12-31')
		await w.find('[data-testid="cn-working-calendar-name"]').setValue('Year end')
		await w.find('[data-testid="cn-working-calendar-form"]').trigger('submit')
		await flush()
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/objects/flow-timers/working-calendar/cal-1', {
			exceptions: [{ date: '2026-12-24', name: 'Office closed' }, { date: '2026-12-31', name: 'Year end' }],
		})
		expect(axios.post.mock.calls.filter(([, body]) => body.year === 2026).length).toBe(2)
		expect(day(w, '2026-12-31').classes()).toContain('cn-working-calendar__day--closed')
		w.unmount()
	})

	it('offers no Add day to a reader who is not an administrator, and shows the added days when the preview refuses', async () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		axios.post.mockRejectedValue({ response: { status: 403 } })
		const w = await mountDecember()
		expect(w.find('[data-testid="cn-working-calendar-add"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-working-calendar-note"]').exists()).toBe(true)
		expect(day(w, '2026-12-24').classes()).toContain('cn-working-calendar__day--closed')
		expect(day(w, '2026-12-25').classes()).not.toContain('cn-working-calendar__day--closed')
		w.unmount()
	})

	it('says so when the server refuses the update', async () => {
		axios.patch.mockRejectedValue({ response: { status: 403 } })
		const w = await mountDecember()
		await w.find('[data-testid="cn-working-calendar-add"]').trigger('click')
		await w.find('[data-testid="cn-working-calendar-date"]').setValue('2026-12-31')
		await w.find('[data-testid="cn-working-calendar-form"]').trigger('submit')
		await flush()
		expect(w.find('[data-testid="cn-working-calendar-save-error"]').text()).toBe('Only an administrator can change the working calendar.')
		w.unmount()
	})
})
