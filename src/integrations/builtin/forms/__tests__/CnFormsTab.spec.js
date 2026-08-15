/**
 * Tests for CnFormsTab — bespoke sidebar tab for the `forms` integration.
 *
 * Covers:
 *  - empty-state with "Open Forms" CTA when the provider returns no forms;
 *  - row rendering with status pill + submission tally;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws;
 *  - expiry countdown / closed badge driven by the (currently absent
 *    in the provider — defensive) `expiresAt` field;
 *  - submission grouping: rows of `type: 'submission'` collapsed into
 *    a per-form submission count rather than rendered as standalone
 *    rows.
 */

const { mount } = require('@vue/test-utils')
const CnFormsTab = require('../CnFormsTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function futureExpiry(daysAhead = 7) {
	return Math.floor((Date.now() + (daysAhead * 24 * 60 * 60 * 1000)) / 1000)
}

function pastExpiry(daysBehind = 2) {
	return Math.floor((Date.now() - (daysBehind * 24 * 60 * 60 * 1000)) / 1000)
}

function makeForm(overrides = {}) {
	return {
		type: 'form',
		id: '42',
		title: 'Budget intake',
		description: 'Collect spend proposals for 2026',
		url: '/index.php/apps/forms/hash-42',
		lastUpdated: Math.floor(Date.now() / 1000) - 3600,
		data: {
			id: '42',
			hash: 'hash-42',
			title: 'Budget intake',
			description: 'Collect spend proposals for 2026',
			lastUpdated: Math.floor(Date.now() / 1000) - 3600,
		},
		...overrides,
	}
}

function makeSubmission(formId = '42', overrides = {}) {
	return {
		type: 'submission',
		id: formId + '/1',
		title: 'Budget intake — 2026-01-02',
		description: 'alice',
		url: '/index.php/apps/forms/hash-42/results',
		lastUpdated: Math.floor(Date.now() / 1000) - 1800,
		data: {
			id: 1,
			formId: Number(formId),
			userId: 'alice',
			timestamp: Math.floor(Date.now() / 1000) - 1800,
		},
		...overrides,
	}
}

describe('CnFormsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Forms" CTA when no forms', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No forms linked yet')
		expect(wrapper.text()).toContain('Open Forms')
		wrapper.unmount()
	})

	it('renders a row with title, description and open status', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm()] }),
		})
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-forms-tab__row')
		expect(rows).toHaveLength(1)
		// Title is passed to NcListItem via the `name` prop (rendered by
		// the real component; surfaced as an attribute by the test stub).
		expect(rows.at(0).attributes('name')).toBe('Budget intake')
		expect(wrapper.text()).toContain('Collect spend proposals for 2026')
		expect(wrapper.text()).toContain('Open')
		expect(wrapper.find('.cn-forms-tab__status--open').exists()).toBe(true)
		// The row deep-links into Forms via NcListItem's href.
		expect(rows.at(0).attributes('href')).toBe('/index.php/apps/forms/hash-42')
		wrapper.unmount()
	})

	it('groups submissions into a per-form submission count', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeForm(),
					makeSubmission('42'),
					makeSubmission('42', { id: '42/2', data: { id: 2, formId: 42 } }),
					makeSubmission('42', { id: '42/3', data: { id: 3, formId: 42 } }),
				],
			}),
		})
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// 1 form row, not 4 rows
		expect(wrapper.findAll('.cn-forms-tab__row')).toHaveLength(1)
		// Submission tally is surfaced as a response-count bubble.
		const count = wrapper.find('.cn-forms-tab__count')
		expect(count.exists()).toBe(true)
		expect(count.text()).toContain('3')
		wrapper.unmount()
	})

	it('renders a "Closed" status pill when the form has expired', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm({ expiresAt: pastExpiry(3) })] }),
		})
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-forms-tab__row--closed').exists()).toBe(true)
		expect(wrapper.find('.cn-forms-tab__status--closed').exists()).toBe(true)
		expect(wrapper.text()).toContain('Closed')
		wrapper.unmount()
	})

	it('renders the expiry date (NcDateTime) and an open chip when expiresAt is in the future', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm({ expiresAt: futureExpiry(5) })] }),
		})
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-forms-tab__expiry').exists()).toBe(true)
		expect(wrapper.find('.cn-forms-tab__status--open').exists()).toBe(true)
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Forms is currently unavailable.')
		expect(wrapper.find('.cn-forms-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load forms.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('renders the "Link existing form" + "Create new form" header actions (Tier-2)', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Link existing form')
		expect(wrapper.text()).toContain('Create new form')
		wrapper.unmount()
	})

	it('fetches from the Tier-2 link endpoint (/api/objects/{r}/{s}/{id}/forms)', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringMatching(/\/api\/objects\/reg\/schema\/obj-1\/forms$/),
			expect.any(Object),
		)
		wrapper.unmount()
	})

	it('renders an unlink button on each row', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeForm()] }),
		})
		const wrapper = mount(CnFormsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-forms-tab__unlink').exists()).toBe(true)
		wrapper.unmount()
	})
})
