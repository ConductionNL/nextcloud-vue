/**
 * Tests for CnOpenProjectPicker — pick-existing-work-package modal.
 *
 * Covers:
 *  - work packages render on mount from /api/integrations/openproject/available;
 *  - selecting a row enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected workPackageId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "OpenConnector not installed" copy;
 *  - 503 surfaces the unconfigured Configure CTA (external-source state);
 *  - search input filters the visible list client-side;
 *  - the project filter narrows the visible list;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnOpenProjectPicker = require('../CnOpenProjectPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnOpenProjectPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available work packages on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ workPackageId: 10, subject: 'Refactor auth', type: 'Bug', project: 'Portal' },
				{ workPackageId: 11, subject: 'Onboarding flow', type: 'Task', project: 'Portal' },
			],
		}))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-openproject-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Refactor auth')
		expect(wrapper.text()).toContain('Onboarding flow')
		wrapper.unmount()
	})

	it('selecting a row enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ workPackageId: 99, subject: 'Ship it', type: 'Task', project: 'Portal' }],
		}))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-openproject-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ workPackageId: 99 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load work packages.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('OpenConnector is not installed.')
		wrapper.unmount()
	})

	it('renders the unconfigured Configure CTA on 503', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'no source' }, 503))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.unconfigured).toBe(true)
		expect(wrapper.text()).toContain('Configure OpenProject connection')
		wrapper.unmount()
	})

	it('filters work packages client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ workPackageId: 1, subject: 'Refactor auth', project: 'Portal' },
				{ workPackageId: 2, subject: 'Onboarding flow', project: 'Portal' },
			],
		}))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'refactor'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleWorkPackages).toHaveLength(1)
		expect(wrapper.vm.visibleWorkPackages[0].workPackageId).toBe(1)
		wrapper.unmount()
	})

	it('narrows work packages by project filter', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ workPackageId: 1, subject: 'Refactor auth', project: 'Portal' },
				{ workPackageId: 2, subject: 'Policy update', project: 'Internal' },
			],
		}))

		const wrapper = mount(CnOpenProjectPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.projectFilter = { id: 'Internal', label: 'Internal' }
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleWorkPackages).toHaveLength(1)
		expect(wrapper.vm.visibleWorkPackages[0].workPackageId).toBe(2)
		wrapper.unmount()
	})

	it('does not emit link when no row is selected', () => {
		global.fetch.mockReturnValue(resolveOnce({ results: [] }))
		const wrapper = mount(CnOpenProjectPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
