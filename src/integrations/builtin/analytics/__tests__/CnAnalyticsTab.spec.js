/**
 * Tests for CnAnalyticsTab — bespoke sidebar tab for the `analytics`
 * integration (Tier-2).
 *
 * Covers:
 *  - empty-state with "Open Analytics" CTA when the endpoint returns
 *    no rows;
 *  - row rendering: title, type badge, modified date, deep-link href
 *    into the NC Analytics app;
 *  - `[or:{uuid}]` marker is stripped from the displayed title and
 *    from the subheader (defensive against legacy placement);
 *  - graceful degradation when the endpoint returns 503/501;
 *  - generic-error path when fetch throws;
 *  - Tier-2: link existing (onLinkPick), create (onCreatePick) and
 *    per-row unlink (unlinkReport) POST/DELETE to the OR endpoints.
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
		reportId: 42,
		reportTitle: 'Quarterly KPIs',
		url: '/index.php/apps/analytics/#/r/42',
		subheader: 'Sales pipeline broken down by region',
		reportType: 0,
		modifiedAt: '2026-05-01T09:00:00Z',
		...overrides,
	}
}

function okJson(payload, status = 200) {
	return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) }
}

describe('CnAnalyticsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Analytics" CTA when no reports', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({ results: [] }))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No reports linked yet')
		expect(wrapper.text()).toContain('Open Analytics')
		wrapper.unmount()
	})

	it('renders one row per report with title + type badge + deep-link href', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({
			results: [
				makeReport({ reportId: 1, reportTitle: 'Sales', reportType: 0, url: '/index.php/apps/analytics/#/r/1' }),
				makeReport({ reportId: 2, reportTitle: 'Ops Dashboard', reportType: 4, url: '/index.php/apps/analytics/#/r/2' }),
			],
		}))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// Each report renders as an NcListItem row.
		const rows = wrapper.findAll('.cn-analytics-tab__row')
		expect(rows).toHaveLength(2)
		// Report names are bound to the NcListItem `name` attribute (the
		// functional stub spreads bound attrs onto its root element).
		const names = rows.map((r) => r.attributes('name'))
		expect(names).toContain('Sales')
		expect(names).toContain('Ops Dashboard')
		// Type badges still render their labels as text.
		expect(wrapper.text()).toContain('Group')
		expect(wrapper.text()).toContain('External')
		// Deep-link href is bound to the NcListItem row.
		const hrefs = rows.map((r) => r.attributes('href'))
		expect(hrefs).toContain('/index.php/apps/analytics/#/r/1')
		expect(hrefs).toContain('/index.php/apps/analytics/#/r/2')
		wrapper.unmount()
	})

	it('strips the [or:{uuid}] marker from title and subheader', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({
			results: [
				makeReport({
					reportId: 7,
					reportTitle: 'KPI [or:obj-1]',
					subheader: 'with annotated marker [or:obj-1]',
				}),
			],
		}))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// Title is bound to the NcListItem `name` attribute; subheader is text.
		const row = wrapper.find('.cn-analytics-tab__row')
		expect(row.attributes('name')).toBe('KPI')
		const text = wrapper.text()
		expect(text).toContain('with annotated marker')
		expect(text).not.toContain('[or:obj-1]')
		expect(row.attributes('name')).not.toContain('[or:obj-1]')
		wrapper.unmount()
	})

	it('renders a fallback "Report" badge for unknown report types', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({
			results: [makeReport({ reportId: 99, reportType: 999 })],
		}))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Report')
		wrapper.unmount()
	})

	it('renders the headline KPI value when the provider supplies one', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({
			results: [makeReport({ reportId: 11, reportTitle: 'Revenue', value: 12345 })],
		}))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-analytics-tab__kpi').exists()).toBe(true)
		expect(wrapper.find('.cn-analytics-tab__kpi').text()).toBe((12345).toLocaleString())
		wrapper.unmount()
	})

	it('omits the KPI element when no value is supplied', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({
			results: [makeReport({ reportId: 12, value: undefined, kpi: undefined })],
		}))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-analytics-tab__kpi').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the unavailable banner when the endpoint returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(okJson({}, 503))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Analytics is currently unavailable.')
		expect(wrapper.find('.cn-analytics-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load reports.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('POSTs to the link endpoint then refreshes on link pick', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(okJson({ results: [] })) // initial fetch
			.mockResolvedValueOnce(okJson({ id: 1 }, 201)) // link POST
			.mockResolvedValueOnce(okJson({ results: [makeReport({ reportId: 5, reportTitle: 'Linked' })] })) // refetch
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onLinkPick({ reportId: 5 })
		await wrapper.vm.$nextTick()

		const linkCall = global.fetch.mock.calls[1]
		expect(linkCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/analytics')
		expect(linkCall[1].method).toBe('POST')
		expect(JSON.parse(linkCall[1].body)).toEqual({ reportId: 5 })
		const names = wrapper.findAll('.cn-analytics-tab__row').map((r) => r.attributes('name'))
		expect(names).toContain('Linked')
		wrapper.unmount()
	})

	it('surfaces the already-linked error on 409', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(okJson({ results: [] }))
			.mockResolvedValueOnce(okJson({ error: 'dup' }, 409))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onLinkPick({ reportId: 5 })
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('This report is already linked.')
		wrapper.unmount()
	})

	it('POSTs to the create endpoint on create pick', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(okJson({ results: [] }))
			.mockResolvedValueOnce(okJson({ id: 9 }, 201))
			.mockResolvedValueOnce(okJson({ results: [] }))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onCreatePick({ name: 'New report', type: 0 })
		await wrapper.vm.$nextTick()

		const createCall = global.fetch.mock.calls[1]
		expect(createCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/analytics/new')
		expect(createCall[1].method).toBe('POST')
		expect(JSON.parse(createCall[1].body)).toEqual({ name: 'New report', type: 0 })
		wrapper.unmount()
	})

	it('DELETEs the report on unlink', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(okJson({ results: [makeReport({ reportId: 5 })] }))
			.mockResolvedValueOnce(okJson({ success: true }))
			.mockResolvedValueOnce(okJson({ results: [] }))
		const wrapper = mount(CnAnalyticsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.unlinkReport({ reportId: 5 })
		await wrapper.vm.$nextTick()

		const delCall = global.fetch.mock.calls[1]
		expect(delCall[0]).toBe('/apps/openregister/api/objects/reg/schema/obj-1/analytics/5')
		expect(delCall[1].method).toBe('DELETE')
		wrapper.unmount()
	})
})
