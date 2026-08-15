/**
 * Tests for CnAnalyticsReportCreate — inline-create report dialog.
 *
 * Covers:
 *  - the create button is disabled until a non-empty name is entered;
 *  - submit emits `create` with `{ name, type }` (trimmed name);
 *  - the default report type is Group (0);
 *  - submit is a no-op when the name is blank.
 */

const { mount } = require('@vue/test-utils')
const CnAnalyticsReportCreate = require('../CnAnalyticsReportCreate.vue').default

describe('CnAnalyticsReportCreate', () => {
	it('defaults the type to Group (0)', () => {
		const wrapper = mount(CnAnalyticsReportCreate)
		expect(wrapper.vm.selectedType.value).toBe(0)
		wrapper.unmount()
	})

	it('disables submit until a name is entered', async () => {
		const wrapper = mount(CnAnalyticsReportCreate)
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.name = 'Quarterly KPIs'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.unmount()
	})

	it('emits create with trimmed name and selected type', async () => {
		const wrapper = mount(CnAnalyticsReportCreate)
		wrapper.vm.name = '  Sales pipeline  '
		wrapper.vm.selectedType = { value: 2, label: 'Database' }
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ name: 'Sales pipeline', type: 2 }])
		wrapper.unmount()
	})

	it('does not emit create when the name is blank', () => {
		const wrapper = mount(CnAnalyticsReportCreate)
		wrapper.vm.name = '   '
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.unmount()
	})
})
