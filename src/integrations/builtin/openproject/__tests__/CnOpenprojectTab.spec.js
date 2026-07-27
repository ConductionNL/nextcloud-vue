/**
 * Tests for CnOpenprojectTab — bespoke sidebar tab for the
 * `openproject` integration.
 *
 * Covers:
 *  - empty-state with "Open OpenProject" CTA when no work packages;
 *  - row rendering with subject, type badge, status pill, assignee;
 *  - the unconfigured (412) → "Configure OpenProject connection" CTA;
 *  - the auth-expired (401) → reconnect banner;
 *  - the upstream-error (500) → surfaced error message;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnOpenprojectTab = require('../CnOpenprojectTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
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

describe('CnOpenprojectTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open OpenProject" CTA when no work packages', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No work packages linked yet')
		expect(wrapper.text()).toContain('Open OpenProject')
		wrapper.unmount()
	})

	it('renders work-package rows with subject, type, status and assignee', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeWp({ id: 1, title: 'A', type: 'Bug', status: 'New', assignee: 'Bob' }),
					makeWp({ id: 2, title: 'B', type: 'Feature', status: 'Closed', assignee: 'Carol' }),
				],
			}),
		})
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-openproject-tab__row')
		expect(rows).toHaveLength(2)
		// Subjects are passed to NcListItem via the `name` prop (rendered
		// to the `name` attribute by the test stub).
		const names = rows.wrappers.map((w) => w.attributes('name'))
		expect(names).toContain('A')
		expect(names).toContain('B')
		const text = wrapper.text()
		expect(text).toContain('Bug')
		expect(text).toContain('Feature')
		expect(text).toContain('New')
		expect(text).toContain('Closed')
		// Assignees render as NcAvatar; their names live in the avatar's
		// display-name attribute, not as visible row text.
		const avatarNames = wrapper.findAll('.cn-openproject-tab__assignee').wrappers
			.map((w) => w.attributes('display-name'))
		expect(avatarNames).toContain('Bob')
		expect(avatarNames).toContain('Carol')
		const bug = wrapper.find('.cn-openproject-tab__type-badge--bug')
		expect(bug.exists()).toBe(true)
		const feature = wrapper.find('.cn-openproject-tab__type-badge--feature')
		expect(feature.exists()).toBe(true)
		const done = wrapper.find('.cn-openproject-tab__status-pill--done')
		expect(done.exists()).toBe(true)
		wrapper.unmount()
	})

	it('parses HAL+JSON `_embedded.elements` envelope for work packages', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				_embedded: {
					elements: [
						{
							id: 42,
							subject: 'HAL-shaped WP',
							_links: {
								self: { href: 'https://openproject.example/wp/42' },
								status: { title: 'New' },
								type: { title: 'Task' },
								assignee: { title: 'Dora' },
							},
						},
					],
				},
			}),
		})
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const row = wrapper.find('.cn-openproject-tab__row')
		expect(wrapper.findAll('.cn-openproject-tab__row')).toHaveLength(1)
		expect(row.attributes('name')).toBe('HAL-shaped WP')
		expect(wrapper.find('.cn-openproject-tab__assignee').attributes('display-name')).toBe('Dora')
		wrapper.unmount()
	})

	it('marks high-priority rows so case handlers spot them', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeWp({ id: 1, priority: 'High' }),
					makeWp({ id: 2, priority: 'Normal' }),
				],
			}),
		})
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const flagged = wrapper.findAll('.cn-openproject-tab__row--high-priority')
		expect(flagged).toHaveLength(1)
		wrapper.unmount()
	})

	it('renders the unconfigured CTA when the provider returns 412', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 412, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('OpenProject is not configured yet')
		expect(wrapper.text()).toContain('Configure OpenProject connection')
		wrapper.unmount()
	})

	it('renders the auth-expired banner when the provider returns 401', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Authorisation for OpenProject expired')
		expect(wrapper.find('.cn-openproject-tab__banner--auth').exists()).toBe(true)
		expect(wrapper.find('.cn-openproject-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('surfaces a 5xx upstream error message rather than silently emptying the list', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 502,
			json: () => Promise.resolve({ message: 'Bad gateway from OpenProject' }),
		})
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Bad gateway from OpenProject')
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('OpenProject is currently unavailable.')
		expect(wrapper.find('.cn-openproject-tab__banner--warn').exists()).toBe(true)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnOpenprojectTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load work packages.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
