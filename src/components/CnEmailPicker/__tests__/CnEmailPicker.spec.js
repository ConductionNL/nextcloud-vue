/**
 * Tests for CnEmailPicker — multi-step pick-existing-email modal.
 *
 * Covers:
 *  - account step renders accounts from /api/integrations/email/accounts;
 *  - selecting an account advances to the mailbox step;
 *  - selecting a mailbox advances to the message step;
 *  - confirm emits `link` with the selected payload;
 *  - back navigation rewinds to the previous step;
 *  - filter narrows the visible message list client-side;
 *  - inline error banner surfaces when an API call fails.
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

const { mount } = require('@vue/test-utils')
const CnEmailPicker = require('../CnEmailPicker.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnEmailPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders accounts on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [
			{ id: 1, label: 'Work', email: 'work@example.com' },
			{ id: 2, label: 'Personal', email: 'me@example.com' },
		] }))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('.cn-email-picker__row-button')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('Work')
		expect(wrapper.text()).toContain('Personal')
		wrapper.destroy()
	})

	it('advances to the mailbox step on account pick', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, label: 'Work', email: 'work@example.com' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 11, name: 'INBOX', displayName: 'INBOX' }] }))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.step).toBe(2)
		expect(wrapper.text()).toContain('INBOX')
		wrapper.destroy()
	})

	it('advances to the message step and emits link on confirm', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, label: 'Work', email: 'work@example.com' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 11, name: 'INBOX', displayName: 'INBOX' }] }))
			.mockReturnValueOnce(resolveOnce({
				items: [{ id: 700, uid: 'uid-700', subject: 'Hi', sender: 'a@b.c', date: null }],
				nextCursor: null,
			}))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.step).toBe(3)
		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()

		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeTruthy()
		expect(wrapper.emitted('link')[0]).toEqual([{
			mailAccountId: 1,
			messageId: '700',
			messageUid: 'uid-700',
		}])
		wrapper.destroy()
	})

	it('back from mailbox step returns to account step', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, label: 'Work', email: 'work@example.com' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 11, name: 'INBOX', displayName: 'INBOX' }] }))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.step).toBe(2)
		wrapper.vm.goBack()
		expect(wrapper.vm.step).toBe(1)
		wrapper.destroy()
	})

	it('filters messages by subject/sender client-side', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, label: 'Work', email: 'work@example.com' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 11, name: 'INBOX', displayName: 'INBOX' }] }))
			.mockReturnValueOnce(resolveOnce({
				items: [
					{ id: 1, uid: 'u1', subject: 'Hello world', sender: 'a@example.com', date: null },
					{ id: 2, uid: 'u2', subject: 'Other thing', sender: 'b@example.com', date: null },
				],
				nextCursor: null,
			}))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.find('.cn-email-picker__row-button').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.filteredMessages).toHaveLength(2)
		wrapper.setData({ filterText: 'hello' })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.filteredMessages).toHaveLength(1)
		expect(wrapper.vm.filteredMessages[0].subject).toBe('Hello world')
		wrapper.destroy()
	})

	it('surfaces an inline error when /accounts fails', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		global.fetch.mockRejectedValueOnce(new Error('boom'))

		const wrapper = mount(CnEmailPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.error).not.toBe('')
		spy.mockRestore()
		wrapper.destroy()
	})
})
