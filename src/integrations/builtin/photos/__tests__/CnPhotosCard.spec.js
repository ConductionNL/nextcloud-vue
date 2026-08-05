/**
 * Tests for CnPhotosCard — bespoke surface-aware widget for the
 * `photos` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: album-count headline + first-album
 *    cover + total photo count;
 *  - detail-page: 2-column compact thumbnail grid + view-all trail-off;
 *  - single-entity: cover-thumbnail chip with album name.
 * Plus 503 unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnPhotosCard = require('../CnPhotosCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeAlbum(overrides = {}) {
	return {
		id: 'album-1',
		title: 'Site visit',
		url: '/index.php/apps/photos/albums/Site%20visit',
		coverPhotoUrl: '/index.php/core/preview?fileId=42&x=256&y=256',
		photoCount: 12,
		data: { album_id: 'album-1', name: 'Site visit', user: 'admin', created: '2026-04-15T10:30:00Z' },
		...overrides,
	}
}

describe('CnPhotosCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked albums', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No albums linked yet')
		wrapper.destroy()
	})

	it('renders a count headline and total photo count on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeAlbum({ id: 'a', title: 'Alpha', photoCount: 5 }),
					makeAlbum({ id: 'b', title: 'Bravo', photoCount: 11 }),
					makeAlbum({ id: 'c', title: 'Charlie', photoCount: 3 }),
				],
			}),
		})
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('3 albums')
		expect(txt).toContain('19 photos')
		// First album shows
		expect(txt).toContain('Alpha')
		wrapper.destroy()
	})

	it('renders the compact 2-column grid with view-all trail-off on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeAlbum({ id: 'a', title: 'A' }),
					makeAlbum({ id: 'b', title: 'B' }),
					makeAlbum({ id: 'c', title: 'C' }),
					makeAlbum({ id: 'd', title: 'D' }),
					makeAlbum({ id: 'e', title: 'E' }),
				],
			}),
		})
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const tiles = wrapper.findAll('.cn-photos-card__tile')
		// COMPACT_LIMIT = 4
		expect(tiles).toHaveLength(4)
		expect(wrapper.find('.cn-photos-card__view-all').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders a cover-thumbnail chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeAlbum({ id: 'a-7', title: 'Quarterly review' })),
		})
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'a-7' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-photos-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Quarterly review')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Photos is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnPhotosCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No albums linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})
