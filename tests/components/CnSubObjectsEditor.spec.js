/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The array-of-objects editor dossiq's status form needs (`checklist[]`,
 * `fieldRules[]`): a new row's values, row names and focus, an empty text,
 * rows tidied before they are saved, an optional sub-object behind a switch,
 * and a choice list that falls back to text when its source gives nothing.
 *
 * @spec openspec/changes/sub-objects-editor/specs/form-dialog/spec.md#requirement-rows-are-tidied-before-they-are-saved
 * @spec openspec/changes/sub-objects-editor/specs/form-dialog/spec.md#requirement-an-optional-object-has-a-switch
 */
import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnSubObjectsField from '../../src/components/CnSubObjectsField/CnSubObjectsField.vue'
import { foldDottedFields } from '../../src/utils/dottedFields.js'
import { pruneRows } from '../../src/utils/pruneRows.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: {} })) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const CHECKLIST = { type: 'object', required: ['title'], properties: { title: { type: 'string', title: 'Title' }, required: { type: 'boolean', title: 'Required' }, note: { type: 'string' } } }
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('pruneRows', () => {
	it('trims, omits empty optional keys and drops rows with a blank listed key', () => {
		const rows = [{ title: '  Call  ', required: false, note: ' ' }, { title: '', required: true }, { title: 'Mail', note: null }]
		expect(pruneRows(rows, CHECKLIST, { blank: ['title'] })).toEqual([{ title: 'Call', required: false }, { title: 'Mail' }])
	})

	it('drops rows missing a required key with invalid, and leaves rows alone without a rule', () => {
		const rows = [{ required: true }, { title: 'A' }]
		expect(pruneRows(rows, CHECKLIST, { invalid: true })).toEqual([{ title: 'A' }])
		expect(pruneRows(rows, CHECKLIST, undefined)).toBe(rows)
	})
})

describe('CnSubObjectsField', () => {
	const mountField = (props = {}) => mount(CnSubObjectsField, {
		props: { modelValue: [{ title: 'Call' }, { title: 'Mail' }], items: CHECKLIST, itemLabel: 'Checklist item', ...props },
		attachTo: document.body,
		global: { stubs: { CnFormDialog: { name: 'CnFormDialog', props: ['initialData', 'dialogTitle', 'item'], template: '<div class="dialog-stub" />' } } },
	})

	it('names each row by the item label and its number', () => {
		const w = mountField()
		expect(w.vm.rowName(1)).toBe('Checklist item 2')
		w.unmount()
	})

	it('opens a new row with newItem, and an edit titled by the row\'s name', async () => {
		const w = mountField({ newItem: { required: false } })
		await w.get('[data-testid="cn-sub-objects-add"]').trigger('click')
		expect(w.findComponent({ name: 'CnFormDialog' }).props('initialData')).toEqual({ required: false })
		w.vm.openEdit(1)
		await w.vm.$nextTick()
		expect(w.findComponent({ name: 'CnFormDialog' }).props('dialogTitle')).toBe('Edit Checklist item 2')
		expect(w.findComponent({ name: 'CnFormDialog' }).props('initialData')).toBeNull()
		w.unmount()
	})

	it('shows its empty text', () => {
		const w = mountField({ modelValue: [], emptyText: 'No checklist items yet.' })
		expect(w.text()).toContain('No checklist items yet.')
		w.unmount()
	})

	it('moves focus to the add button when the last row goes', async () => {
		const w = mountField({ modelValue: [{ title: 'Only' }] })
		w.vm.removeRow(0)
		await w.vm.$nextTick()
		await w.vm.$nextTick()
		expect(document.activeElement && document.activeElement.textContent).toContain('Add row')
		w.unmount()
	})
})

describe('CnFormDialog with a checklist and field rules', () => {
	const schema = {
		properties: {
			checklist: { type: 'array', 'x-widget': 'sub-objects', items: CHECKLIST },
			condition: {
				type: 'object',
				properties: {
					kind: { type: 'string', enum: ['fieldPresent', 'fieldEquals', 'documentPresent'] },
					value: { type: 'string' },
				},
			},
		},
	}
	const fieldOverrides = {
		checklist: { pruneWhen: { blank: ['title'] }, itemLabel: 'Checklist item', newItem: { required: false } },
		condition: { widget: 'object-switch', label: 'Only in some cases', defaults: { kind: 'fieldPresent' } },
		'condition.kind': { visibleWhen: { field: 'condition', truthy: true } },
		'condition.value': { visibleWhen: { field: 'condition.kind', equals: 'fieldEquals' } },
	}
	const mountForm = (item) => shallowMount(CnFormDialog, { propsData: { schema, item, fieldOverrides }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })

	it('passes the row settings to the editor and saves the checklist tidied', () => {
		const w = mountForm({ id: 's1', checklist: [{ title: ' Call ' }, { title: '' }], condition: null })
		const checklist = w.vm.resolvedFields.find((f) => f.key === 'checklist')
		expect(checklist).toMatchObject({ widget: 'sub-objects', itemLabel: 'Checklist item', newItem: { required: false } })
		expect(w.vm.buildSubmitPayload().checklist).toEqual([{ title: 'Call' }])
	})

	it('does not refuse the save over a row the save drops', () => {
		const w = mountForm({ id: 's1', checklist: [{ title: 'Call' }, { title: '' }], condition: null })
		w.vm.validate()
		expect(w.vm.errors.checklist).toBeUndefined()
	})

	it('turns the optional condition on with its defaults and off to null', () => {
		const w = mountForm({ id: 's1', checklist: [], condition: null })
		const field = w.vm.resolvedFields.find((f) => f.key === 'condition')
		expect(field.widget).toBe('object-switch')
		expect(w.vm.isObjectOn(field)).toBe(false)
		expect(w.vm.visibleFields.map((f) => f.key)).not.toContain('condition.kind')
		w.vm.setObjectOn(field, true)
		expect(w.vm.formData.condition).toEqual({ kind: 'fieldPresent' })
		expect(w.vm.formData['condition.kind']).toBe('fieldPresent')
		expect(w.vm.visibleFields.map((f) => f.key)).toContain('condition.kind')
		w.vm.updateField('condition.kind', 'fieldEquals')
		w.vm.updateField('condition.value', 'yes')
		expect(w.vm.buildSubmitPayload().condition).toEqual({ kind: 'fieldEquals', value: 'yes' })
		w.vm.setObjectOn(field, false)
		expect(w.vm.buildSubmitPayload().condition).toBeNull()
	})

	it('keeps a switched-off object null when its dotted keys still hold values', () => {
		const fields = [{ key: 'condition', widget: 'object-switch' }, { key: 'condition.kind' }]
		expect(foldDottedFields({ condition: null, 'condition.kind': 'x' }, fields)).toEqual({ condition: null })
	})
})

describe('a choice list whose source gives nothing', () => {
	it('falls back to text', async () => {
		axios.get.mockRejectedValueOnce(new Error('down'))
		const fields = [{ key: 'field', label: 'Field', type: 'string', optionsFrom: { url: '/apps/dossiq/api/fields' } }]
		const w = shallowMount(CnFormDialog, { propsData: { fields }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })
		await tick()
		await tick()
		expect(w.vm.sourcedFailed.field).toBe(true)
		w.vm.onCodedFallbackInput(w.vm.resolvedFields[0], 'caseType')
		expect(w.vm.formData.field).toBe('caseType')
	})
})
