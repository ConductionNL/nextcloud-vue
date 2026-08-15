/**
 * Tests for CnTimeTrackerPicker — pick-existing-entry modal.
 *
 * Covers:
 *  - entries render on mount from /api/integrations/time-tracker/available;
 *  - selecting an entry enables confirm and the row gets the selected class;
 *  - confirm emits `link` with `{ entryType, id }`;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - 501 surfaces the "not installed" copy;
 *  - search input filters the visible list client-side;
 *  - no link is emitted when nothing is selected.
 */

// See CnEmailPicker.spec.js: a Vue-3 `nextTick()` no longer implies the
// render queued by an async `mounted()` has flushed, so wait on the promise
// queue instead of counting ticks.
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimeTrackerPicker = require('../CnTimeTrackerPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnTimeTrackerPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available entries on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 'c1', kind: 'client', name: 'Acme' },
				{ id: 'c2', kind: 'client', name: 'Globex' },
			],
		}))

		const wrapper = mount(CnTimeTrackerPicker)
		await flushPromises()

		const rows = wrapper.findAll('.cn-time-tracker-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Acme')
		expect(wrapper.text()).toContain('Globex')
		wrapper.unmount()
	})

	it('selecting an entry enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 'c9', kind: 'client', name: 'Acme' }],
		}))

		const wrapper = mount(CnTimeTrackerPicker)
		await flushPromises()

		await wrapper.find('.cn-time-tracker-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selected).toEqual({ entryType: 'client', id: 'c9' })

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ entryType: 'client', id: 'c9' }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnTimeTrackerPicker)
		await flushPromises()

		expect(wrapper.text()).toContain('Could not load entries.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnTimeTrackerPicker)
		await flushPromises()

		expect(wrapper.text()).toContain('NC TimeManager is not installed.')
		wrapper.unmount()
	})

	it('filters entries client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 'c1', kind: 'client', name: 'Acme' },
				{ id: 'c2', kind: 'client', name: 'Globex' },
			],
		}))

		const wrapper = mount(CnTimeTrackerPicker)
		await flushPromises()

		wrapper.vm.search = 'acme'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visibleEntries).toHaveLength(1)
		expect(wrapper.vm.visibleEntries[0].id).toBe('c1')
		wrapper.unmount()
	})

	it('does not emit link when no entry is selected', () => {
		global.fetch.mockReturnValue(resolveOnce({ results: [] }))
		const wrapper = mount(CnTimeTrackerPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
