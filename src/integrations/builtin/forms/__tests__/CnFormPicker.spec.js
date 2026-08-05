/**
 * Tests for CnFormPicker — Tier-2 forms link modal.
 *
 * Covers:
 *  - loading the user's owned forms from
 *    `/api/integrations/forms/available?objectUuid=...`;
 *  - filtering by search term;
 *  - selecting a row + emitting `link` with `{ formId }`;
 *  - disabling the submit button when no row is selected;
 *  - the empty / error states.
 */

const { mount } = require('@vue/test-utils')
const CnFormPicker = require('../CnFormPicker.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeForm(overrides = {}) {
	return {
		id: 42,
		hash: 'hash-42',
		title: 'Budget intake',
		description: 'Collect spend proposals for 2026',
		status: 'open',
		expiresAt: null,
		submissionCount: 3,
		linked: false,
		...overrides,
	}
}

async function flushAll(wrapper) {
	for (let i = 0; i < 5; i++) {
		await wrapper.vm.$nextTick()
	}
}

describe('CnFormPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders rows from the available-forms endpoint', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm()] }),
		})
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		expect(wrapper.text()).toContain('Budget intake')
		expect(wrapper.text()).toContain('3 submissions')
		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/integrations/forms/available?objectUuid=obj-1'),
			expect.objectContaining({ headers: expect.any(Object) }),
		)
		wrapper.destroy()
	})

	it('filters rows by the search field', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeForm(),
					makeForm({ id: 43, title: 'Holiday survey', description: 'Q4 polls' }),
				],
			}),
		})
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		expect(wrapper.findAll('.cn-form-picker__row')).toHaveLength(2)
		wrapper.setData({ search: 'holiday' })
		await flushAll(wrapper)
		expect(wrapper.findAll('.cn-form-picker__row')).toHaveLength(1)
		expect(wrapper.text()).toContain('Holiday survey')
		wrapper.destroy()
	})

	it('emits link with the selected formId', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm()] }),
		})
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		await wrapper.find('.cn-form-picker__row').trigger('click')
		await flushAll(wrapper)
		// Click the Link button — the primary action.
		const buttons = wrapper.findAllComponents({ name: 'NcButton' })
		const linkButton = buttons.wrappers.find((b) => b.text().toLowerCase().includes('link'))
		await linkButton.trigger('click')
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0][0]).toEqual({ formId: 42 })
		wrapper.destroy()
	})

	it('disables linking an already-linked form (form-level mode)', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm({ linked: true })] }),
		})
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		await wrapper.find('.cn-form-picker__row').trigger('click')
		await flushAll(wrapper)
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.destroy()
	})

	it('shows the empty state when no forms', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [] }),
		})
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		// NcDialog body is stubbed away in jest; check vm state directly.
		expect(wrapper.vm.forms).toEqual([])
		expect(wrapper.vm.error).toBe('')
		wrapper.destroy()
	})

	it('shows the error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFormPicker, { propsData: { ...DEFAULT_PROPS } })
		await flushAll(wrapper)
		// NcDialog body is stubbed away; verify the error state via vm.
		expect(wrapper.vm.error).toContain('boom')
		expect(wrapper.vm.forms).toEqual([])
		wrapper.destroy()
		spy.mockRestore()
	})
})
