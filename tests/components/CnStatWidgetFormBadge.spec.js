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
	overrides: [
		{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
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

		expect(w.emitted('update:content').at(-1)[0].overrides).toBeUndefined()
	})
})
