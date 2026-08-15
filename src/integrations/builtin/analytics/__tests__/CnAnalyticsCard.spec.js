/**
 * Tests for CnAnalyticsCard — bespoke surface-aware widget for the
 * `analytics` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + most-recently-
 *    modified report name + type badge;
 *  - detail-page: compact list with type icon + badge + view-all
 *    trail-off;
 *  - single-entity: type-icon + name chip.
 * Plus 503 unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnAnalyticsCard = require('../CnAnalyticsCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeReport(overrides = {}) {
	return {
		id: 42,
		title: 'Quarterly KPIs',
		url: '/index.php/apps/analytics/#/r/42',
		reportType: 1,
		modifiedAt: '2026-05-01T09:00:00Z',
		data: { id: 42, name: 'Quarterly KPIs', subheader: '', type: 1 },
		...overrides,
	}
}

describe('CnAnalyticsCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked reports', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No reports linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + most-recent on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeReport({ id: 1, title: 'Alpha', modifiedAt: '2026-04-01T09:00:00Z' }),
					makeReport({ id: 2, title: 'Bravo', modifiedAt: '2026-05-01T09:00:00Z' }),
					makeReport({ id: 3, title: 'Charlie', modifiedAt: '2026-03-01T09:00:00Z' }),
				],
			}),
		})
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('3 reports')
		// most-recent (highest modifiedAt) shows
		expect(txt).toContain('Bravo')
		wrapper.unmount()
	})

	it('renders a compact list with view-all trail-off on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeReport({ id: 1, title: 'A' }),
					makeReport({ id: 2, title: 'B' }),
					makeReport({ id: 3, title: 'C' }),
					makeReport({ id: 4, title: 'D' }),
					makeReport({ id: 5, title: 'E' }),
					makeReport({ id: 6, title: 'F' }),
				],
			}),
		})
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-analytics-card__row')
		// COMPACT_LIMIT = 5
		expect(rows).toHaveLength(5)
		expect(wrapper.find('.cn-analytics-card__view-all').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeReport({ id: 7, title: 'Status report', reportType: 4 })),
		})
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '7' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-analytics-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Status report')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Analytics is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnAnalyticsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No reports linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})
})
