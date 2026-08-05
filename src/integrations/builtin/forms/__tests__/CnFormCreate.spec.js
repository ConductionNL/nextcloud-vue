/**
 * Tests for CnFormCreate — Tier-2 forms create modal.
 *
 * Covers:
 *  - the submit button is disabled until a title is entered;
 *  - submit emits `create` with `{ title, description }`;
 *  - the title-required validation message;
 *  - the inline submit-error rendering when the parent passes one.
 */

const { mount } = require('@vue/test-utils')
const CnFormCreate = require('../CnFormCreate.vue').default

async function flushAll(wrapper) {
	for (let i = 0; i < 3; i++) {
		await wrapper.vm.$nextTick()
	}
}

describe('CnFormCreate', () => {
	it('renders the dialog with the two fields + actions', () => {
		const wrapper = mount(CnFormCreate)
		// NcDialog's default slot is stubbed away in the test harness;
		// inspect the component html() which includes the unmounted
		// body fragment, plus the actions slot which the stub does emit.
		const html = wrapper.html()
		expect(html).toContain('Title')
		expect(html).toContain('Description')
		expect(wrapper.text()).toContain('Cancel')
		expect(wrapper.text()).toContain('Create + link')
		wrapper.destroy()
	})

	it('disables the submit button until a title is entered', async () => {
		const wrapper = mount(CnFormCreate)
		await flushAll(wrapper)
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.setData({ title: 'My form' })
		await flushAll(wrapper)
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('emits create with trimmed title + description', async () => {
		const wrapper = mount(CnFormCreate)
		wrapper.setData({ title: '  My new form  ', description: '  Some description  ' })
		await flushAll(wrapper)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0][0]).toEqual({
			title: 'My new form',
			description: 'Some description',
		})
		wrapper.destroy()
	})

	it('does not emit create when the title is blank', async () => {
		const wrapper = mount(CnFormCreate)
		wrapper.setData({ title: '   ' })
		await flushAll(wrapper)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})

	it('renders the parent-supplied submitError inline', async () => {
		const wrapper = mount(CnFormCreate, {
			propsData: { submitError: 'NC Forms refused: 503' },
		})
		await flushAll(wrapper)
		expect(wrapper.text()).toContain('NC Forms refused: 503')
		wrapper.destroy()
	})
})
