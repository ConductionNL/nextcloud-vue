// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnCalendarEventCreate — specifically the Enter-to-submit keyboard
 * bridge. The primary button lives in NcDialog's #actions (teleported outside
 * the <form>), so a visually-hidden in-form <button type="submit"> restores
 * HTML implicit submission. We assert the bridge exists and that the form's
 * submit event runs submit() → POSTs to the events endpoint.
 */

import { mount } from '@vue/test-utils'
import CnCalendarEventCreate from '../../src/components/CnCalendarEventCreate/CnCalendarEventCreate.vue'

jest.mock('@nextcloud/l10n', () => ({ translate: (_app, s) => s }))

const stubs = {
	// Render both the default and #actions slots so the form + footer mount.
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcTextField: true,
	NcTextArea: true,
	NcLoadingIcon: true,
	NcDateTimePickerNative: true,
}

const baseProps = { register: 'crm', schema: 'meeting', objectId: 'o-1' }

describe('CnCalendarEventCreate — Enter-to-submit bridge', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('renders a visually-hidden in-form submit button', () => {
		const wrapper = mount(CnCalendarEventCreate, { propsData: baseProps, stubs })
		const bridge = wrapper.find('.cn-calendar-event-create__submit-bridge')
		expect(bridge.exists()).toBe(true)
		expect(bridge.attributes('type')).toBe('submit')
		// Inside the <form> (so implicit submission targets it) and out of the a11y tree.
		expect(wrapper.find('form').find('.cn-calendar-event-create__submit-bridge').exists()).toBe(true)
		expect(bridge.attributes('aria-hidden')).toBe('true')
		expect(bridge.attributes('tabindex')).toBe('-1')
	})

	it('submitting the form (what Enter triggers) POSTs to the events endpoint', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'evt-1' }) })
		const wrapper = mount(CnCalendarEventCreate, { propsData: baseProps, stubs })
		await wrapper.setData({ form: { ...wrapper.vm.form, summary: 'Standup' } })

		await wrapper.find('form').trigger('submit')

		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][0]).toBe('/apps/openregister/api/objects/crm/meeting/o-1/events')
		expect(global.fetch.mock.calls[0][1].method).toBe('POST')
	})

	it('submitting with an empty summary is a no-op (canSubmit gate)', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
		const wrapper = mount(CnCalendarEventCreate, { propsData: baseProps, stubs })

		await wrapper.find('form').trigger('submit')

		expect(global.fetch).not.toHaveBeenCalled()
	})
})
