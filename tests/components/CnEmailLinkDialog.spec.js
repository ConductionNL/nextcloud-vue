/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The "Link an email" dialog on its own: the Mail picker, and the pick linked
 * to the record, so an app can open it from any button (a card header action).
 *
 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md
 */
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn() }))

const { showError } = require('@nextcloud/dialogs')
const { emit } = require('@nextcloud/event-bus')
const { mount, flushPromises } = require('@vue/test-utils')
const CnEmailLinkDialog = require('../../src/components/CnEmailLinkDialog/CnEmailLinkDialog.vue').default

const PickerStub = { name: 'CnEmailPicker', emits: ['close', 'link'], template: '<div data-testid="picker-stub" />' }

function mountDialog() {
	return mount(CnEmailLinkDialog, {
		props: { register: 'pipelinq', schema: 'client', objectId: 'k-1' },
		global: { stubs: { CnEmailPicker: PickerStub } },
	})
}

beforeEach(() => {
	emit.mockReset()
	showError.mockReset()
	global.fetch = jest.fn()
})

describe('CnEmailLinkDialog', () => {
	it('links the picked message to the record and closes', async () => {
		global.fetch.mockResolvedValue({ ok: true, status: 201 })
		const w = mountDialog()
		w.findComponent(PickerStub).vm.$emit('link', { mailAccountId: 1, messageId: 9, messageUid: 'u9' })
		await flushPromises()
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toMatch(/\/apps\/openregister\/api\/objects\/pipelinq\/client\/k-1\/emails$/)
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({ mailAccountId: 1, messageId: 9, messageUid: 'u9' })
		expect(emit).toHaveBeenCalledWith('cn:timeline:changed', expect.objectContaining({ objectId: 'k-1' }))
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('takes an already linked message as linked', async () => {
		global.fetch.mockResolvedValue({ ok: false, status: 409 })
		const w = mountDialog()
		w.findComponent(PickerStub).vm.$emit('link', { mailAccountId: 1, messageId: 9 })
		await flushPromises()
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('stays open and says so when the link fails', async () => {
		global.fetch.mockResolvedValue({ ok: false, status: 500 })
		const w = mountDialog()
		w.findComponent(PickerStub).vm.$emit('link', { mailAccountId: 1, messageId: 9 })
		await flushPromises()
		expect(w.emitted('close')).toBeUndefined()
		expect(showError).toHaveBeenCalledTimes(1)
	})

	it('closes with the picker', async () => {
		const w = mountDialog()
		w.findComponent(PickerStub).vm.$emit('close')
		expect(w.emitted('close')).toHaveLength(1)
	})
})
