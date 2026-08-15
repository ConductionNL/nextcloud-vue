/**
 * Tests for CnOpenprojectCard — bespoke surface-aware widget for the
 * `openproject` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + status
 *    distribution + auth-status badge (configured vs unconfigured vs
 *    expired);
 *  - detail-page: bounded row list with linked-WP highlight + auth
 *    banner pre-empts the rows;
 *  - single-entity: chip rendering with status pill.
 * Plus error / unavailable / unconfigured handling that surfaces
 * branching paths instead of empty silently.
 */

const { mount } = require('@vue/test-utils')
const CnOpenprojectCard = require('../CnOpenprojectCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makeWp(overrides = {}) {
	return {
		id: 101,
		title: 'Investigate ticket',
		status: 'In progress',
		type: 'Task',
		priority: 'Normal',
		assignee: 'Alice',
		project: 'Migration',
		url: 'https://openproject.example/wp/101',
		linkedAt: '2026-05-23T10:00:00+00:00',
		...overrides,
	}
}

describe('CnOpenprojectCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked work packages', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No work packages linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + status distribution on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeWp({ id: 1, status: 'New' }),
					makeWp({ id: 2, status: 'New' }),
					makeWp({ id: 3, status: 'In progress' }),
					makeWp({ id: 4, status: 'Closed' }),
				],
			}),
		})
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const text = wrapper.text()
		expect(text).toContain('4')
		expect(wrapper.find('.cn-openproject-card__headline').exists()).toBe(true)
		expect(wrapper.find('.cn-openproject-card__distribution').exists()).toBe(true)
		// 3 distinct status buckets.
		expect(wrapper.findAll('.cn-openproject-card__distribution-row')).toHaveLength(3)
		// "Connected" auth badge surfaces when source is configured + responsive.
		expect(text).toContain('Connected')
		wrapper.unmount()
	})

	it('groups statuses into pill-class buckets even when the source labels vary', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeWp({ id: 1, status: 'In progress' }),
					makeWp({ id: 2, status: 'Done' }),
					makeWp({ id: 3, status: 'Resolved' }),
				],
			}),
		})
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'app-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-openproject-card__distribution-row')
		expect(rows.length).toBeGreaterThanOrEqual(2)
		// One progress dot, two done-class dots ("Done" and "Resolved" both map to done).
		expect(wrapper.findAll('.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--progress').length).toBeGreaterThan(0)
		expect(wrapper.findAll('.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--done').length).toBeGreaterThan(0)
		wrapper.unmount()
	})

	it('renders a bounded row list on the detail-page surface and highlights the linked WP', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeWp({ id: 1, title: 'First' }),
					makeWp({ id: 2, title: 'Second' }),
					makeWp({ id: 3, title: 'Third' }),
				],
			}),
		})
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page', value: '2' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-openproject-card__row')
		expect(rows).toHaveLength(3)
		const highlighted = wrapper.findAll('.cn-openproject-card__row--highlight')
		expect(highlighted).toHaveLength(1)
		expect(highlighted.at(0).text()).toContain('Second')
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface with subject + status pill', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeWp({ id: 42, title: 'Migrate DB', status: 'In progress' })),
		})
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 42 } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-openproject-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Migrate DB')
		expect(chip.text()).toContain('In progress')
		expect(chip.find('.cn-openproject-card__chip-pill--progress').exists()).toBe(true)
		wrapper.unmount()
	})

	it('surfaces the unconfigured auth state (412) on the dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 412, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('OpenProject not configured in OpenConnector')
		expect(wrapper.find('.cn-openproject-card__auth-badge--warn').exists()).toBe(true)
		wrapper.unmount()
	})

	it('surfaces the auth-expired state (401) on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Authorisation for OpenProject expired')
		expect(wrapper.find('.cn-openproject-card__auth-badge--error').exists()).toBe(true)
		expect(wrapper.find('.cn-openproject-card__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('OpenProject is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnOpenprojectCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No work packages linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})
})
