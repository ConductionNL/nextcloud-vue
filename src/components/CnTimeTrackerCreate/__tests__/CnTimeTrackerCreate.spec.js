/**
 * Tests for CnTimeTrackerCreate — inline create-client dialog.
 *
 * Covers:
 *  - submit is disabled until a client name is set;
 *  - submit emits `create` with { name } (trimmed);
 *  - no create is emitted when the name is empty.
 */

const { mount } = require('@vue/test-utils')
const CnTimeTrackerCreate = require('../CnTimeTrackerCreate.vue').default

describe('CnTimeTrackerCreate', () => {
	it('keeps submit disabled until a name is set', async () => {
		const wrapper = mount(CnTimeTrackerCreate)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.name = 'Acme'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('emits create with the trimmed name', async () => {
		const wrapper = mount(CnTimeTrackerCreate)
		await wrapper.vm.$nextTick()

		wrapper.vm.name = '  Acme  '
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ name: 'Acme' }])
		wrapper.destroy()
	})

	it('does not emit create when the name is empty', async () => {
		const wrapper = mount(CnTimeTrackerCreate)
		await wrapper.vm.$nextTick()

		wrapper.vm.name = '   '
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})
