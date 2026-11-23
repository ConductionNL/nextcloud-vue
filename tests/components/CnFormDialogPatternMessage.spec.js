/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A field's `validation.patternMessage` names what a wrong value is
 * ("Invalid email format"), translated through the host app, instead of the
 * generic "Invalid format." — so an app's create form keeps the words its own
 * form used.
 *
 * @spec openspec/changes/form-pattern-message/specs/form-dialog/spec.md#requirement-a-field-names-what-a-wrong-value-is
 */
import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Client',
	properties: {
		name: { type: 'string', title: 'Name' },
		email: { type: 'string', title: 'Email' },
		phone: { type: 'string', title: 'Phone', pattern: '^[0-9]+$' },
	},
}

function mountForm() {
	return mount(CnFormDialog, {
		props: {
			schema,
			item: null,
			fieldOverrides: { email: { validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternMessage: 'Invalid email format' } } },
		},
		global: { stubs, provide: { cnTranslate: (key) => `t:${key}` } },
	})
}

describe('CnFormDialog: validation.patternMessage', () => {
	it('names the wrong value with the field\'s own message, translated', async () => {
		const w = mountForm()
		w.vm.formData.email = 'jan@example'
		w.vm.touchedFields.email = true
		expect(w.vm.validate()).toBe(false)
		expect(w.vm.errors.email).toBe('t:Invalid email format')
	})

	it('keeps the generic text without a message', async () => {
		const w = mountForm()
		w.vm.formData.phone = 'abc'
		w.vm.touchedFields.phone = true
		w.vm.validate()
		expect(w.vm.errors.phone).toBe('Invalid format.')
	})
})
