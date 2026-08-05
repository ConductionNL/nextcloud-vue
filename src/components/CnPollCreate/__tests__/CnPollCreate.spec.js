/**
 * Tests for CnPollCreate — inline-create Polls poll dialog.
 *
 * Covers:
 *  - submit emits `create` with the full payload (title/description/
 *    type/options/deadline);
 *  - submit is disabled until title and at least 2 options are present;
 *  - addOption / removeOption manipulate the options list;
 *  - removeOption is blocked when only 2 options remain.
 */

const { mount } = require('@vue/test-utils')
const CnPollCreate = require('../CnPollCreate.vue').default

describe('CnPollCreate', () => {
	it('starts with two empty option slots and textPoll type', () => {
		const wrapper = mount(CnPollCreate)
		expect(wrapper.vm.options).toEqual(['', ''])
		expect(wrapper.vm.type).toBe('textPoll')
		wrapper.destroy()
	})

	it('blocks submit when title is empty', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({ options: ['Mon', 'Tue'] })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})

	it('blocks submit when fewer than 2 options are filled', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({ title: 'Lunch', options: ['Mon', ''] })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})

	it('emits create with the full payload on submit', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({
			title: 'Lunch',
			description: 'Pick a day',
			type: 'datePoll',
			options: ['Mon', 'Tue'],
			deadline: '',
		})

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.title).toBe('Lunch')
		expect(payload.description).toBe('Pick a day')
		expect(payload.type).toBe('datePoll')
		expect(payload.options).toEqual(['Mon', 'Tue'])
		expect(payload.deadline).toBeNull()
		wrapper.destroy()
	})

	it('addOption appends a new empty slot', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.vm.addOption()
		expect(wrapper.vm.options).toEqual(['', '', ''])
		wrapper.destroy()
	})

	it('removeOption strips at the given index', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({ options: ['A', 'B', 'C'] })
		wrapper.vm.removeOption(1)
		expect(wrapper.vm.options).toEqual(['A', 'C'])
		wrapper.destroy()
	})

	it('removeOption is a no-op when only 2 options remain', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({ options: ['A', 'B'] })
		wrapper.vm.removeOption(0)
		expect(wrapper.vm.options).toEqual(['A', 'B'])
		wrapper.destroy()
	})

	it('encodes the deadline as ISO-8601 when provided', () => {
		const wrapper = mount(CnPollCreate)
		wrapper.setData({
			title: 'Lunch',
			options: ['A', 'B'],
			deadline: '2026-06-01T12:00',
		})

		wrapper.vm.submit()
		const payload = wrapper.emitted('create')[0][0]
		// Date.parse on a `datetime-local` value treats it as local time,
		// so the ISO string will be the UTC equivalent — we just assert it
		// produced a non-null ISO-formatted string here.
		expect(typeof payload.deadline).toBe('string')
		expect(payload.deadline).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
		wrapper.destroy()
	})
})
