/**
 * Tests for CnCospendCard — bespoke surface-aware widget for the
 * `cospend` integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard / app-dashboard: count headline + per-currency totals;
 *  - detail-page: bounded row list with type chip + amount;
 *  - single-entity: chip rendering with type pill.
 * Plus error / unavailable handling.
 */

const { mount } = require('@vue/test-utils')
const CnCospendCard = require('../CnCospendCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
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

describe('CnCospendCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked rows', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No costs linked yet')
		wrapper.unmount()
	})

	it('renders a count headline + per-currency totals on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBill({ id: 1, amount: 10, currency: 'EUR' }),
					makeBill({ id: 2, amount: 20, currency: 'EUR' }),
					makeBill({ id: 3, amount: 5, currency: 'USD' }),
				],
			}),
		})
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		// 3 rows
		expect(txt).toContain('3')
		// 30 EUR + 5 USD
		expect(txt).toContain('30.00')
		expect(txt).toContain('EUR')
		expect(txt).toContain('5.00')
		expect(txt).toContain('USD')
		expect(wrapper.find('.cn-cospend-card__headline').exists()).toBe(true)
		expect(wrapper.find('.cn-cospend-card__totals').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders the detail-page list with type pills + highlights the linked row', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makeBill({ id: 1 }),
					makeBill({ id: 2, type: 'project', title: 'Trip', amount: null }),
				],
			}),
		})
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page', value: '2' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-cospend-card__row')
		expect(rows).toHaveLength(2)
		const highlighted = wrapper.findAll('.cn-cospend-card__row--highlight')
		expect(highlighted).toHaveLength(1)
		expect(wrapper.find('.cn-cospend-card__chip-pill--bill').exists()).toBe(true)
		expect(wrapper.find('.cn-cospend-card__chip-pill--project').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makeBill({ id: 42, title: 'Hotel', amount: 120 })),
		})
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: 42 } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-cospend-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Hotel')
		expect(chip.text()).toContain('Bill')
		wrapper.unmount()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Costs is currently unavailable.')
		wrapper.unmount()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnCospendCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No costs linked yet')
		wrapper.unmount()
		spy.mockRestore()
	})
})
