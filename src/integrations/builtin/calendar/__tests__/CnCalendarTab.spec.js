/**
 * Tests for CnCalendarTab — bespoke sidebar tab for the calendar
 * integration. Asserts the fetch happens on mount, the timeline groups
 * upcoming vs past events, the empty/error states render correctly,
 * and the inline create flow POSTs to the dedicated /events endpoint.
 */

const { mount } = require('@vue/test-utils')
const CnCalendarTab = require('../CnCalendarTab.vue').default

const STUBS = {
	NcButton: true,
	NcTextField: true,
	NcListItem: {
		props: ['name', 'bold', 'forceDisplayActions'],
		template: `
			<li class="cn-list-item">
				<span class="cn-list-item__name">{{ name }}</span>
				<slot name="subname" />
				<slot name="details" />
				<slot name="actions" />
			</li>
		`,
	},
	NcActionButton: { template: '<button class="cn-action-button"><slot /></button>' },
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
	NcDateTimePickerNative: true,
}

function flush() {
	// Resolve after all currently-queued microtasks; jsdom does not
	// expose setImmediate in modern Jest, so use a Promise-based tick.
	return new Promise((resolve) => Promise.resolve().then(() => Promise.resolve().then(resolve)))
}

describe('CnCalendarTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
		jest.useRealTimers()
	})

	it('renders the empty label when no events are linked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ results: [] }),
		})
		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No meetings linked yet')
		wrapper.destroy()
	})

	it('groups events into upcoming and past sections', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'))
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 'e1', calendarId: 'cal-a', summary: 'Old meeting', dtstart: '2026-05-01T10:00:00Z' },
					{ id: 'e2', calendarId: 'cal-a', summary: 'Future meeting', dtstart: '2026-07-15T14:00:00Z' },
					{ id: 'e3', calendarId: 'cal-a', summary: 'Another future', dtstart: '2026-08-20T09:00:00Z' },
				],
			}),
		})
		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.upcomingEvents).toHaveLength(2)
		expect(wrapper.vm.pastEvents).toHaveLength(1)
		expect(wrapper.text()).toContain('Future meeting')
		expect(wrapper.text()).toContain('Old meeting')
		expect(wrapper.text()).toContain('Upcoming')
		expect(wrapper.text()).toContain('Past')
		wrapper.destroy()
	})

	it('shows an error state when the fetch fails', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load meetings.')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the registry returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Nextcloud Calendar is currently unavailable.')
		wrapper.destroy()
	})

	it('POSTs the new meeting to the /events endpoint and refetches', async () => {
		global.fetch = jest.fn()
			// initial fetch (mount)
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
			// POST create
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'new', calendarId: 'cal-a', summary: 'Kickoff' }) })
			// refetch after create
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 'new', calendarId: 'cal-a', summary: 'Kickoff', dtstart: '2026-09-01T09:00:00Z' }],
				}),
			})

		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()

		wrapper.vm.newEventSummary = 'Kickoff'
		await wrapper.vm.addEvent()
		await flush()

		const calls = global.fetch.mock.calls.map((c) => ({ url: c[0], method: c[1]?.method || 'GET' }))
		// At least one POST to /events for this object.
		const postCall = calls.find((c) => c.method === 'POST' && c.url.endsWith('/objects/r1/s1/o1/events'))
		expect(postCall).toBeDefined()
		expect(wrapper.emitted('linked')).toBeTruthy()
		wrapper.destroy()
	})

	it('emits unlinked after a successful DELETE on the registry endpoint', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 'ev1', calendarId: 'cal-a', summary: 'Team standup', dtstart: '2099-01-01T09:00:00Z' }],
				}),
			})
			.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })

		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		await wrapper.vm.unlink({ id: 'ev1', calendarId: 'cal-a' })
		await flush()

		expect(wrapper.emitted('unlinked')).toBeTruthy()
		expect(wrapper.emitted('unlinked')[0]).toEqual(['cal-a/ev1'])
		const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
		expect(lastCall[0]).toContain('/integrations/calendar/cal-a/ev1')
		expect(lastCall[1].method).toBe('DELETE')
		wrapper.destroy()
	})
})
