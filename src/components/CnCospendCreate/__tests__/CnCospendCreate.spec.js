/**
 * Tests for CnCospendCreate — inline-create-project dialog.
 *
 * Covers:
 *  - canSubmit is false with an empty name and true once a name is set;
 *  - submit emits `create` with { name, currency } using the trimmed name;
 *  - submit defaults the currency to EUR;
 *  - submit is a no-op when the name is blank.
 */

const { mount } = require('@vue/test-utils')
const CnCospendCreate = require('../CnCospendCreate.vue').default

describe('CnCospendCreate', () => {
	it('canSubmit reflects the project name', async () => {
		const wrapper = mount(CnCospendCreate)
		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.name = 'Holiday'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('submit emits create with trimmed name and default currency', () => {
		const wrapper = mount(CnCospendCreate)
		wrapper.vm.name = '  Holiday  '
		wrapper.vm.submit()

		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ name: 'Holiday', currency: 'EUR' }])
		wrapper.destroy()
	})

	it('submit uses the chosen currency', () => {
		const wrapper = mount(CnCospendCreate)
		wrapper.vm.name = 'Office'
		wrapper.vm.currency = { id: 'USD', label: 'USD' }
		wrapper.vm.submit()

		expect(wrapper.emitted('create')[0]).toEqual([{ name: 'Office', currency: 'USD' }])
		wrapper.destroy()
	})

	it('does not emit create when the name is blank', () => {
		const wrapper = mount(CnCospendCreate)
		wrapper.vm.name = '   '
		wrapper.vm.submit()

		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})
