/**
 * Tests for CnActivityTab — bespoke sidebar tab for the `activity` integration.
 *
 * Covers:
 *  - empty state when the provider returns no entries;
 *  - chronological timeline render grouped by day (Today / Yesterday / older);
 *  - row metadata: subject, actor, time;
 *  - load-more paging appends without resetting the list;
 *  - 503 "unavailable" banner;
 *  - generic-error path when fetch throws.
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

describe('CnActivityTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state when the provider returns no entries', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No activity yet for this object')
		wrapper.destroy()
	})

	it('groups entries by day with Today and Yesterday headers', async () => {
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
		const yesterday = new Date(today.getTime() - 86400000)
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeEntry({ id: 'a', subject: 'Today event 1', timestamp: Math.floor(today.getTime() / 1000) }),
					makeEntry({ id: 'b', subject: 'Today event 2', timestamp: Math.floor(today.getTime() / 1000) - 60 }),
					makeEntry({ id: 'c', subject: 'Yesterday event', timestamp: Math.floor(yesterday.getTime() / 1000) }),
				],
				total: 3,
			}),
		})
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const days = wrapper.findAll('.cn-activity-tab__day')
		expect(days).toHaveLength(2)
		const text = wrapper.text()
		expect(text).toContain('Today')
		expect(text).toContain('Yesterday')
		expect(text).toContain('Today event 1')
		expect(text).toContain('Yesterday event')
		wrapper.destroy()
	})

	it('renders subject and actor for each entry', async () => {
		const now = Math.floor(Date.now() / 1000)
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeEntry({ id: 'a', subject: 'Bob added a comment', actor_id: 'bob', timestamp: now }),
				],
				total: 1,
			}),
		})
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Bob added a comment')
		expect(wrapper.text()).toContain('bob')
		wrapper.destroy()
	})

	it('appends a second page of entries when load-more is clicked', async () => {
		const now = Math.floor(Date.now() / 1000)
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({
					results: [
						makeEntry({ id: 'p1-a', subject: 'Page1 event A', timestamp: now }),
						makeEntry({ id: 'p1-b', subject: 'Page1 event B', timestamp: now - 60 }),
					],
					total: 4,
				}),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({
					results: [
						makeEntry({ id: 'p2-a', subject: 'Page2 event A', timestamp: now - 120 }),
						makeEntry({ id: 'p2-b', subject: 'Page2 event B', timestamp: now - 180 }),
					],
					total: 4,
				}),
			})

		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS, pageSize: 2 } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.entries).toHaveLength(2)
		expect(wrapper.vm.hasMore).toBe(true)

		await wrapper.vm.loadMore()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.entries).toHaveLength(4)
		// Second fetch was for page 2.
		const lastCall = global.fetch.mock.calls[1][0]
		expect(lastCall).toContain('_page=2')
		expect(wrapper.text()).toContain('Page1 event A')
		expect(wrapper.text()).toContain('Page2 event A')
		wrapper.destroy()
	})

	it('renders the unavailable banner on 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Activity is currently unavailable.')
		wrapper.destroy()
	})

	it('falls back to an error banner when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnActivityTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load activity.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
