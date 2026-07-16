/**
 * Tests for CnCospendPicker — pick-existing-project modal.
 *
 * Covers:
 *  - projects render on mount from /api/integrations/cospend/available;
 *  - selecting a project enables confirm and the row gets the selected class;
 *  - confirm emits `link` with { entryType: 'project', projectId };
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnCospendPicker = require('../CnCospendPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnCospendPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available projects on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 'p1', name: 'Holiday', currency: 'EUR' },
				{ id: 'p2', name: 'Office', currency: 'USD' },
			],
		}))

		const wrapper = mount(CnCospendPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-cospend-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Holiday')
		expect(wrapper.text()).toContain('Office')
		wrapper.destroy()
	})

	it('selecting a project enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 'p99', name: 'Holiday', currency: 'EUR' }],
		}))

		const wrapper = mount(CnCospendPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-cospend-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedProjectId).toBe('p99')

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ entryType: 'project', projectId: 'p99' }])
		wrapper.destroy()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnCospendPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load projects.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnCospendPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('NC Costs is not installed.')
		wrapper.destroy()
	})

	it('filters projects client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 'p1', name: 'Holiday', currency: 'EUR' },
				{ id: 'p2', name: 'Office', currency: 'USD' },
			],
		}))

		const wrapper = mount(CnCospendPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'holiday'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleProjects).toHaveLength(1)
		expect(wrapper.vm.visibleProjects[0].id).toBe('p1')
		wrapper.destroy()
	})

	it('does not emit link when no project is selected', () => {
		global.fetch.mockReturnValue(resolveOnce({ results: [] }))
		const wrapper = mount(CnCospendPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.destroy()
	})
})
