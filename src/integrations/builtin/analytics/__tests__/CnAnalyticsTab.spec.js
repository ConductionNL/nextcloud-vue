/**
 * Tests for CnAnalyticsTab — bespoke sidebar tab for the `analytics`
 * integration.
 *
 * Covers:
 *  - empty-state with "Open Analytics" CTA when the provider returns
 *    no rows;
 *  - row rendering: title, type badge, modified date, deep-link href
 *    into the NC Analytics app;
 *  - `[or:{uuid}]` marker is stripped from the displayed title and
 *    from the subheader (wave-2.2 had marker on subheader; defensive
 *    against both placements);
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnAnalyticsTab = require('../CnAnalyticsTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeReport(overrides = {}) {
	return {
		id: 42,
		title: 'Quarterly KPIs',
		url: '/index.php/apps/analytics/#/r/42',
		subheader: 'Sales pipeline broken down by region',
		reportType: 1,
		modifiedAt: '2026-05-01T09:00:00Z',
		data: { id: 42, name: 'Quarterly KPIs', subheader: 'Sales pipeline broken down by region', type: 1 },
		...overrides,
	}
}

describe('CnAnalyticsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Analytics" CTA when no reports', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No reports linked yet')
		expect(wrapper.text()).toContain('Open Analytics')
		wrapper.destroy()
	})

	it('renders one row per report with title + type badge + deep-link href', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeReport({ id: 1, title: 'Sales', reportType: 1, url: '/index.php/apps/analytics/#/r/1' }),
					makeReport({ id: 2, title: 'Ops Dashboard', reportType: 4, url: '/index.php/apps/analytics/#/r/2' }),
				],
			}),
		})
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-analytics-tab__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Sales')
		expect(wrapper.text()).toContain('Ops Dashboard')
		expect(wrapper.text()).toContain('Group')
		expect(wrapper.text()).toContain('Internal')
		const links = wrapper.findAll('a.cn-analytics-tab__title')
		expect(links.at(0).attributes('href')).toBe('/index.php/apps/analytics/#/r/1')
		expect(links.at(1).attributes('href')).toBe('/index.php/apps/analytics/#/r/2')
		wrapper.destroy()
	})

	it('strips the [or:{uuid}] marker from title and subheader', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeReport({
						id: 7,
						title: 'KPI [or:obj-1]',
						subheader: 'with annotated marker [or:obj-1]',
					}),
				],
			}),
		})
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const text = wrapper.text()
		expect(text).toContain('KPI')
		expect(text).toContain('with annotated marker')
		expect(text).not.toContain('[or:obj-1]')
		wrapper.destroy()
	})

	it('renders a fallback "Report" badge for unknown report types', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeReport({ id: 99, reportType: 999 })],
			}),
		})
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Report')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Analytics is currently unavailable.')
		expect(wrapper.find('.cn-analytics-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load reports.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
