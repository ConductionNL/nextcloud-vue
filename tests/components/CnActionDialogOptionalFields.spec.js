/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action dialog's optional field says so: board DqUwWachtrij's "Iets
 * inplannen" reads "Sjabloon (niet verplicht)" over a select that asks "Kies een
 * sjabloon (optioneel)". A required field keeps its own label.
 *
 * @spec openspec/changes/action-dialog-optional-fields/specs/action-dialog/spec.md#requirement-an-optional-field-says-so-beside-its-label
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnActionDialog from '../../src/components/CnActionDialog/CnActionDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const PLAN = {
	title: 'Plan an item',
	fields: [
		{ field: 'template', type: 'select', label: 'Template', required: false, placeholder: 'Choose a template (optional)', options: [{ value: 'call-back', label: 'Call someone back' }] },
		{ field: 'title', label: 'What is it' },
		{ field: 'note', label: 'Note', required: false },
	],
	confirm: { label: 'Schedule it', request: { url: '/apps/dossiq/api/personal-queue/planned-items' } },
}

const stubs = {
	CnDialog: { name: 'CnDialog', props: ['name', 'eyebrow'], template: '<div><slot /><slot name="actions" /></div>' },
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputId', 'inputLabel', 'labelOutside', 'placeholder'], template: '<div class="select" />' },
	NcTextField: { name: 'NcTextField', props: ['modelValue', 'label', 'type', 'labelOutside', 'id'], template: '<input :id="id" :aria-label="label">' },
	CnIcon: true,
}

describe('an optional field in an action dialog', () => {
	it('puts "(optional)" after the label of an optional select, pointing at it, with its placeholder', async () => {
		const w = mount(CnActionDialog, { props: { config: PLAN }, global: { stubs } })
		await flushPromises()
		const field = w.find('[data-testid="cn-action-dialog-field-template"]')
		expect(field.find('[data-testid="cn-form-field-label"]').text()).toBe('Template (optional)')
		const select = w.findComponent({ name: 'NcSelect' })
		expect(select.props('labelOutside')).toBe(true)
		expect(select.props('placeholder')).toBe('Choose a template (optional)')
		expect(field.find('label').attributes('for')).toBe(select.props('inputId'))
	})

	it('marks an optional text field the same way and leaves a required one as it was', async () => {
		const w = mount(CnActionDialog, { props: { config: PLAN }, global: { stubs } })
		await flushPromises()
		expect(w.find('[data-testid="cn-action-dialog-field-note"] [data-testid="cn-form-field-label"]').text()).toBe('Note (optional)')
		const required = w.find('[data-testid="cn-action-dialog-field-title"]')
		expect(required.find('[data-testid="cn-form-field-label"]').exists()).toBe(false)
		expect(required.findComponent({ name: 'NcTextField' }).props('labelOutside')).toBe(false)
	})
})
