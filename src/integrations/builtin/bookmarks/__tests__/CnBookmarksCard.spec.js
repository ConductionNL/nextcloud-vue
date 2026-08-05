/**
 * Tests for CnBookmarksCard — bespoke surface-aware widget for the
 * `bookmarks` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + most-recent line;
 *  - detail-page: compact list with view-all trail-off;
 *  - single-entity: favicon + title chip.
 * Plus error / unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnBookmarksCard = require('../CnBookmarksCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeBookmark(overrides = {}) {
	return {
		id: 1,
		title: 'Example doc',
		url: 'https://example.com/spec',
		description: 'A reference URL',
		tags: ['legal'],
		added: 1716537600,
		...overrides,
	}
}

describe('CnBookmarksCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked bookmarks', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No bookmarks linked yet')
		wrapper.destroy()
	})

	it('renders a count headline on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBookmark({ id: 1, title: 'Alpha', url: 'https://alpha.test/', added: 1716537700 }),
					makeBookmark({ id: 2, title: 'Bravo', url: 'https://bravo.test/', added: 1716537800 }),
					makeBookmark({ id: 3, title: 'Charlie', url: 'https://charlie.test/', added: 1716537900 }),
				],
			}),
		})
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('3')
		expect(wrapper.find('.cn-bookmarks-card__headline').exists()).toBe(true)
		// most-recent (highest `added`) shows
		expect(txt).toContain('Charlie')
		wrapper.destroy()
	})

	it('renders a compact list with view-all trail-off on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBookmark({ id: 1, title: 'A', url: 'https://a.test/' }),
					makeBookmark({ id: 2, title: 'B', url: 'https://b.test/' }),
					makeBookmark({ id: 3, title: 'C', url: 'https://c.test/' }),
					makeBookmark({ id: 4, title: 'D', url: 'https://d.test/' }),
					makeBookmark({ id: 5, title: 'E', url: 'https://e.test/' }),
					makeBookmark({ id: 6, title: 'F', url: 'https://f.test/' }),
				],
			}),
		})
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-bookmarks-card__row')
		// COMPACT_LIMIT = 5
		expect(rows).toHaveLength(5)
		expect(wrapper.find('.cn-bookmarks-card__view-all').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeBookmark({ id: 7, title: 'Status doc', url: 'https://status.test/page' })),
		})
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '7' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-bookmarks-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Status doc')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Bookmarks is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnBookmarksCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No bookmarks linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})
