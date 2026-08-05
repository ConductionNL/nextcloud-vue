/**
 * Tests for CnMapsCard — bespoke surface-aware widget for the `maps`
 * integration.
 *
 * Covers each of the four AD-19 surfaces:
 *  - user-dashboard: count headline + most-recent line + coords;
 *  - detail-page: compact list with view-all trail-off;
 *  - single-entity: map-pin + name chip.
 * Plus unavailable / error handling that mirrors CnIntegrationCard.
 */

const { mount } = require('@vue/test-utils')
const CnMapsCard = require('../CnMapsCard.vue').default

const DEFAULT_PROPS = {
	register: 'reg',
	schema: 'schema',
	objectId: 'obj-1',
}

function makePoint(overrides = {}) {
	const data = { id: 1, name: 'Office HQ', lat: 52.36844, lng: 4.88379, category: 'office', ...(overrides.data || {}) }
	return {
		id: overrides.id ?? data.id,
		title: data.name,
		url: `/index.php/apps/maps/#/m=${overrides.id ?? data.id}`,
		data,
	}
}

describe('CnMapsCard', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty label when there are no linked points', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No locations linked yet')
		wrapper.destroy()
	})

	it('renders a count headline + most-recent on the user-dashboard surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoint({ id: 1, data: { id: 1, name: 'Alpha', lat: 52.0, lng: 4.0 } }),
					makePoint({ id: 2, data: { id: 2, name: 'Bravo', lat: 51.0, lng: 5.0 } }),
					makePoint({ id: 9, data: { id: 9, name: 'Charlie', lat: 50.0, lng: 6.0 } }),
				],
			}),
		})
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS, surface: 'user-dashboard' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const txt = wrapper.text()
		expect(txt).toContain('3')
		expect(wrapper.find('.cn-maps-card__headline').exists()).toBe(true)
		// most-recent (highest id) shows
		expect(txt).toContain('Charlie')
		expect(txt).toContain('50.00000, 6.00000')
		wrapper.destroy()
	})

	it('renders a compact list with view-all trail-off on the detail-page surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoint({ id: 1 }),
					makePoint({ id: 2 }),
					makePoint({ id: 3 }),
					makePoint({ id: 4 }),
					makePoint({ id: 5 }),
					makePoint({ id: 6 }),
				],
			}),
		})
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-maps-card__row')
		// COMPACT_LIMIT = 5
		expect(rows).toHaveLength(5)
		expect(wrapper.find('.cn-maps-card__view-all').exists()).toBe(true)
		wrapper.destroy()
	})

	it('renders a chip on the single-entity surface', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(makePoint({ id: 7, data: { id: 7, name: 'Field office', lat: 52.0, lng: 4.0, category: 'site' } })),
		})
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS, surface: 'single-entity', value: '7' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const chip = wrapper.find('.cn-maps-card__chip')
		expect(chip.exists()).toBe(true)
		expect(chip.text()).toContain('Field office')
		expect(chip.text()).toContain('site')
		wrapper.destroy()
	})

	it('shows the unavailable label when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Location is currently unavailable.')
		wrapper.destroy()
	})

	it('does not throw when fetch fails on the detail-page surface', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnMapsCard, { propsData: { ...DEFAULT_PROPS, surface: 'detail-page' } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No locations linked yet')
		wrapper.destroy()
		spy.mockRestore()
	})
})
