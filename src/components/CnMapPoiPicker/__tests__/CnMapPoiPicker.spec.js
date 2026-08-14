/**
 * Tests for CnMapPoiPicker — pick-existing-POI modal.
 *
 * Covers:
 *  - POIs render on mount from /api/integrations/maps/available;
 *  - selecting a POI enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected favoriteId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

// See CnEmailPicker.spec.js: a Vue-3 `nextTick()` no longer implies the
// render queued by an async `mounted()` has flushed, so wait on the promise
// queue instead of counting ticks.
const { mount, flushPromises } = require('@vue/test-utils')
const CnMapPoiPicker = require('../CnMapPoiPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnMapPoiPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available POIs on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Office', category: 'Work', lat: 52.37, lng: 4.89 },
				{ id: 2, name: 'Home', lat: 51.92, lng: 4.47 },
			],
		}))

		const wrapper = mount(CnMapPoiPicker)
		await flushPromises()

		const rows = wrapper.findAll('.cn-map-poi-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Office')
		expect(wrapper.text()).toContain('Home')
		wrapper.unmount()
	})

	it('selecting a POI enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, name: 'Office', lat: 52.37, lng: 4.89 }],
		}))

		const wrapper = mount(CnMapPoiPicker)
		await flushPromises()

		await wrapper.find('.cn-map-poi-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedFavoriteId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ favoriteId: 99 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnMapPoiPicker)
		await flushPromises()

		expect(wrapper.text()).toContain('Could not load locations.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnMapPoiPicker)
		await flushPromises()

		expect(wrapper.text()).toContain('NC Maps is not installed.')
		wrapper.unmount()
	})

	it('filters POIs client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, name: 'Office HQ' },
				{ id: 2, name: 'Home' },
			],
		}))

		const wrapper = mount(CnMapPoiPicker)
		await flushPromises()

		wrapper.vm.search = 'office'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visiblePois).toHaveLength(1)
		expect(wrapper.vm.visiblePois[0].id).toBe(1)
		wrapper.unmount()
	})

	it('does not emit link when no POI is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnMapPoiPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
