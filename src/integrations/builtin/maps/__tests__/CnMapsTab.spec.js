/**
 * Tests for CnMapsTab — bespoke sidebar tab for the `maps` integration.
 *
 * Covers:
 *  - empty-state with "Open Locations" CTA when the provider returns no rows;
 *  - row rendering: name, category badge, comment snippet, coords + open link;
 *  - the `[or:{uuid}]` marker is stripped from a name-as-title fallback;
 *  - graceful degradation when the provider returns 503;
 *  - generic-error path when fetch throws.
 */

const { mount } = require('@vue/test-utils')
const CnMapsTab = require('../CnMapsTab.vue').default

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'schema',
}

function makePoint(overrides = {}) {
	const data = {
		id: 1,
		name: 'Office HQ',
		lat: 52.36844,
		lng: 4.88379,
		category: 'office',
		comment: 'Main entrance on the south side.',
		...(overrides.data || {}),
	}
	return {
		id: overrides.id ?? data.id,
		title: data.name,
		url: `/index.php/apps/maps/#/m=${overrides.id ?? data.id}`,
		data,
	}
}

describe('CnMapsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders the empty state with an "Open Locations" CTA when no points', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('No locations linked yet')
		expect(wrapper.text()).toContain('Open Locations')
		wrapper.destroy()
	})

	it('renders one row per POI with name + category + coords', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoint({ id: 1, data: { id: 1, name: 'Alpha site', lat: 52.0, lng: 4.0, category: 'office', comment: 'first' } }),
					makePoint({ id: 2, data: { id: 2, name: 'Bravo site', lat: 51.5, lng: 5.5, category: 'warehouse', comment: 'second' } }),
				],
			}),
		})
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('.cn-maps-tab__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Alpha site')
		expect(wrapper.text()).toContain('Bravo site')
		expect(wrapper.text()).toContain('office')
		expect(wrapper.text()).toContain('warehouse')
		// Coords formatted to 5 decimals
		expect(wrapper.text()).toContain('52.00000, 4.00000')
		expect(wrapper.text()).toContain('51.50000, 5.50000')
	})

	it('renders the "Open on map" link with lat,lng pointed at the maps app', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					makePoint({ id: 1, data: { id: 1, name: 'Open me', lat: 52.36844, lng: 4.88379 } }),
				],
			}),
		})
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const link = wrapper.find('.cn-maps-tab__open-link')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('/index.php/apps/maps/?point=52.36844,4.88379')
		expect(link.text()).toContain('Open on map')
		wrapper.destroy()
	})

	it('strips the [or:{uuid}] marker from a name-as-title fallback', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{ id: 42, title: 'Field office [or:obj-1]', url: '/index.php/apps/maps/#/m=42', data: { id: 42, name: 'Field office [or:obj-1]', lat: 52.1, lng: 4.1 } },
				],
			}),
		})
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const titleEl = wrapper.find('.cn-maps-tab__title')
		expect(titleEl.exists()).toBe(true)
		expect(titleEl.text()).toBe('Field office')
		expect(titleEl.text()).not.toContain('[or:')
		wrapper.destroy()
	})

	it('strips a bare or:{uuid} marker from the category field and suppresses the chip', async () => {
		// Real-world: phase-d1 maps_favorites.category = 'or:{uuid}'
		// surfaced as a stray "-3C33EEFC2E88" chip artefact next to the
		// title. The fix strips both bracketed AND bare markers and
		// hides the chip when nothing meaningful remains.
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{
						id: 9, title: 'phase-d1 location', url: '/index.php/apps/maps/#/m=9',
						data: {
							id: 9, name: 'phase-d1 location', lat: 52.37, lng: 4.89,
							// Bare marker (no brackets) — the bug.
							category: 'or:a270fe68-df45-4427-8cb9-3c33eefc2e88',
						},
					},
				],
			}),
		})
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).not.toContain('or:a270fe68')
		expect(wrapper.text()).not.toContain('3C33EEFC2E88')
		expect(wrapper.text()).not.toContain('3c33eefc2e88')
		// Chip should NOT render when category is marker-only.
		expect(wrapper.find('.cn-maps-tab__category').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the unavailable banner when the provider returns 503', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('NC Location is currently unavailable.')
		expect(wrapper.find('.cn-maps-tab__row').exists()).toBe(false)
		wrapper.destroy()
	})

	it('shows the generic error label when fetch throws', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch = jest.fn().mockRejectedValueOnce(new Error('boom'))
		const wrapper = mount(CnMapsTab, { propsData: { ...DEFAULT_PROPS } })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.text()).toContain('Could not load locations.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
