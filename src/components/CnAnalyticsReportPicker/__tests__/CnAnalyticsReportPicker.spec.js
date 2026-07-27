/**
 * Tests for CnAnalyticsReportPicker — pick-existing-report modal.
 *
 * Covers:
 *  - reports render on mount from /api/integrations/analytics/available;
 *  - selecting a report enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected reportId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnAnalyticsReportPicker = require('../CnAnalyticsReportPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnAnalyticsReportPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available reports on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Sales', type: 0 },
				{ id: 2, name: 'Ops', type: 2 },
			],
		}))

		const wrapper = mount(CnAnalyticsReportPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-analytics-report-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Sales')
		expect(wrapper.text()).toContain('Ops')
		expect(wrapper.text()).toContain('Group')
		expect(wrapper.text()).toContain('Database')
		wrapper.unmount()
	})

	it('selecting a report enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, name: 'Sales', type: 0 }],
		}))

		const wrapper = mount(CnAnalyticsReportPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-analytics-report-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedReportId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ reportId: 99 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnAnalyticsReportPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load reports.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnAnalyticsReportPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('NC Analytics is not installed.')
		wrapper.unmount()
	})

	it('filters reports client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Sales report' },
				{ id: 2, name: 'Ops' },
			],
		}))

		const wrapper = mount(CnAnalyticsReportPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'sales'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleReports).toHaveLength(1)
		expect(wrapper.vm.visibleReports[0].id).toBe(1)
		wrapper.unmount()
	})

	it('does not emit link when no report is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnAnalyticsReportPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
