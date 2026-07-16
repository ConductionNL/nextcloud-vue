/**
 * Tests for CnCalendarCard — surface-aware widget for the calendar
 * integration. Covers the four AD-19 surfaces (user-dashboard,
 * app-dashboard, detail-page, single-entity) plus empty + error
 * states and the maxDisplay cap on list surfaces.
 */

const { mount } = require('@vue/test-utils')

// Stub the @nextcloud/router generateUrl helper so the detail-page
// CTA renders a deterministic href without depending on OC globals.
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => path,
}))

const CnCalendarCard = require('../CnCalendarCard.vue').default

const STUBS = {
	NcLoadingIcon: { template: '<div class="cn-loading" />' },
}

function flush() {
	// Resolve after all currently-queued microtasks; jsdom does not
	// expose setImmediate in modern Jest, so use a Promise-based tick.
	return new Promise((resolve) => Promise.resolve().then(() => Promise.resolve().then(resolve)))
}

describe('CnCalendarCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
		jest.useRealTimers()
	})

	it('renders the empty label when no events are linked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCalendarCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'detail-page' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No meetings')
		wrapper.destroy()
	})

	it('caps the displayed events at maxDisplay on dashboard surfaces', async () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'))
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 'e1', calendarId: 'c', summary: 'A', dtstart: '2026-07-01T10:00:00Z' },
					{ id: 'e2', calendarId: 'c', summary: 'B', dtstart: '2026-07-02T10:00:00Z' },
					{ id: 'e3', calendarId: 'c', summary: 'C', dtstart: '2026-07-03T10:00:00Z' },
					{ id: 'e4', calendarId: 'c', summary: 'D', dtstart: '2026-07-04T10:00:00Z' },
					{ id: 'e5', calendarId: 'c', summary: 'E', dtstart: '2026-07-05T10:00:00Z' },
					{ id: 'e6', calendarId: 'c', summary: 'F', dtstart: '2026-07-06T10:00:00Z' },
					{ id: 'e7', calendarId: 'c', summary: 'G', dtstart: '2026-07-07T10:00:00Z' },
				],
			}),
		})
		const wrapper = mount(CnCalendarCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'user-dashboard', maxDisplay: 5 },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-calendar-card__row')).toHaveLength(5)
		expect(wrapper.text()).toContain('Show all')
		wrapper.destroy()
	})

	it('renders the detail-page surface with the Open in Calendar CTA', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ id: 'e1', calendarId: 'cal', summary: 'Sync', dtstart: '2099-01-01T09:00:00Z' }],
			}),
		})
		const wrapper = mount(CnCalendarCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'detail-page' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Open in Calendar')
		const cta = wrapper.find('.cn-calendar-card__cta')
		expect(cta.exists()).toBe(true)
		expect(cta.attributes('href')).toBe('/apps/calendar')
		wrapper.destroy()
	})

	it('renders the single-entity surface as a chip with summary + date', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				id: 'ev1',
				calendarId: 'cal-a',
				summary: 'Quarterly review',
				dtstart: '2026-09-01T15:00:00Z',
				status: 'confirmed',
			}),
		})
		const wrapper = mount(CnCalendarCard, {
			propsData: {
				register: 'r1',
				schema: 's1',
				objectId: 'o1',
				surface: 'single-entity',
				entityId: 'cal-a/ev1',
			},
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-calendar-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Quarterly review')
		expect(chip.text()).toContain('confirmed')
		// Single-entity surface uses /integrations/calendar/{entityId}.
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/integrations/calendar/cal-a/ev1')
		wrapper.destroy()
	})

	it('renders an error message when the list fetch fails', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCalendarCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', surface: 'detail-page' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load meetings.')
		wrapper.destroy()
	})

	it('renders empty state without firing fetch when context is incomplete', async () => {
		global.fetch = jest.fn()
		const wrapper = mount(CnCalendarCard, {
			propsData: { surface: 'user-dashboard' },
			stubs: STUBS,
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(global.fetch).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain('No meetings')
		wrapper.destroy()
	})
})
