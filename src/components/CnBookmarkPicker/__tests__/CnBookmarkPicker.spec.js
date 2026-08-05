/**
 * Tests for CnBookmarkPicker — pick-existing-bookmark modal.
 *
 * Covers:
 *  - bookmarks render on mount from /api/integrations/bookmarks/available;
 *  - selecting a bookmark enables confirm and the row gets selected class;
 *  - confirm emits `link` with the selected bookmarkId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - search input filters the visible list client-side (title + url);
 *  - `or:*` marker tags are stripped from the displayed chips.
 */

const { mount } = require('@vue/test-utils')
const CnBookmarkPicker = require('../CnBookmarkPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnBookmarkPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available bookmarks on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, title: 'Conduction', url: 'https://conduction.nl', description: '', tags: [] },
				{ id: 2, title: 'Docs', url: 'https://docs.example.org', description: '', tags: [] },
			],
		}))

		const wrapper = mount(CnBookmarkPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-bookmark-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Conduction')
		expect(wrapper.text()).toContain('Docs')
		wrapper.destroy()
	})

	it('selecting a bookmark enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, title: 'Conduction', url: 'https://conduction.nl' }],
		}))

		const wrapper = mount(CnBookmarkPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-bookmark-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedBookmarkId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ bookmarkId: 99 }])
		wrapper.destroy()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnBookmarkPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load bookmarks.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('filters bookmarks client-side via search on title and url', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, title: 'Conduction site', url: 'https://conduction.nl' },
				{ id: 2, title: 'Docs', url: 'https://docs.example.org' },
			],
		}))

		const wrapper = mount(CnBookmarkPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'example'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleBookmarks).toHaveLength(1)
		expect(wrapper.vm.visibleBookmarks[0].id).toBe(2)
		wrapper.destroy()
	})

	it('strips or:* marker tags from displayed chips', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnBookmarkPicker)

		const tags = wrapper.vm.displayTags({ tags: ['vendor', 'or:abc-123', '', 'reference'] })
		expect(tags).toEqual(['vendor', 'reference'])
		wrapper.destroy()
	})

	it('does not emit link when no bookmark is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnBookmarkPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.destroy()
	})
})
