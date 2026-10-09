/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/write-feedback-toast-and-undo/tasks.md#task-2
 */
import { showError, showSuccess } from '@nextcloud/dialogs'
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const schema = { title: 'Permit', properties: { title: { type: 'string', title: 'Title' } } }

function mountForm(props = {}) {
	return shallowMount(CnFormDialog, { propsData: { schema, ...props }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })
}

describe('CnFormDialog write feedback', () => {
	beforeEach(() => {
		showSuccess.mockClear()
		showError.mockClear()
	})

	it('names the object after a successful save', () => {
		const w = mountForm()
		w.vm.updateField('title', 'Permit for Dorpsstraat 1')
		w.vm.setResult({ success: true })
		expect(showSuccess).toHaveBeenCalledWith('Saved Permit for Dorpsstraat 1')
	})

	it('falls back to the schema title', () => {
		const w = mountForm()
		w.vm.setResult({ success: true })
		expect(showSuccess).toHaveBeenCalledWith('Saved permit')
	})

	it('shows the server message as an error toast', () => {
		const w = mountForm()
		w.vm.setResult({ error: 'identifier already exists' })
		expect(showError).toHaveBeenCalledWith('identifier already exists')
		expect(showSuccess).not.toHaveBeenCalled()
	})

	it('keeps the dialog open with its values on a validation error, and toasts the message', () => {
		const w = mountForm()
		w.vm.updateField('title', 'kept')
		w.vm.setValidationErrors({}, 'identifier already exists')
		expect(showError).toHaveBeenCalledWith('identifier already exists')
		expect(w.vm.result).toBeNull()
		expect(w.vm.formData.title).toBe('kept')
	})

	it('feedback: false renders no toast and changes nothing else', () => {
		const w = mountForm({ feedback: false })
		w.vm.setResult({ success: true })
		w.vm.setValidationErrors({}, 'x')
		expect(showSuccess).not.toHaveBeenCalled()
		expect(showError).not.toHaveBeenCalled()
		expect(w.vm.formError).toBe('x')
	})
})
