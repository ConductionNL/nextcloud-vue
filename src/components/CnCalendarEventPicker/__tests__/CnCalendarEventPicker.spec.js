/**
 * Tests for CnCalendarEventPicker — 2-step picker for the calendar
 * integration's link-existing flow.
 *
 * Asserts:
 *  - Mount loads calendars from /api/integrations/calendar/calendars
 *  - Picking a calendar transitions to step 2 and loads its events
 *  - Filter input filters events client-side by summary substring
 *  - Confirm emits `link` with {calendarUri, eventUid}
 *  - Cancel emits `close`
 */

const { mount } = require('@vue/test-utils')
const CnCalendarEventPicker = require('../CnCalendarEventPicker.vue').default

const STUBS = {
	NcModal: { template: '<div class="cn-modal"><slot /></div>' },
	NcButton: { template: '<button class="cn-btn" @click="$emit(\'click\')"><slot /></button>' },
	NcTextField: {
		props: ['value'],
		template: '<input class="cn-text-field" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
	ChevronLeft: { template: '<span />' },
}

function flush() {
	return new Promise((resolve) => Promise.resolve().then(() => Promise.resolve().then(resolve)))
}

describe('CnCalendarEventPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('loads calendars on mount', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 7, uri: 'personal', displayName: 'Personal', color: '#ff0' },
					{ id: 8, uri: 'work', displayName: 'Work', color: '#0f0' },
				],
			}),
		})

		const wrapper = mount(CnCalendarEventPicker, { stubs: STUBS })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.calendars).toHaveLength(2)
		expect(wrapper.text()).toContain('Personal')
		expect(wrapper.text()).toContain('Work')
		wrapper.unmount()
	})

	it('transitions to step 2 and loads events on calendar selection', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 7, uri: 'personal', displayName: 'Personal', color: '#ff0' }],
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [
						{ uid: 'ev1', summary: 'Standup', dtstart: '2026-06-01T09:00:00Z' },
						{ uid: 'ev2', summary: 'Retro', dtstart: '2026-06-02T15:00:00Z' },
					],
				}),
			})

		const wrapper = mount(CnCalendarEventPicker, { stubs: STUBS })
		await flush()
		await wrapper.vm.$nextTick()

		await wrapper.vm.selectCalendar({ uri: 'personal', displayName: 'Personal' })
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.step).toBe('events')
		expect(wrapper.vm.events).toHaveLength(2)
		expect(wrapper.text()).toContain('Standup')
		expect(wrapper.text()).toContain('Retro')

		const evtCall = global.fetch.mock.calls[1][0]
		expect(evtCall).toContain('/integrations/calendar/calendars/personal/events')
		wrapper.unmount()
	})

	it('filters events client-side by summary substring', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [{ uri: 'personal', displayName: 'P' }] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [
						{ uid: 'ev1', summary: 'Hello world' },
						{ uid: 'ev2', summary: 'Other event' },
					],
				}),
			})

		const wrapper = mount(CnCalendarEventPicker, { stubs: STUBS })
		await flush()
		await wrapper.vm.$nextTick()
		await wrapper.vm.selectCalendar({ uri: 'personal', displayName: 'P' })
		await flush()
		await wrapper.vm.$nextTick()

		wrapper.vm.filterText = 'hello'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.filteredEvents).toHaveLength(1)
		expect(wrapper.vm.filteredEvents[0].uid).toBe('ev1')
		wrapper.unmount()
	})

	it('emits link with {calendarUri,eventUid} on confirm', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [{ uri: 'work', displayName: 'W' }] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [{ uid: 'evX' }] }),
			})

		const wrapper = mount(CnCalendarEventPicker, { stubs: STUBS })
		await flush()
		await wrapper.vm.$nextTick()
		await wrapper.vm.selectCalendar({ uri: 'work', displayName: 'W' })
		await flush()
		await wrapper.vm.$nextTick()

		wrapper.vm.selectEvent({ uid: 'evX' })
		wrapper.vm.confirmSelection()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ calendarUri: 'work', eventUid: 'evX' }])
		wrapper.unmount()
	})

	it('emits close on cancel', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCalendarEventPicker, { stubs: STUBS })
		await flush()
		await wrapper.vm.$nextTick()
		wrapper.vm.onClose()
		expect(wrapper.emitted('close')).toBeTruthy()
		wrapper.unmount()
	})
})
