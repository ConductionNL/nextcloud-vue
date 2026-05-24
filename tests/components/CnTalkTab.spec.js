/**
 * Tests for CnTalkTab — bespoke sidebar tab for the `talk` integration.
 *
 * Covers:
 *  - empty-state with "Open Talk" CTA when the provider returns no rooms;
 *  - row rendering: title, last-message preview, unread badge presence and
 *    99+ cap;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnTalkTab = require('../../src/integrations/builtin/talk/CnTalkTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeRoom(overrides = {}) {
	return {
		id: 'tok-abc',
		title: 'Project kickoff',
		lastMessage: { message: 'See you tomorrow' },
		unreadMessages: 3,
		participantCount: 4,
		lastActivity: 1716537600,
		...overrides,
	}
}

describe('CnTalkTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Talk" CTA when no rooms', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No conversations linked yet')
		expect(wrapper.text()).toContain('Open Talk')
		wrapper.destroy()
	})

	it('renders one row per room with title + preview', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ id: 'a', title: 'Alpha', lastMessage: { message: 'hi a' }, unreadMessages: 0 }),
					makeRoom({ id: 'b', title: 'Bravo', lastMessage: { message: 'hi b' }, unreadMessages: 1 }),
				],
			}),
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-talk-tab__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Alpha')
		expect(wrapper.text()).toContain('Bravo')
		expect(wrapper.text()).toContain('hi a')
		expect(wrapper.text()).toContain('hi b')
		wrapper.destroy()
	})

	it('renders an unread badge only for rooms with unread > 0 and caps at 99+', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ id: 'a', title: 'Alpha', unreadMessages: 0 }),
					makeRoom({ id: 'b', title: 'Bravo', unreadMessages: 7 }),
					makeRoom({ id: 'c', title: 'Charlie', unreadMessages: 250 }),
				],
			}),
		})
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const badges = wrapper.findAll('.cn-talk-tab__badge')
		expect(badges).toHaveLength(2)
		const texts = badges.wrappers.map((b) => b.text())
		expect(texts).toContain('7')
		expect(texts).toContain('99+')
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Talk is currently unavailable.')
		// Also still renders the empty state (rooms cleared)
		expect(wrapper.find('.cn-talk-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		// Silence the expected console.error from the component's catch.
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnTalkTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load conversations.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
