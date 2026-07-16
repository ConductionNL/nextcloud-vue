/**
 * Tests for CnActivityCard — bespoke surface-aware widget for the `activity` integration.
 *
 * Covers:
 *  - dashboard headline count and today-count;
 *  - detail-page surface grouped timeline render;
 *  - single-entity chip render via fetchSingle;
 *  - empty + degraded + error fallbacks;
 *  - early-out when single-entity value missing.
 */

const { mount } = require('@vue/test-utils')
const CnActivityCard = require('../CnActivityCard.vue').default

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

describe('CnActivityCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the dashboard headline with a today count', async () => {
		const now = Math.floor(Date.now() / 1000)
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeEntry({ id: 'a', timestamp: now }),
					makeEntry({ id: 'b', timestamp: now - 60 }),
					makeEntry({ id: 'c', timestamp: now - 7 * 86400 }), // a week ago
				],
				total: 3,
			}),
		})
		const wrapper = mount(CnActivityCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toMatch(/2 today/)
		wrapper.destroy()
	})

	it('renders the empty state on dashboard surface when no entries', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnActivityCard, { propsData: { ...DEFAULT_PROPS, surface: 'app-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No activity yet for this object')
		wrapper.destroy()
	})

	it('renders grouped timeline sections on detail-page surface', async () => {
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
		const yesterday = new Date(today.getTime() - 86400000)
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeEntry({ id: 'a', subject: 'Today A', timestamp: Math.floor(today.getTime() / 1000) }),
					makeEntry({ id: 'b', subject: 'Yesterday A', timestamp: Math.floor(yesterday.getTime() / 1000) }),
				],
				total: 2,
			}),
		})
		const wrapper = mount(CnActivityCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const days = wrapper.findAll('.cn-activity-card__day')
		expect(days).toHaveLength(2)
		expect(wrapper.text()).toContain('Today A')
		expect(wrapper.text()).toContain('Yesterday A')
		wrapper.destroy()
	})

	it('renders single-entity chip from fetchSingle response', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeEntry({
				id: 'ev-99',
				subject: 'Carol shared the file',
				actor_id: 'carol',
				type: 'shared',
			})),
		})
		const wrapper = mount(CnActivityCard, {
			propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 'ev-99' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-activity-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('carol')
		expect(chip.text()).toContain('Carol shared the file')
		wrapper.destroy()
	})

	it('does not fetch on single-entity surface when value is missing', async () => {
		const wrapper = mount(CnActivityCard, {
			propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '' },
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No activity yet for this object')
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.destroy()
	})

	it('shows the unavailable label on 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnActivityCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Activity is currently unavailable.')
		wrapper.destroy()
	})

	it('falls back to an empty list when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnActivityCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No activity yet for this object')
		wrapper.destroy()
		spy.mockRestore()
	})
})
