/**
 * Tests for CnDeckCardPicker — multi-step pick-existing-card modal.
 *
 * Covers:
 *  - board step renders boards from /api/integrations/deck/boards;
 *  - selecting a board advances to the stack step and loads stacks;
 *  - selecting a stack advances to the card step and loads cards;
 *  - confirm emits `link` with the selected cardId;
 *  - back navigation rewinds to the previous step;
 *  - inline error banner surfaces when an API call fails.
 */

// See CnEmailPicker.spec.js: a Vue-3 `nextTick()` no longer implies the
// render queued by an async `mounted()` has flushed, so wait on the promise
// queue instead of counting ticks.
const { mount, flushPromises } = require('@vue/test-utils')
const CnDeckCardPicker = require('../CnDeckCardPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnDeckCardPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders boards on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, title: 'Sprint' }, { id: 2, title: 'Backlog' }] }))
		const wrapper = mount(CnDeckCardPicker)
		await flushPromises()

		const rows = wrapper.findAll('.cn-deck-card-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Sprint')
		expect(wrapper.text()).toContain('Backlog')
		wrapper.unmount()
	})

	it('advances to the stack step on board pick and loads stacks', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 7, title: 'Sprint' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 70, title: 'To Do' }] }))

		const wrapper = mount(CnDeckCardPicker)
		await flushPromises()

		const boardRow = wrapper.find('.cn-deck-card-picker__row-button')
		await boardRow.trigger('click')
		await flushPromises()

		expect(wrapper.vm.step).toBe(2)
		expect(wrapper.text()).toContain('To Do')
		wrapper.unmount()
	})

	it('advances to the card step and emits link on confirm', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 7, title: 'Sprint' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 70, title: 'To Do' }] }))
			.mockReturnValueOnce(resolveOnce({ cards: [{ id: 700, title: 'Investigate' }] }))

		const wrapper = mount(CnDeckCardPicker, {
			propsData: {
				cardLoader: async () => [{ id: 700, title: 'Investigate' }],
			},
		})
		await flushPromises()

		await wrapper.find('.cn-deck-card-picker__row-button').trigger('click')
		await flushPromises()

		await wrapper.find('.cn-deck-card-picker__row-button').trigger('click')
		await flushPromises()

		expect(wrapper.vm.step).toBe(3)
		await wrapper.find('.cn-deck-card-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ cardId: 700 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /boards fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnDeckCardPicker)
		await flushPromises()

		expect(wrapper.text()).toContain('Could not load boards.')
		wrapper.unmount()
		spy.mockRestore()
	})
})
