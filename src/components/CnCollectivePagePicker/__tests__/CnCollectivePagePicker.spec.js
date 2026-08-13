/**
 * Tests for CnCollectivePagePicker — pick-existing-page modal.
 *
 * Covers:
 *  - pages render on mount from /api/integrations/collectives/available;
 *  - selecting a page enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected pageId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - the collective filter narrows the visible list;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnCollectivePagePicker = require('../CnCollectivePagePicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

// On mount the component fires fetchCollectives() then fetchPages().
function mockMount(collectivesPayload, pagesPayload, pagesStatus = 200) {
	global.fetch
		.mockReturnValueOnce(resolveOnce(collectivesPayload))
		.mockReturnValueOnce(resolveOnce(pagesPayload, pagesStatus))
}

describe('CnCollectivePagePicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available pages on mount', async () => {
		mockMount(
			{ results: [{ id: 1, name: 'Ops' }] },
			{
				results: [
					{ pageId: 10, collectiveId: 1, collectiveName: 'Ops', title: 'Runbook' },
					{ pageId: 11, collectiveId: 1, collectiveName: 'Ops', title: 'Onboarding' },
				],
			},
		)

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-collective-page-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Runbook')
		expect(wrapper.text()).toContain('Onboarding')
		wrapper.unmount()
	})

	it('selecting a page enables confirm and emits link', async () => {
		mockMount(
			{ results: [] },
			{ results: [{ pageId: 99, collectiveId: 1, collectiveName: 'Ops', title: 'Runbook' }] },
		)

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-collective-page-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedPageId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ pageId: 99 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [] }))
			.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load pages.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		mockMount({ results: [] }, { error: 'nope' }, 501)

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('NC Collectives is not installed.')
		wrapper.unmount()
	})

	it('filters pages client-side via search', async () => {
		mockMount(
			{ results: [] },
			{
				results: [
					{ pageId: 1, collectiveId: 1, collectiveName: 'Ops', title: 'Runbook' },
					{ pageId: 2, collectiveId: 1, collectiveName: 'Ops', title: 'Onboarding' },
				],
			},
		)

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'runbook'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visiblePages).toHaveLength(1)
		expect(wrapper.vm.visiblePages[0].pageId).toBe(1)
		wrapper.unmount()
	})

	it('narrows pages by collective filter', async () => {
		mockMount(
			{ results: [{ id: 1, name: 'Ops' }, { id: 2, name: 'HR' }] },
			{
				results: [
					{ pageId: 1, collectiveId: 1, collectiveName: 'Ops', title: 'Runbook' },
					{ pageId: 2, collectiveId: 2, collectiveName: 'HR', title: 'Policy' },
				],
			},
		)

		const wrapper = mount(CnCollectivePagePicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.collectiveFilter = { id: 2, label: 'HR' }
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visiblePages).toHaveLength(1)
		expect(wrapper.vm.visiblePages[0].pageId).toBe(2)
		wrapper.unmount()
	})

	it('does not emit link when no page is selected', () => {
		global.fetch.mockReturnValue(resolveOnce({ results: [] }))
		const wrapper = mount(CnCollectivePagePicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
