// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnFilesWidgetDeleteDialog — the ADR-004-isolated NcDialog that
 * replaced CnFilesWidget's hand-rolled confirm overlay. Verifies it shows the
 * file name and emits `confirm` / `update:open` from its footer buttons.
 */

import { mount } from '@vue/test-utils'
import CnFilesWidgetDeleteDialog from '../../src/dialogs/CnFilesWidgetDeleteDialog.vue'

jest.mock('@nextcloud/l10n', () => ({
	translate: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s),
}))

const stubs = {
	NcDialog: { template: '<div><slot /><footer class="footer"><slot name="actions" /></footer></div>' },
	NcButton: { template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
}

describe('CnFilesWidgetDeleteDialog', () => {
	it('renders the file name in the confirmation prompt', () => {
		const wrapper = mount(CnFilesWidgetDeleteDialog, { propsData: { open: true, fileName: 'report.pdf' }, stubs })
		expect(wrapper.text()).toContain('Are you sure you want to delete report.pdf?')
	})

	it('emits confirm when Delete is clicked', async () => {
		const wrapper = mount(CnFilesWidgetDeleteDialog, { propsData: { open: true, fileName: 'x' }, stubs })
		const buttons = wrapper.findAll('.footer button')
		await buttons.at(1).trigger('click') // Delete (second footer button)
		expect(wrapper.emitted('confirm')).toBeTruthy()
	})

	it('emits update:open=false when Cancel is clicked', async () => {
		const wrapper = mount(CnFilesWidgetDeleteDialog, { propsData: { open: true, fileName: 'x' }, stubs })
		await wrapper.findAll('.footer button').at(0).trigger('click') // Cancel (first)
		expect(wrapper.emitted('update:open')[0]).toEqual([false])
	})
})
