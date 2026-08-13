// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnCalendarEventPicker's dialog footer (#actions): Cancel must be
 * visible in BOTH steps so the footer is never empty and the user always has a
 * visible exit; the primary Confirm only appears in the event-selection step.
 */

import { mount } from '@vue/test-utils'
import CnCalendarEventPicker from '../../src/components/CnCalendarEventPicker/CnCalendarEventPicker.vue'

jest.mock('@nextcloud/l10n', () => ({ translate: (_app, s) => s }))

const stubs = {
	// Scope the footer so the test targets #actions buttons, not body buttons.
	NcDialog: { template: '<div><slot /><footer class="footer"><slot name="actions" /></footer></div>' },
	NcButton: { template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
	NcTextField: true,
	NcLoadingIcon: true,
	ChevronLeft: true,
}

const footerLabels = (wrapper) => wrapper.findAll('.footer button').map((b) => b.text())

describe('CnCalendarEventPicker — footer actions', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
	})
	afterEach(() => {
		delete global.fetch
	})

	it('renders only Cancel (no Confirm) in the calendar-selection step', () => {
		const wrapper = mount(CnCalendarEventPicker, { stubs })
		expect(wrapper.vm.step).toBe('calendars')
		const labels = footerLabels(wrapper)
		expect(labels).toContain('Cancel')
		expect(labels).not.toContain('Link event')
	})

	it('renders Cancel + Confirm in the event-selection step', async () => {
		const wrapper = mount(CnCalendarEventPicker, { stubs })
		await wrapper.setData({ step: 'events', activeCalendar: { uri: 'c1', displayName: 'Work' } })
		const labels = footerLabels(wrapper)
		expect(labels).toContain('Cancel')
		expect(labels).toContain('Link event')
	})

	it('Cancel emits close in the calendar-selection step', async () => {
		const wrapper = mount(CnCalendarEventPicker, { stubs })
		await wrapper.find('.footer button').trigger('click')
		expect(wrapper.emitted('close')).toBeTruthy()
	})
})
