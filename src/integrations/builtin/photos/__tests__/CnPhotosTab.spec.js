/**
 * Tests for CnPhotosTab — bespoke sidebar tab for the `photos`
 * integration.
 *
 * Covers:
 *  - empty-state with "Open Photos" CTA when the provider returns no rows;
 *  - tile rendering: album name, photo count, last-edited date,
 *    deep-link href into the NC Photos app;
 *  - `[or:{uuid}]` marker is stripped from displayed name;
 *  - cover thumbnail fallback to placeholder icon on image error;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnPhotosTab = require('../CnPhotosTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeAlbum(overrides = {}) {
	return {
		id: 'album-1',
		title: 'Site visit',
		url: '/index.php/apps/photos/albums/Site%20visit',
		coverPhotoUrl: '/index.php/core/preview?fileId=42&x=256&y=256',
		photoCount: 12,
		lastEdited: '2026-04-15T10:30:00Z',
		data: { album_id: 'album-1', name: 'Site visit', user: 'admin', created: '2026-04-15T10:30:00Z' },
		...overrides,
	}
}

describe('CnPhotosTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Photos" CTA when no albums', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No albums linked yet')
		expect(wrapper.text()).toContain('Open Photos')
		wrapper.destroy()
	})

	it('renders one tile per album with name + photo count + deep-link href', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeAlbum({ id: 'a', title: 'Alpha', url: '/index.php/apps/photos/albums/Alpha', photoCount: 5 }),
					makeAlbum({ id: 'b', title: 'Bravo', url: '/index.php/apps/photos/albums/Bravo', photoCount: 11 }),
				],
			}),
		})
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const tiles = wrapper.findAll('.cn-photos-tab__tile')
		expect(tiles).toHaveLength(2)
		expect(wrapper.text()).toContain('Alpha')
		expect(wrapper.text()).toContain('Bravo')
		expect(wrapper.text()).toContain('5 photos')
		expect(wrapper.text()).toContain('11 photos')
		expect(tiles.at(0).attributes('href')).toBe('/index.php/apps/photos/albums/Alpha')
		wrapper.destroy()
	})

	it('strips the [or:{uuid}] marker from the displayed album name', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{ id: 'a', title: 'Site visit [or:obj-1]', data: { album_id: 'a', name: 'Site visit [or:obj-1]' } },
				],
			}),
		})
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const text = wrapper.text()
		expect(text).toContain('Site visit')
		expect(text).not.toContain('[or:obj-1]')
		wrapper.destroy()
	})

	it('falls back to a placeholder icon when the cover image errors', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeAlbum({ id: 'a', coverPhotoUrl: '/broken.jpg' })],
			}),
		})
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// cover img renders initially
		expect(wrapper.find('img.cn-photos-tab__cover-img').exists()).toBe(true)
		// trigger error
		await wrapper.find('img.cn-photos-tab__cover-img').trigger('error')
		await wrapper.vm.$nextTick()
		// placeholder icon takes over
		expect(wrapper.find('img.cn-photos-tab__cover-img').exists()).toBe(false)
		expect(wrapper.find('.cn-photos-tab__cover-fallback').exists()).toBe(true)
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Photos is currently unavailable.')
		expect(wrapper.find('.cn-photos-tab__tile').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnPhotosTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load albums.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
