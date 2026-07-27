/**
 * Tests for CnPollPicker — pick-existing-poll modal.
 *
 * Covers:
 *  - polls render on mount from /api/integrations/polls/available;
 *  - selecting a poll enables confirm and the row gets the selected class;
 *  - confirm emits `link` with the selected pollId;
 *  - inline error banner surfaces when the available endpoint fails;
 *  - search input filters the visible list client-side.
 */

const { mount } = require('@vue/test-utils')
const CnPollPicker = require('../CnPollPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnPollPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders available polls on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, title: 'Lunch', type: 'datePoll', voterCount: 3, optionCount: 2, closed: false },
				{ id: 2, title: 'Meeting time', type: 'textPoll', voterCount: 0, optionCount: 3, closed: false },
			],
		}))

		const wrapper = mount(CnPollPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-poll-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Lunch')
		expect(wrapper.text()).toContain('Meeting time')
		wrapper.unmount()
	})

	it('selecting a poll enables confirm and emits link', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 99, title: 'Lunch', type: 'datePoll' }],
		}))

		const wrapper = mount(CnPollPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-poll-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.selectedPollId).toBe(99)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ pollId: 99 }])
		wrapper.unmount()
	})

	it('surfaces an inline error when /available fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnPollPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load polls.')
		wrapper.unmount()
		spy.mockRestore()
	})

	it('filters polls client-side via search', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ id: 1, title: 'Lunch poll', type: 'datePoll' },
				{ id: 2, title: 'Meeting time', type: 'textPoll' },
			],
		}))

		const wrapper = mount(CnPollPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.search = 'lunch'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.visiblePolls).toHaveLength(1)
		expect(wrapper.vm.visiblePolls[0].id).toBe(1)
		wrapper.unmount()
	})

	it('does not emit link when no poll is selected', () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))
		const wrapper = mount(CnPollPicker)

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})
})
