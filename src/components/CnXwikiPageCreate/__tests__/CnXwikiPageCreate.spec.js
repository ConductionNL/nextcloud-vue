/**
 * Tests for CnXwikiPageCreate — inline-create dialog for the external
 * `xwiki` integration leaf.
 *
 * Covers:
 *  - submit is disabled until both space + title are filled;
 *  - submit emits `create` with `{ space, title }` (trimmed);
 *  - the `unavailable` prop disables the form and shows the Configure CTA.
 */

const { mount } = require('@vue/test-utils')
const CnXwikiPageCreate = require('../CnXwikiPageCreate.vue').default

describe('CnXwikiPageCreate', () => {
	it('keeps submit disabled until space and title are set', async () => {
		const wrapper = mount(CnXwikiPageCreate)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.space = 'Sales'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.title = 'New Page'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('emits create with trimmed space + title on submit', async () => {
		const wrapper = mount(CnXwikiPageCreate)
		await wrapper.vm.$nextTick()

		wrapper.vm.space = '  Sales  '
		wrapper.vm.title = '  New Page  '
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted().create).toBeTruthy()
		expect(wrapper.emitted().create[0][0]).toEqual({ space: 'Sales', title: 'New Page' })
		wrapper.destroy()
	})

	it('shows the Configure CTA and hides the form when unavailable', async () => {
		const wrapper = mount(CnXwikiPageCreate, { propsData: { unavailable: true } })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-xwiki-page-create__unconfigured').exists()).toBe(true)
		expect(wrapper.find('form.cn-xwiki-page-create').exists()).toBe(false)
		expect(wrapper.text()).toContain('Configure XWiki connection')
		wrapper.destroy()
	})

	it('does not emit create when the form is incomplete', async () => {
		const wrapper = mount(CnXwikiPageCreate)
		await wrapper.vm.$nextTick()

		wrapper.vm.space = 'Sales'
		wrapper.vm.submit()
		expect(wrapper.emitted().create).toBeFalsy()
		wrapper.destroy()
	})
})
