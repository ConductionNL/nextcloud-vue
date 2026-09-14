/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidgetForm: the record kind, the display mode, the empty text and the
 * special states, and that a form which never touches them emits exactly the
 * blob it always has.
 */
import { shallowMount } from '@vue/test-utils'
import CnStatWidgetForm from '../../src/components/CnStatWidgetForm/CnStatWidgetForm.vue'

/**
 * Mount the form on a stored content blob.
 *
 * @param {object|null} content The stored content, or null for create mode.
 * @return {object} The wrapper.
 */
function mountForm(content) {
	return shallowMount(CnStatWidgetForm, {
		props: content ? { editingWidget: { content } } : {},
	})
}

const dossiqStatus = {
	label: 'Status',
	icon: 'ProgressCheck',
	iconColor: '',
	valueColor: '',
	caption: '',
	format: { style: 'number', currency: 'EUR', decimals: 0 },
	display: 'badge',
	emptyText: 'Unknown',
	objectField: {
		field: 'status',
		resolve: {
			register: 'dossiq',
			schema: 'statusType',
			labelField: 'name',
			variantField: 'isFinal',
			variantMap: { true: 'success', false: 'info' },
		},
	},
	// THE FIXTURE CARRIES AN ICON AND AN UNKNOWN `when` KEY ON PURPOSE. Without
	// them the round-trip test below passed while the form silently dropped
	// both: editing a manifest-authored tile's label deleted its override icon,
	// and any clause the form does not draw went with it.
	overrides: [
		{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning', icon: 'PauseCircle' },
		{ when: { field: 'archived', op: 'eq', value: 'true', appInstalled: 'keepiq' }, label: 'Archived', variant: 'default' },
	],
}

beforeEach(() => {
	jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe('CnStatWidgetForm: unchanged for the query kinds', () => {
	it('emits exactly the keys it always has when the new options are untouched', () => {
		const w = mountForm(null)
		w.vm.updateField('label', 'Open cases')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(Object.keys(emitted)).toEqual(['label', 'icon', 'iconColor', 'valueColor', 'caption', 'format', 'source'])
	})

	it('keeps config it cannot show instead of dropping it on save', () => {
		const w = mountForm({
			label: 'Won',
			source: { register: 'p', schema: 'lead', metric: 'count', filter: {} },
			variantWhen: [{ op: 'gte', value: 10, variant: 'success' }],
			route: { name: 'leads' },
		})
		w.vm.updateField('label', 'Won deals')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(emitted.variantWhen).toEqual([{ op: 'gte', value: 10, variant: 'success' }])
		expect(emitted.route).toEqual({ name: 'leads' })
		expect(emitted.label).toBe('Won deals')
	})
})

describe('CnStatWidgetForm: the record kind', () => {
	it('opens a stored objectField tile on the record kind', () => {
		const w = mountForm(dossiqStatus)
		expect(w.vm.kind).toBe('record')
		expect(w.vm.recordField).toBe('status')
		expect(w.vm.variantRows).toEqual([{ value: 'true', variant: 'success' }, { value: 'false', variant: 'info' }])
	})

	it('round-trips the dossiq status badge config unchanged', () => {
		const w = mountForm(dossiqStatus)
		w.vm.updateField('label', 'Status')

		expect(w.emitted('update:content').at(-1)[0]).toEqual(dossiqStatus)
	})

	it('writes no source for the record kind', () => {
		const w = mountForm(null)
		w.vm.updateField('kind', 'record')
		w.vm.updateField('recordField', 'priority')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(emitted.objectField).toBe('priority')
		expect(emitted.source).toBeUndefined()
	})

	it('writes the lookup once a register and schema are chosen', () => {
		const w = mountForm(null)
		w.vm.updateField('kind', 'record')
		w.vm.updateField('recordField', 'status')
		w.vm.updateResolve('register', 'dossiq')
		w.vm.updateResolve('schema', 'statusType')
		w.vm.updateResolve('variantField', 'colour')

		expect(w.emitted('update:content').at(-1)[0].objectField).toEqual({
			field: 'status',
			resolve: { register: 'dossiq', schema: 'statusType', variantField: 'colour' },
		})
	})

	it('requires a property', () => {
		const w = mountForm(null)
		w.vm.updateField('kind', 'record')
		expect(w.vm.validate()).toEqual(['A property on the record is required'])
	})

	it('requires both halves of a lookup target', () => {
		const w = mountForm(null)
		w.vm.updateField('kind', 'record')
		w.vm.updateField('recordField', 'status')
		w.vm.updateResolve('register', 'dossiq')
		expect(w.vm.validate()).toEqual(['Pick both a register and a schema to look the value up in'])
	})

	it('does not ask a record tile for a register and schema', () => {
		const w = mountForm(dossiqStatus)
		expect(w.vm.validate()).toEqual([])
	})
})

describe('CnStatWidgetForm: display, empty text and special states', () => {
	it('writes display and emptyText only when set', () => {
		const w = mountForm(null)
		w.vm.updateField('display', 'badge')
		w.vm.updateField('emptyText', 'Unknown')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(emitted.display).toBe('badge')
		expect(emitted.emptyText).toBe('Unknown')
	})

	it('builds a truthiness override from an "is set" row', () => {
		const w = mountForm(null)
		w.vm.addRow('overrideRows', { field: '', op: 'truthy', value: '', label: '', variant: 'warning' })
		w.vm.updateRow('overrideRows', 0, 'field', 'suspended')
		w.vm.updateRow('overrideRows', 0, 'label', 'Suspended')

		expect(w.emitted('update:content').at(-1)[0].overrides).toEqual([
			{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
		])
	})

	it('builds a comparison override from an operator row', () => {
		const w = mountForm(null)
		w.vm.addRow('overrideRows', { field: 'state', op: 'eq', value: 'paused', label: 'Paused', variant: 'error' })

		expect(w.emitted('update:content').at(-1)[0].overrides).toEqual([
			{ when: { field: 'state', op: 'eq', value: 'paused' }, label: 'Paused', variant: 'error' },
		])
	})

	it('leaves out a row that has no property yet', () => {
		const w = mountForm(null)
		w.vm.addRow('overrideRows', { field: '', op: 'truthy', value: '', label: 'x', variant: 'warning' })

		expect(w.emitted('update:content').at(-1)[0].overrides).toBeUndefined()
	})

	it('removes a row', () => {
		const w = mountForm(dossiqStatus)
		w.vm.removeRow('overrideRows', 0)
		w.vm.removeRow('overrideRows', 0)

		expect(w.emitted('update:content').at(-1)[0].overrides).toBeUndefined()
	})

	// THE FORM MUST NOT NARROW WHAT IT DOES NOT DRAW. `overrides` is an owned
	// key, so the passthrough that saves unknown CONTENT keys does not cover
	// it: whatever the assembler leaves out is gone for good.
	it('keeps an override icon through an edit that never touches it', () => {
		const w = mountForm(dossiqStatus)
		w.vm.updateRow('overrideRows', 0, 'label', 'On hold')

		const overrides = w.emitted('update:content').at(-1)[0].overrides
		expect(overrides[0]).toEqual({ when: { field: 'suspended' }, label: 'On hold', variant: 'warning', icon: 'PauseCircle' })
	})

	// The SIBLING of the `when` case below, and it had no test at all: an
	// override key the form does not draw (a future `priority`, a `tooltip`)
	// was dropped on save exactly the way the icon was.
	it('keeps an override key it cannot draw', () => {
		const stored = {
			...dossiqStatus,
			overrides: [{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning', tooltip: 'Paused by the handler' }],
		}
		const w = mountForm(stored)
		w.vm.updateRow('overrideRows', 0, 'label', 'On hold')

		const emitted = w.emitted('update:content').at(-1)[0].overrides[0]
		expect(emitted.tooltip).toBe('Paused by the handler')
		expect(emitted.label).toBe('On hold')
	})

	// A TEXT BOX PRODUCES STRINGS, and opening the editor should not be an edit.
	// A stored `{ op: 'gt', value: 5 }` round-tripped to `'5'` merely by being
	// looked at, and `5 > '5'` is not the comparison the manifest asked for.
	it('keeps a numeric override value a number when nobody retyped it', () => {
		const stored = {
			...dossiqStatus,
			overrides: [{ when: { field: 'daysOpen', op: 'gt', value: 5 }, label: 'Overdue', variant: 'error' }],
		}
		const w = mountForm(stored)
		w.vm.updateRow('overrideRows', 0, 'label', 'Late')

		expect(w.emitted('update:content').at(-1)[0].overrides[0].when.value).toBe(5)
	})

	it('keeps a boolean override value a boolean', () => {
		const stored = {
			...dossiqStatus,
			overrides: [{ when: { field: 'archived', op: 'eq', value: true }, label: 'Archived' }],
		}
		const w = mountForm(stored)
		w.vm.updateRow('overrideRows', 0, 'label', 'Filed')

		expect(w.emitted('update:content').at(-1)[0].overrides[0].when.value).toBe(true)
	})

	it('writes what was typed once somebody actually edits the value', () => {
		const stored = {
			...dossiqStatus,
			overrides: [{ when: { field: 'daysOpen', op: 'gt', value: 5 }, label: 'Overdue' }],
		}
		const w = mountForm(stored)
		w.vm.updateRow('overrideRows', 0, 'value', '10')

		expect(w.emitted('update:content').at(-1)[0].overrides[0].when.value).toBe('10')
	})

	it('keeps a clause of the when grammar it cannot draw', () => {
		const w = mountForm(dossiqStatus)
		w.vm.updateRow('overrideRows', 1, 'variant', 'error')

		const overrides = w.emitted('update:content').at(-1)[0].overrides
		expect(overrides[1].when).toEqual({ field: 'archived', op: 'eq', value: 'true', appInstalled: 'keepiq' })
	})

	it('edits the icon on a row', () => {
		const w = mountForm(dossiqStatus)
		w.vm.updateRow('overrideRows', 0, 'icon', 'Sleep')

		expect(w.emitted('update:content').at(-1)[0].overrides[0].icon).toBe('Sleep')
	})

	// An override with no `when.field` is one the form cannot draw at all. It
	// is kept in place rather than deleted, and it does not render a row the
	// person could type into and corrupt.
	it('re-emits an override it cannot show, in its own position', () => {
		const stored = {
			...dossiqStatus,
			overrides: [
				{ when: { appInstalled: 'keepiq' }, label: 'Archivable' },
				{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
			],
		}
		const w = mountForm(stored)
		expect(w.findAll('[data-testid="cn-stat-widget-form-override-row"]')).toHaveLength(1)

		w.vm.updateRow('overrideRows', 1, 'label', 'On hold')
		const overrides = w.emitted('update:content').at(-1)[0].overrides
		expect(overrides).toEqual([
			{ when: { appInstalled: 'keepiq' }, label: 'Archivable' },
			{ when: { field: 'suspended' }, label: 'On hold', variant: 'warning' },
		])
	})
})
