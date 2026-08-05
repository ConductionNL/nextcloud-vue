/**
 * Tests for CnBookmarksTab — bespoke sidebar tab for the `bookmarks`
 * integration.
 *
 * Covers:
 *  - empty-state with "Open Bookmarks" CTA when the provider returns no rows;
 *  - row rendering: title, URL, description, tag chips;
 *  - tag-chip filter narrows the list client-side (integration-bookmarks
 *    spec: Tag-Aware Display);
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnBookmarksTab = require('../CnBookmarksTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeBookmark(overrides = {}) {
	return {
		id: 1,
		title: 'Example doc',
		url: 'https://example.com/spec',
		description: 'A reference URL',
		tags: ['legal', 'reference'],
		added: 1716537600,
		...overrides,
	}
}

describe('CnBookmarksTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Bookmarks" CTA when no bookmarks', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No bookmarks linked yet')
		expect(wrapper.text()).toContain('Open Bookmarks')
		wrapper.unmount()
	})

	it('renders one row per bookmark with title + URL + description', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBookmark({ id: 1, title: 'Alpha', url: 'https://alpha.test/', description: 'first ref' }),
					makeBookmark({ id: 2, title: 'Bravo', url: 'https://bravo.test/', description: 'second ref' }),
				],
			}),
		})
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-bookmarks-tab__row')
		expect(rows).toHaveLength(2)
		// Titles are bound to the NcListItem `name` attribute (the stub
		// spreads bound attrs onto its root element).
		const names = rows.map((r) => r.attributes('name'))
		expect(names).toContain('Alpha')
		expect(names).toContain('Bravo')
		// The URL subline drops the scheme + trailing slash, NC-Bookmarks style.
		expect(wrapper.text()).toContain('alpha.test')
		expect(wrapper.text()).toContain('first ref')
	})

	it('renders Bookmarks-side tag chips and hides the OR marker tag', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBookmark({ id: 1, tags: ['legal', 'or:obj-1', 'reference'] }),
				],
			}),
		})
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chips = wrapper.findAll('.cn-bookmarks-tab__chip')
		const chipTexts = chips.map((c) => c.text())
		expect(chipTexts).toContain('legal')
		expect(chipTexts).toContain('reference')
		expect(chipTexts).not.toContain('or:obj-1')
		wrapper.unmount()
	})

	it('filters the list by tag when a chip is clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBookmark({ id: 1, title: 'Alpha', url: 'https://alpha.test/', tags: ['legal'] }),
					makeBookmark({ id: 2, title: 'Bravo', url: 'https://bravo.test/', tags: ['research'] }),
					makeBookmark({ id: 3, title: 'Charlie', url: 'https://charlie.test/', tags: ['legal', 'research'] }),
				],
			}),
		})
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-bookmarks-tab__row')).toHaveLength(3)
		const chips = wrapper.findAll('.cn-bookmarks-tab__chip')
		const legalChip = chips.find((c) => c.text() === 'legal')
		await legalChip.trigger('click')
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-bookmarks-tab__row')
		expect(rows).toHaveLength(2)
		const names = rows.map((r) => r.attributes('name'))
		expect(names).toContain('Alpha')
		expect(names).toContain('Charlie')
		expect(names).not.toContain('Bravo')
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Bookmarks is currently unavailable.')
		expect(wrapper.find('.cn-bookmarks-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnBookmarksTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load bookmarks.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
