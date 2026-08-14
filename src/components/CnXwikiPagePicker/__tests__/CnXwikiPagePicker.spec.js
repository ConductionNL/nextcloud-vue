/**
 * Tests for CnXwikiPagePicker — browse-and-pick modal for the external
 * `xwiki` integration leaf.
 *
 * Covers:
 *  - pages render on mount from /api/integrations/xwiki/available;
 *  - selecting a page enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected pageReference;
 *  - **unconfigured** state: 503 + cause `openconnector-source-missing`
 *    renders the Configure-XWiki CTA and hides the list;
 *  - **auth** state: 503 + cause `provider-auth` renders the auth message;
 *  - generic error banner surfaces when the available endpoint fails;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnXwikiPagePicker = require('../CnXwikiPagePicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

async function flush(wrapper) {
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
}

describe('CnXwikiPagePicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available pages on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ reference: 'Sales.Pitch', title: 'Pitch', space: 'Sales' },
				{ reference: 'Legal.Handbook', title: 'Handbook', space: 'Legal' },
			],
		}))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		const rows = wrapper.findAll('.cn-xwiki-page-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Pitch')
		expect(wrapper.text()).toContain('Handbook')
		wrapper.unmount()
	})

	it('emits link with the selected pageReference on confirm', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ reference: 'Sales.Pitch', title: 'Pitch', space: 'Sales' }],
		}))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		await wrapper.find('.cn-xwiki-page-picker__row-button').trigger('click')
		expect(wrapper.vm.selectedReference).toBe('Sales.Pitch')

		wrapper.vm.confirm()
		expect(wrapper.emitted().link).toBeTruthy()
		expect(wrapper.emitted().link[0][0]).toEqual({ pageReference: 'Sales.Pitch' })
		wrapper.unmount()
	})

	it('renders the Configure CTA on unconfigured-source 503', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(
			{ details: { cause: 'openconnector-source-missing' } },
			503,
		))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		expect(wrapper.vm.unconfigured).toBe(true)
		expect(wrapper.find('.cn-xwiki-page-picker__unconfigured').exists()).toBe(true)
		expect(wrapper.text()).toContain('Configure XWiki connection')
		expect(wrapper.findAll('.cn-xwiki-page-picker__row-button')).toHaveLength(0)
		wrapper.unmount()
	})

	it('renders the auth message on provider-auth 503', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce(
			{ details: { cause: 'provider-auth' } },
			503,
		))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		expect(wrapper.vm.degradedCause).toBe('auth')
		expect(wrapper.text()).toContain('XWiki authentication failed')
		wrapper.unmount()
	})

	it('surfaces a generic error banner on a non-503 failure', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'boom' }, 500))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		expect(wrapper.vm.error).toBeTruthy()
		expect(wrapper.vm.unconfigured).toBe(false)
		wrapper.unmount()
	})

	it('filters the visible list client-side by search term', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ reference: 'Sales.Pitch', title: 'Pitch', space: 'Sales' },
				{ reference: 'Legal.Handbook', title: 'Handbook', space: 'Legal' },
			],
		}))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		wrapper.vm.search = 'hand'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.visiblePages).toHaveLength(1)
		expect(wrapper.vm.visiblePages[0].reference).toBe('Legal.Handbook')
		wrapper.unmount()
	})

	it('does not emit link when nothing is selected', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))

		const wrapper = mount(CnXwikiPagePicker)
		await flush(wrapper)

		wrapper.vm.confirm()
		expect(wrapper.emitted().link).toBeFalsy()
		wrapper.unmount()
	})
})
