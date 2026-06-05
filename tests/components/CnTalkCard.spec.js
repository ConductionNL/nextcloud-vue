/**
 * Tests for CnTalkCard — bespoke surface-aware widget for the `talk`
 * integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: unread headline + most-recent line;
 *  - detail-page: list with last-message previews;
 *  - single-entity: chip with optional unread badge.
 * Plus error / unavailable handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnTalkCard = require('../../src/integrations/builtin/talk/CnTalkCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeRoom(overrides = {}) {
	return {
		id: 'tok-abc',
		title: 'Project kickoff',
		lastMessage: { message: 'See you tomorrow' },
		unreadMessages: 0,
		participantCount: 4,
		lastActivity: 1716537600,
		...overrides,
	}
}

describe('CnTalkCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked conversations', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No conversations linked yet')
		wrapper.destroy()
	})

	it('renders an unread headline on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ id: 'a', title: 'Alpha', unreadMessages: 4 }),
					makeRoom({ id: 'b', title: 'Bravo', unreadMessages: 3 }),
					makeRoom({ id: 'c', title: 'Charlie', unreadMessages: 0 }),
				],
			}),
		})
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// 7 unread across 3 conversations
		const txt = wrapper.text()
		expect(txt).toContain('7')
		expect(txt).toContain('3')
		// Headline element is present
		expect(wrapper.find('.cn-talk-card__headline').exists()).toBe(true)
		wrapper.destroy()
	})

	it('falls back to the "N conversations" headline when nothing is unread', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ id: 'a', title: 'Alpha', unreadMessages: 0 }),
					makeRoom({ id: 'b', title: 'Bravo', unreadMessages: 0 }),
				],
			}),
		})
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// "2 conversations" should appear; no "unread" headline word.
		expect(txt).toContain('2')
		expect(txt.toLowerCase()).not.toContain('unread')
		wrapper.destroy()
	})

	it('renders a list with unread badges on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeRoom({ id: 'a', title: 'Alpha', unreadMessages: 0 }),
					makeRoom({ id: 'b', title: 'Bravo', unreadMessages: 2 }),
				],
			}),
		})
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-talk-card__row')
		expect(rows).toHaveLength(2)
		const badges = wrapper.findAll('.cn-talk-card__badge')
		expect(badges).toHaveLength(1)
		expect(badges.at(0).text()).toBe('2')
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeRoom({ id: 'tok-z', title: 'Status updates', unreadMessages: 5 })),
		})
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'tok-z' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-talk-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Status updates')
		expect(chip.text()).toContain('5')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Talk is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnTalkCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No conversations linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})
