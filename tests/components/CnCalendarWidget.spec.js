/**
 * Tests for the `calendar` dashboard widget renderer (cn-widget-library).
 *
 * Covers the empty-agenda state when no calendar source is wired, and the
 * self-registering registry entry being present after importing the index.
 */

import { mount } from '@vue/test-utils'
import CnCalendarWidget from '@/components/CnCalendarWidget/CnCalendarWidget.vue'

describe('CnCalendarWidget renderer', () => {
	it('shows the empty state when no data source is available', () => {
		const wrapper = mount(CnCalendarWidget, { propsData: { content: {} } })
		const state = wrapper.find('.cn-calendar-widget__state')
		expect(state.exists()).toBe(true)
		expect(state.text()).toContain('No calendar available')
	})

	it('shows the no-events empty state when the source returns no events', async () => {
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue({ events: [], failures: [] }) }
		const wrapper = mount(CnCalendarWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		expect(dataSource.fetchEvents).toHaveBeenCalled()
		expect(wrapper.find('.cn-calendar-widget__state').text()).toContain('No events')
	})

	it('says no calendar is chosen, rather than claiming the diary is empty', async () => {
		// The host skips the fetch entirely when both source lists are empty
		// (LaunchPad's CalendarWidgetService guards each branch with `!== []`),
		// so an unconfigured widget returns zero events AND zero failures. That
		// is indistinguishable from a genuinely empty week, and the registry's
		// own defaultContent for this type is `internalCalendars: []`, so every
		// freshly added Calendar widget starts here.
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue({ events: [], failures: [] }) }
		const wrapper = mount(CnCalendarWidget, {
			propsData: { content: { internalCalendars: [], externalIcsUrls: [] }, dataSource },
		})
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()

		const text = wrapper.find('.cn-calendar-widget__state').text()
		expect(text).toContain('No calendar is selected yet')
		// The false statement it replaces must be gone, not merely joined.
		expect(text).not.toContain('No events')
	})

	it('goes back to the no-events message once a calendar is chosen', async () => {
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue({ events: [], failures: [] }) }
		const wrapper = mount(CnCalendarWidget, {
			propsData: { content: { internalCalendars: ['1'], externalIcsUrls: [] }, dataSource },
		})
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()

		const text = wrapper.find('.cn-calendar-widget__state').text()
		expect(text).toContain('No events')
		expect(text).not.toContain('No calendar is selected yet')
	})

	it('leaves a widget driven by dataSource alone on the ordinary empty message', async () => {
		// A host that passes no content blob has not "chosen no calendar" — it
		// is not using the content-driven configuration at all, and hijacking
		// its empty state would be a regression for every such consumer.
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue({ events: [], failures: [] }) }
		const wrapper = mount(CnCalendarWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-calendar-widget__state').text()).toContain('No events')
	})

	it('renders an agenda row from a supplied dataSource', async () => {
		const dataSource = {
			fetchEvents: jest.fn().mockResolvedValue({
				events: [{ uid: 'e1', title: 'Standup', start: new Date().toISOString() }],
				failures: [],
			}),
		}
		const wrapper = mount(CnCalendarWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Standup')
	})
})

describe('CnCalendarWidget mode toggle', () => {
	it('pairs the light primary background of the active mode with its own text colour', () => {
		const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnCalendarWidget/CnCalendarWidget.vue'), 'utf8')
		const start = source.indexOf('.cn-calendar-widget__mode-btn.is-active {')
		const rule = source.slice(start, source.indexOf('}', start))
		expect(rule).toContain('background: var(--color-primary-element-light,')
		expect(rule).toContain('color: var(--color-primary-element-light-text,')
	})
})

describe('calendar registry registration', () => {
	it('registers the calendar type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnCalendarWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('calendar')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({ viewMode: 'agenda' })
	})
})

describe('CnCalendarWidget agenda times, failed sources and slow loads', () => {
	/**
	 * Mount with a source answering `payload` and let the fetch settle.
	 *
	 * @param {object} payload The source's answer.
	 * @param {object} content The widget content.
	 * @return {Promise<object>} The wrapper.
	 */
	async function mountWith(payload, content = {}) {
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue(payload) }
		const wrapper = mount(CnCalendarWidget, { propsData: { content, dataSource } })
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		return wrapper
	}

	it('shows an agenda row\'s start and end time', async () => {
		const start = new Date()
		start.setHours(9, 0, 0, 0)
		const end = new Date(start)
		end.setHours(10, 30)
		const wrapper = await mountWith({ events: [{ uid: 'a', title: 'Sync', start: start.toISOString(), end: end.toISOString() }], failures: [] })
		expect(wrapper.find('.cn-calendar-widget__agenda-time').text()).toBe('09:00 – 10:30')
	})

	it('shows the start alone for an event without a later end, and All day for an all-day event', async () => {
		const start = new Date()
		start.setHours(9, 0, 0, 0)
		const wrapper = await mountWith({
			events: [
				{ uid: 'a', title: 'No end', start: start.toISOString() },
				{ uid: 'b', title: 'Holiday', start: start.toISOString(), end: start.toISOString(), allDay: true },
			],
			failures: [],
		})
		const times = wrapper.findAll('.cn-calendar-widget__agenda-time').map((w) => w.text())
		expect(times).toEqual(['09:00', 'All day'])
	})

	it('names a failed source in a small notice above the events, with details on click', async () => {
		const wrapper = await mountWith({
			events: [{ uid: 'a', title: 'Kept', start: new Date().toISOString() }],
			failures: ['https://example.com/broken.ics'],
		})
		const notice = wrapper.find('.cn-calendar-widget__notice')
		expect(notice.attributes('role')).toBe('status')
		expect(notice.classes()).not.toContain('cn-calendar-widget__notice--prominent')
		expect(notice.text()).toContain('1 calendar source unavailable')
		expect(notice.text()).not.toContain('broken.ics')
		await notice.find('button').trigger('click')
		expect(wrapper.find('.cn-calendar-widget__notice-list').text()).toContain('https://example.com/broken.ics')
		expect(wrapper.find('.cn-calendar-widget__agenda-row').text()).toContain('Kept')
	})

	it('makes the notice prominent next to the empty state when every source failed', async () => {
		const wrapper = await mountWith(
			{ events: [], failures: [{ source: 'https://a.example/x.ics', error: 'timeout' }, 'https://b.example/y.ics'] },
			{ internalCalendars: [], externalIcsUrls: ['https://a.example/x.ics', 'https://b.example/y.ics'] },
		)
		const notice = wrapper.find('.cn-calendar-widget__notice')
		expect(notice.attributes('role')).toBe('alert')
		expect(notice.classes()).toContain('cn-calendar-widget__notice--prominent')
		expect(notice.text()).toContain('2 calendar sources unavailable')
		expect(wrapper.find('.cn-calendar-widget__state').text()).toContain('No events in the next 14 days')
		await notice.find('button').trigger('click')
		expect(wrapper.find('.cn-calendar-widget__notice-list').text()).toContain('https://a.example/x.ics: timeout')
	})

	it('replaces the loading text with a notice and Retry after 30 seconds', async () => {
		jest.useFakeTimers()
		try {
			const dataSource = { fetchEvents: jest.fn(() => new Promise(() => {})) }
			const wrapper = mount(CnCalendarWidget, { propsData: { content: {}, dataSource } })
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).toContain('Loading calendars…')

			jest.advanceTimersByTime(29000)
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).toContain('Loading calendars…')

			jest.advanceTimersByTime(1000)
			await wrapper.vm.$nextTick()
			expect(wrapper.text()).not.toContain('Loading calendars…')
			expect(wrapper.text()).toContain('The calendars are taking too long to load.')

			dataSource.fetchEvents.mockResolvedValueOnce({ events: [], failures: [] })
			await wrapper.find('.cn-calendar-widget__retry').trigger('click')
			await Promise.resolve()
			await wrapper.vm.$nextTick()
			expect(dataSource.fetchEvents).toHaveBeenCalledTimes(2)
			expect(wrapper.text()).toContain('No events in the next 14 days')
			wrapper.unmount()
		} finally {
			jest.useRealTimers()
		}
	})
})
