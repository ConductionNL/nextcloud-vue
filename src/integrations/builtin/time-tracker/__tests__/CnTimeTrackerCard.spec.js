/**
 * Tests for CnTimeTrackerCard — bespoke surface-aware widget for the
 * `time-tracker` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + total tracked
 *    time + kind distribution;
 *  - detail-page: bounded row list with kind chip + duration;
 *  - single-entity: chip rendering with kind pill.
 * Plus error / unavailable handling.
 */

const { mount } = require('@vue/test-utils')
const CnTimeTrackerCard = require('../CnTimeTrackerCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeTask(overrides = {}) {
	return {
		id: 10,
		name: 'Migrate database',
		kind: 'task',
		clientId: 1,
		duration: 7200, // 2h
		billable: true,
		...overrides,
	}
}

function makeTimeEntry(overrides = {}) {
	return {
		id: 100,
		name: 'Morning session',
		kind: 'time',
		taskId: 10,
		duration: 1800, // 30m
		startedAt: '2026-05-20T09:00:00+00:00',
		...overrides,
	}
}

describe('CnTimeTrackerCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked rows', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No tracked time linked yet')
		wrapper.destroy()
	})

	it('renders a count headline + total tracked time on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeTask({ id: 1, duration: 3600 }), // 1h
					makeTimeEntry({ id: 2, duration: 1800 }), // 30m
					makeTimeEntry({ id: 3, duration: 900 }), // 15m
				],
			}),
		})
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// 3 rows
		expect(txt).toContain('3')
		// total = 1h 45m (1h + 30m + 15m)
		expect(txt).toContain('1h 45m')
		expect(wrapper.find('.cn-time-tracker-card__headline').exists()).toBe(true)
		expect(wrapper.find('.cn-time-tracker-card__distribution').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders the detail-page list with kind pills + highlights the linked row', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeTask({ id: 1 }), makeTimeEntry({ id: 2 })],
			}),
		})
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page', value: '2' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-time-tracker-card__row')
		expect(rows).toHaveLength(2)
		const highlighted = wrapper.findAll('.cn-time-tracker-card__row--highlight')
		expect(highlighted).toHaveLength(1)
		expect(wrapper.find('.cn-time-tracker-card__chip-pill--task').exists()).toBe(true)
		expect(wrapper.find('.cn-time-tracker-card__chip-pill--time').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeTask({ id: 42, name: 'Code review', duration: 5400 })),
		})
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 42 } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-time-tracker-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Code review')
		expect(chip.text()).toContain('Task')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC TimeManager is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnTimeTrackerCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No tracked time linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})
