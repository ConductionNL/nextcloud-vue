/**
 * Tests for CnTimeTrackerTab — bespoke sidebar tab for the
 * `time-tracker` integration.
 *
 * Covers:
 *  - empty-state with "Open TimeManager" CTA when no rows;
 *  - row rendering across all three kinds (client / task / time entry)
 *    each with its discriminator chip;
 *  - duration formatting (hours + minutes);
 *  - graceful 503 handling;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnTimeTrackerTab = require('../CnTimeTrackerTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeClient(overrides = {}) {
	return {
		id: 1,
		name: 'Acme Corp',
		kind: 'client',
		tasks: 4,
		...overrides,
	}
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
		billable: false,
		startedAt: '2026-05-20T09:00:00+00:00',
		...overrides,
	}
}

describe('CnTimeTrackerTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open TimeManager" CTA when no rows', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnTimeTrackerTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No tracked time linked yet')
		expect(wrapper.text()).toContain('Open TimeManager')
		wrapper.unmount()
	})

	it('renders each kind with its own chip + duration / billable / started-at metadata', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [makeClient(), makeTask(), makeTimeEntry()],
			}),
		})
		const wrapper = mount(CnTimeTrackerTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-time-tracker-tab__kind-chip--client').exists()).toBe(true)
		expect(wrapper.find('.cn-time-tracker-tab__kind-chip--task').exists()).toBe(true)
		expect(wrapper.find('.cn-time-tracker-tab__kind-chip--time').exists()).toBe(true)
		// Titles are passed to NcListItem via the `name` prop (rendered as
		// an attribute by the test-env stub), not inline text.
		const names = wrapper.findAll('.cn-time-tracker-tab__row')			.map((w) => w.attributes('name'))
		expect(names).toContain('Acme Corp')
		expect(names).toContain('Migrate database')
		expect(names).toContain('Morning session')
		const txt = wrapper.text()
		// 2h 0m + 0h 30m durations (rendered in the #details slot)
		expect(txt).toContain('2h 0m')
		expect(txt).toContain('30m')
		// total-duration summary header aggregates 7200s + 1800s = 2h 30m
		expect(wrapper.find('.cn-time-tracker-tab__summary-value').text()).toContain('2h 30m')
		// billable indicator
		expect(wrapper.find('.cn-time-tracker-tab__billable').exists()).toBe(true)
		wrapper.unmount()
	})

	it('defaults kind to client when the provider omits the discriminator', async () => {
		// Mirrors the current shipping TimeProvider (projects-as-clients
		// without an explicit `kind` field).
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [{ id: 7, title: 'Legacy project', data: { uuid: 'u-7' } }] }),
		})
		const wrapper = mount(CnTimeTrackerTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-time-tracker-tab__kind-chip--client').exists()).toBe(true)
		expect(wrapper.find('.cn-time-tracker-tab__row').attributes('name')).toBe('Legacy project')
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnTimeTrackerTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC TimeManager is currently unavailable.')
		expect(wrapper.find('.cn-time-tracker-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnTimeTrackerTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load tracked time.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
