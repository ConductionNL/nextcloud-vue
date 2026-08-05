/**
 * Tests for CnFlowOperationPicker — admin-only pick-existing-operation modal.
 *
 * Covers:
 *  - operations render on mount from /api/integrations/flow/operations;
 *  - selecting an operation enables confirm and emits `link` with the
 *    operationId;
 *  - 403 from /operations degrades to an admin-only notice (no list);
 *  - 501 surfaces the "not installed" error banner;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - search input filters the visible list client-side.
 */

const { mount } = require('@vue/test-utils')
const CnFlowOperationPicker = require('../CnFlowOperationPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnFlowOperationPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available operations on mount (admin)', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Probe File', class: 'OCA\\WorkflowEngine\\Operation', entity: 'OCA\\WorkflowEngine\\Entity\\File', operation: 'noop', events: ['postCreate'], checks: [], enabled: true },
				{ id: 2, name: 'Archive Old', class: 'OCA\\WorkflowEngine\\Operation', entity: 'OCA\\WorkflowEngine\\Entity\\File', operation: 'archive', events: [], checks: [{}, {}], enabled: true },
			],
		}))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-flow-operation-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Probe File')
		expect(wrapper.text()).toContain('Archive Old')
		wrapper.destroy()
	})

	it('selecting an operation enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, name: 'Probe', enabled: true }],
		}))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-flow-operation-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedOperationId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ operationId: 99 }])
		wrapper.destroy()
	})

	it('degrades to admin-only notice on 403', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'Flow operations are configured by administrators', code: 'ADMIN_ONLY', results: [], total: 0 }, 403))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.adminOnly).toBe(true)
		expect(wrapper.text()).toContain('configured by administrators')
		// No list rendered.
		expect(wrapper.find('.cn-flow-operation-picker__list').exists()).toBe(false)
		// No "Link automation" confirm button.
		const confirmButtons = wrapper.findAll('button')
		const linkButton = confirmButtons.filter(b => b.text().includes('Link automation'))
		expect(linkButton.length).toBe(0)
		wrapper.destroy()
	})

	it('surfaces a 501 "not installed" error banner', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'NC Flow (workflowengine) app is not installed' }, 501))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('not installed')
		wrapper.destroy()
	})

	it('surfaces an inline error when /operations fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load automations.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('filters operations client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Probe File', enabled: true },
				{ id: 2, name: 'Archive Old', enabled: true },
			],
		}))

		const wrapper = mount(CnFlowOperationPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'probe'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleOperations).toHaveLength(1)
		expect(wrapper.vm.visibleOperations[0].id).toBe(1)
		wrapper.destroy()
	})

	it('does not emit link when no operation is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))

		const wrapper = mount(CnFlowOperationPicker)
		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.destroy()
	})
})
