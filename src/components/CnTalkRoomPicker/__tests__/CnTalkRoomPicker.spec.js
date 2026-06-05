/**
 * Tests for CnTalkRoomPicker — single-step pick-existing-room dialog.
 *
 * Covers:
 *  - room list renders rows from GET /api/integrations/talk/rooms;
 *  - selecting a row + confirm emits `link` with { roomToken };
 *  - inline error banner surfaces when the API call fails.
 */

const { mount } = require('@vue/test-utils')
const CnTalkRoomPicker = require('../CnTalkRoomPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnTalkRoomPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders rooms on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [
				{ token: 'tok-a', name: 'Sprint planning', type: 2, participantCount: 4 },
				{ token: 'tok-b', name: 'Standup', type: 2, participantCount: 2 },
			],
		}))
		const wrapper = mount(CnTalkRoomPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-talk-room-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Sprint planning')
		expect(wrapper.text()).toContain('Standup')
		wrapper.destroy()
	})

	it('emits link with the selected roomToken on confirm', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ token: 'tok-c', name: 'Pre-prod', type: 3 }],
		}))
		const wrapper = mount(CnTalkRoomPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-talk-room-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{ roomToken: 'tok-c' }])
		wrapper.destroy()
	})

	it('surfaces an inline error when /rooms fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnTalkRoomPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('Could not load rooms.')
		wrapper.destroy()
		spy.mockRestore()
	})
})
