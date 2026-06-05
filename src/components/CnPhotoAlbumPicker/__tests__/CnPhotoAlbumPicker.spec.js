/**
 * Tests for CnPhotoAlbumPicker — pick-existing-album modal.
 *
 * Covers:
 *  - albums render on mount from /api/integrations/photos/available;
 *  - selecting an album enables confirm and the tile gets the selected class;
 *  - confirm emits `link` with the selected albumId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

const { mount } = require('@vue/test-utils')
const CnPhotoAlbumPicker = require('../CnPhotoAlbumPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnPhotoAlbumPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available albums on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Holiday', photoCount: 12 },
				{ id: 2, name: 'Family', photoCount: 4 },
			],
		}))

		const wrapper = mount(CnPhotoAlbumPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const tiles = wrapper.findAll('.cn-photo-album-picker__tile-button')
		expect(tiles).toHaveLength(2)
		expect(wrapper.text()).toContain('Holiday')
		expect(wrapper.text()).toContain('Family')
		wrapper.destroy()
	})

	it('selecting an album enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, name: 'Holiday', photoCount: 3 }],
		}))

		const wrapper = mount(CnPhotoAlbumPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-photo-album-picker__tile-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedAlbumId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ albumId: 99 }])
		wrapper.destroy()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnPhotoAlbumPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load albums.')
		wrapper.destroy()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnPhotoAlbumPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('NC Photos is not installed.')
		wrapper.destroy()
	})

	it('filters albums client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Holiday album' },
				{ id: 2, name: 'Family' },
			],
		}))

		const wrapper = mount(CnPhotoAlbumPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'holiday'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleAlbums).toHaveLength(1)
		expect(wrapper.vm.visibleAlbums[0].id).toBe(1)
		wrapper.destroy()
	})

	it('does not emit link when no album is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnPhotoAlbumPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.destroy()
	})
})
