/**
 * Tests for CnCalendarTab — Tier-2 (additive link-table) wiring.
 *
 * Asserts:
 *  - initial fetch happens on mount + empty state renders
 *  - timeline groups upcoming vs past events
 *  - error / 503 states render correctly
 *  - link-existing path POSTs `{calendarUri, eventUid}` to /events/link
 *  - unlink path hits DELETE /events/{eventUid}/link (NOT the full
 *    destroy endpoint)
 *  - delete path hits DELETE /events/{eventUri} (legacy destroy)
 */

const { mount } = require('@vue/test-utils')
const CnCalendarTab = require('../CnCalendarTab.vue').default

const STUBS = {
	NcButton: { template: '<button class="cn-btn" @click="$emit(\'click\')"><slot /></button>' },
	NcActions: { template: '<div class="cn-actions"><slot /></div>' },
	NcActionButton: { template: '<button class="cn-action-button" @click="$emit(\'click\')"><slot /></button>' },
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
	CnStatusBadge: { props: ['label', 'variant', 'size'], template: '<span class="cn-status-badge">{{ label }}</span>' },
	CnCalendarEventPicker: { template: '<div class="cn-cep-stub" />' },
	CnCalendarEventCreate: { template: '<div class="cn-cec-stub" />' },
}

function flush() {
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
		wrapper.unmount()
	})

	it('groups events into upcoming and past sections', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'))
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 'e1', uid: 'u1', summary: 'Old', dtstart: '2026-05-01T10:00:00Z' },
					{ id: 'e2', uid: 'u2', summary: 'Future', dtstart: '2026-07-15T14:00:00Z' },
					{ id: 'e3', uid: 'u3', summary: 'Another future', dtstart: '2026-08-20T09:00:00Z' },
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
		expect(wrapper.text()).toContain('Future')
		expect(wrapper.text()).toContain('Upcoming')
		wrapper.unmount()
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
		wrapper.unmount()
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
		wrapper.unmount()
	})

	it('POSTs {calendarUri,eventUid} to /events/link when picker confirms', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'e.ics', uid: 'ev-uid-1' }) })
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 'e.ics', uid: 'ev-uid-1', summary: 'Linked' }],
				}),
			})

		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onPickerLink({ calendarUri: 'personal', eventUid: 'ev-uid-1' })
		await flush()

		const calls = global.fetch.mock.calls.map((c) => ({ url: c[0], method: c[1]?.method || 'GET', body: c[1]?.body }))
		const linkCall = calls.find((c) => c.method === 'POST' && c.url.endsWith('/events/link'))
		expect(linkCall).toBeDefined()
		expect(JSON.parse(linkCall.body)).toEqual({ calendarUri: 'personal', eventUid: 'ev-uid-1' })
		expect(wrapper.emitted('linked')).toBeTruthy()
		wrapper.unmount()
	})

	it('unlink hits /events/{uid}/link (preserves the VEVENT)', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 'e.ics', uid: 'ev1', summary: 'X', dtstart: '2099-01-01T09:00:00Z' }],
				}),
			})
			.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })

		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		await wrapper.vm.unlink({ id: 'e.ics', uid: 'ev1' })
		await flush()

		expect(wrapper.emitted('unlinked')).toBeTruthy()
		expect(wrapper.emitted('unlinked')[0]).toEqual(['ev1'])
		const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
		expect(lastCall[0]).toContain('/events/ev1/link')
		expect(lastCall[1].method).toBe('DELETE')
		wrapper.unmount()
	})

	it('delete hits /events/{uri} (destroys the VEVENT)', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 'e.ics', uid: 'ev1', summary: 'X', dtstart: '2099-01-01T09:00:00Z' }],
				}),
			})
			.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })

		const wrapper = mount(CnCalendarTab, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		await wrapper.vm.deleteEvent({ id: 'e.ics', uid: 'ev1' })
		await flush()

		expect(wrapper.emitted('deleted')).toBeTruthy()
		const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
		expect(lastCall[0]).toMatch(/\/events\/e\.ics$/)
		expect(lastCall[1].method).toBe('DELETE')
		wrapper.unmount()
	})
})
