/**
 * Tests for CnCospendTab — bespoke sidebar tab for the `cospend`
 * integration.
 *
 * Covers:
 *  - empty-state with "Open Costs" CTA when the provider returns no rows;
 *  - row rendering for projects vs bills (type chip + amount label);
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws;
 *  - amount + currency formatting when the row carries an amount.
 */

const { mount } = require('@vue/test-utils')
const CnCospendTab = require('../CnCospendTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makeProject(overrides = {}) {
	return {
		id: 1,
		title: 'Office trip',
		type: 'project',
		currency: 'EUR',
		...overrides,
	}
}

function makeBill(overrides = {}) {
	return {
		id: 10,
		title: 'Train ticket',
		type: 'bill',
		amount: 42.5,
		currency: 'EUR',
		payer: 'alice',
		date: '2026-05-20T10:00:00+00:00',
		projectId: 1,
		...overrides,
	}
}

describe('CnCospendTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Costs" CTA when no rows', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No costs linked yet')
		expect(wrapper.text()).toContain('Open Costs')
		wrapper.unmount()
	})

	it('renders project rows with the [Project] chip', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeProject()] }),
		})
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Office trip')
		expect(wrapper.text()).toContain('Project')
		expect(wrapper.find('.cn-cospend-tab__type-chip--project').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders bill rows with the [Bill] chip and amount + currency', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeBill()] }),
		})
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Train ticket')
		expect(wrapper.text()).toContain('Bill')
		expect(wrapper.text()).toContain('42.50 EUR')
		expect(wrapper.find('.cn-cospend-tab__type-chip--bill').exists()).toBe(true)
		// Prominent right-aligned amount + payer/date subline.
		expect(wrapper.find('.cn-cospend-tab__amount').text()).toBe('42.50 EUR')
		expect(wrapper.find('.cn-cospend-tab__subline-text').text()).toContain('alice')
		wrapper.unmount()
	})

	it('shows a per-currency total footer that sums bill amounts', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBill({ id: 1, amount: 42.5 }),
					makeBill({ id: 2, amount: 7.5 }),
				],
			}),
		})
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const totals = wrapper.find('.cn-cospend-tab__totals')
		expect(totals.exists()).toBe(true)
		expect(totals.text()).toContain('Total')
		expect(totals.text()).toContain('50.00 EUR')
		wrapper.unmount()
	})

	it('omits the total footer when no row carries an amount', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [makeProject()] }),
		})
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-cospend-tab__totals').exists()).toBe(false)
		wrapper.unmount()
	})

	it('defaults type to project when the provider omits the discriminator', async () => {
		// Mirrors the current shipping CospendProvider which only returns
		// projects without a `type` field.
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ results: [{ id: 7, title: 'Legacy', data: { currency_name: 'EUR' } }] }),
		})
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-cospend-tab__type-chip--project').exists()).toBe(true)
		expect(wrapper.text()).toContain('Legacy')
		wrapper.unmount()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Costs is currently unavailable.')
		expect(wrapper.find('.cn-cospend-tab__row').exists()).toBe(false)
		wrapper.unmount()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnCospendTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load costs.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
