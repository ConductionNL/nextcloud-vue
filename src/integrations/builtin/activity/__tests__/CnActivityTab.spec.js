/**
 * Tests for CnActivityTab — bespoke sidebar tab for the `activity` integration.
 *
 * Tier-2 surface covered here:
 *  - empty state when the provider returns no entries;
 *  - chronological timeline render grouped by day (Today / Yesterday / older);
 *  - row metadata: subject, actor, time;
 *  - filter bar: type/actor dropdowns populated from the /types + /actors
 *    endpoints; changing a filter re-fetches with the right query params;
 *  - date-range segmented control sets the `after` query param;
 *  - cursor-based load-more appends without resetting and walks nextCursor;
 *  - 501/503 "unavailable" banner;
 *  - generic-error path when fetch throws.
 *
 * `global.fetch` is routed by URL: /types and /actors return dropdown
 * sources, everything else returns the staged entry page.
 */

const { mount } = require('@vue/test-utils')
const CnActivityTab = require('../CnActivityTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeEntry(overrides = {}) {
	return {
		id: 'ev-1',
		type: 'file_changed',
		subject: 'Alice uploaded report.pdf',
		actor_id: 'alice',
		timestamp: Math.floor(Date.now() / 1000),
		...overrides,
	}
}

function jsonOk(body) {
	return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

/**
 * Build a fetch mock that serves dropdown sources for /types + /actors
 * and delegates the entry-page response to `entryResponder(url)`.
 *
 * @param {(url: string) => object} entryResponder Returns a fetch-like response for the entry call.
 * @param {object}                  dropdowns      Optional { types, actors } arrays.
 * @return {import('jest').Mock} jest mock
 */
function routedFetch(entryResponder, dropdowns = {}) {
	const types = dropdowns.types ?? []
	const actors = dropdowns.actors ?? []
	return jest.fn((url) => {
		if (url.includes('/integrations/activity/types')) {
			return Promise.resolve(jsonOk({ results: types, total: types.length }))
		}
		if (url.includes('/integrations/activity/actors')) {
			return Promise.resolve(jsonOk({ results: actors, total: actors.length }))
		}
		return Promise.resolve(entryResponder(url))
	})
}

async function flush(wrapper) {
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
	await wrapper.vm.$nextTick()
}

describe('CnActivityTab', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state when the provider returns no entries', async () => {
		global.fetch = routedFetch(() => jsonOk({ results: [], total: 0, nextCursor: null }))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.text()).toContain('No activity yet for this object')
		wrapper.unmount()
	})

	it('groups entries by day with Today and Yesterday headers', async () => {
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
		const yesterday = new Date(today.getTime() - 86400000)
		global.fetch = routedFetch(() => jsonOk({
			results: [
				makeEntry({ id: 'a', subject: 'Today event 1', timestamp: Math.floor(today.getTime() / 1000) }),
				makeEntry({ id: 'b', subject: 'Today event 2', timestamp: Math.floor(today.getTime() / 1000) - 60 }),
				makeEntry({ id: 'c', subject: 'Yesterday event', timestamp: Math.floor(yesterday.getTime() / 1000) }),
			],
			total: 3,
			nextCursor: null,
		}))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		const days = wrapper.findAll('.cn-activity-tab__day')
		expect(days).toHaveLength(2)
		const text = wrapper.text()
		expect(text).toContain('Today')
		expect(text).toContain('Yesterday')
		expect(text).toContain('Today event 1')
		expect(text).toContain('Yesterday event')
		wrapper.unmount()
	})

	it('renders subject and actor for each entry', async () => {
		const now = Math.floor(Date.now() / 1000)
		global.fetch = routedFetch(() => jsonOk({
			results: [makeEntry({ id: 'a', subject: 'Bob added a comment', actor_id: 'bob', timestamp: now })],
			total: 1,
			nextCursor: null,
		}))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.text()).toContain('Bob added a comment')
		expect(wrapper.text()).toContain('bob')
		wrapper.unmount()
	})

	it('populates the type and actor dropdowns from the dropdown endpoints', async () => {
		global.fetch = routedFetch(
			() => jsonOk({ results: [], total: 0, nextCursor: null }),
			{ types: ['files', 'or:decision'], actors: ['alice', 'bob'] },
		)
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.vm.types).toEqual(['files', 'or:decision'])
		expect(wrapper.vm.actors).toEqual(['alice', 'bob'])
		const options = wrapper.findAll('option').wrappers.map((w) => w.text())
		expect(options).toContain('files')
		expect(options).toContain('bob')
		wrapper.unmount()
	})

	it('re-fetches with the type query param when the type filter changes', async () => {
		global.fetch = routedFetch(
			() => jsonOk({ results: [], total: 0, nextCursor: null }),
			{ types: ['files'], actors: [] },
		)
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		global.fetch.mockClear()

		wrapper.vm.selectedType = 'files'
		await wrapper.vm.resetAndFetch()
		await flush(wrapper)

		const entryCall = global.fetch.mock.calls
			.map((c) => c[0])
			.find((u) => u.includes('/activity?'))
		expect(entryCall).toContain('type=files')
		wrapper.unmount()
	})

	it('sets the after query param when a date range is selected', async () => {
		global.fetch = routedFetch(() => jsonOk({ results: [], total: 0, nextCursor: null }))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		global.fetch.mockClear()

		wrapper.vm.selectRange('7d')
		await flush(wrapper)

		const entryCall = global.fetch.mock.calls
			.map((c) => c[0])
			.find((u) => u.includes('/activity?'))
		expect(entryCall).toContain('after=')
		wrapper.unmount()
	})

	it('appends the next page via the cursor when load-more is clicked', async () => {
		const now = Math.floor(Date.now() / 1000)
		let call = 0
		global.fetch = routedFetch(() => {
			call += 1
			if (call === 1) {
				return jsonOk({
					results: [
						makeEntry({ id: 'p1-a', subject: 'Page1 event A', timestamp: now }),
						makeEntry({ id: 'p1-b', subject: 'Page1 event B', timestamp: now - 60 }),
					],
					total: 4,
					nextCursor: now - 60,
				})
			}
			return jsonOk({
				results: [
					makeEntry({ id: 'p2-a', subject: 'Page2 event A', timestamp: now - 120 }),
					makeEntry({ id: 'p2-b', subject: 'Page2 event B', timestamp: now - 180 }),
				],
				total: 4,
				nextCursor: null,
			})
		})

		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS, pageSize: 2 } })
		await flush(wrapper)
		expect(wrapper.vm.entries).toHaveLength(2)
		expect(wrapper.vm.hasMore).toBe(true)

		await wrapper.vm.loadMore()
		await flush(wrapper)
		expect(wrapper.vm.entries).toHaveLength(4)
		expect(wrapper.vm.hasMore).toBe(false)

		// The second entry fetch carried the cursor from page 1.
		const entryCalls = global.fetch.mock.calls
			.map((c) => c[0])
			.filter((u) => u.includes('/activity?'))
		expect(entryCalls[entryCalls.length - 1]).toContain(`cursor=${now - 60}`)
		expect(wrapper.text()).toContain('Page1 event A')
		expect(wrapper.text()).toContain('Page2 event A')
		wrapper.unmount()
	})

	it('renders the unavailable banner on 501', async () => {
		global.fetch = routedFetch(() => ({ ok: false, status: 501, json: () => Promise.resolve({}) }))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.text()).toContain('NC Activity is currently unavailable.')
		wrapper.unmount()
	})

	it('renders the unavailable banner on 503', async () => {
		global.fetch = routedFetch(() => ({ ok: false, status: 503, json: () => Promise.resolve({}) }))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.text()).toContain('NC Activity is currently unavailable.')
		wrapper.unmount()
	})

	it('falls back to an error banner when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn((url) => {
			if (url.includes('/integrations/activity/')) {
				return Promise.resolve(jsonOk({ results: [] }))
			}
			return Promise.reject(new Error('boom'))
		})
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)
		expect(wrapper.text()).toContain('Could not load activity.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
