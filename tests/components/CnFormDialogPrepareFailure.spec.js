// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

/**
 * Save never spins forever when the form cannot be prepared.
 *
 * `executeConfirm` sets `loading` and then builds the payload. Only
 * `setResult` clears `loading`, and `no-close` is bound to it, so a throw
 * while building the payload used to leave Save spinning with the dialog
 * locked open and no request sent. The failure now clears `loading` and
 * shows the reason in the dialog.
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: { template: '<div class="stub-note"><slot /></div>' },
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Item',
	properties: { title: { type: 'string', title: 'Title' } },
}

describe('CnFormDialog when the payload cannot be built', () => {
	let errorSpy

	beforeEach(() => {
		errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		errorSpy.mockRestore()
	})

	it('stops loading, shows the reason and emits no confirm', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema, item: { id: 'a-1', title: 'Old' } },
			stubs,
		})
		jest.spyOn(wrapper.vm, 'buildSubmitPayload').mockImplementation(() => {
			throw new Error('boom')
		})

		wrapper.vm.executeConfirm()

		expect(wrapper.vm.loading).toBe(false)
		expect(wrapper.vm.formError).toContain('boom')
		expect(wrapper.emitted('confirm')).toBeUndefined()
		expect(errorSpy).toHaveBeenCalled()
	})

	it('still emits confirm with the payload when building succeeds', () => {
		const wrapper = mount(CnFormDialog, {
			propsData: { schema, item: { id: 'a-1', title: 'Old' } },
			stubs,
		})

		wrapper.vm.executeConfirm()

		expect(wrapper.vm.loading).toBe(true)
		expect(wrapper.vm.formError).toBeNull()
		const emitted = wrapper.emitted('confirm')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0].title).toBe('Old')
	})
})
