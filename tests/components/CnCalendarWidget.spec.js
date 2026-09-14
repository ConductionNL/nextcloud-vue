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
