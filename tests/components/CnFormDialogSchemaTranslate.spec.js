/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the schema-derived strings CnFormDialog puts on screen: the
 * dialog heading (from `schema.title`) and the option labels of an enum
 * field. Both are English source strings authored in the schema, so without
 * translation a Dutch session reads "Edit Time entry" over a form whose
 * every field label is Dutch, and picks a status called `submitted`.
 *
 * The stored VALUE must stay the raw schema code in every case — only what
 * the user reads is translated.
 */

import { mount } from '@vue/test-utils'

import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Time entry',
	properties: {
		description: { type: 'string', title: 'Description' },
		status: { type: 'string', title: 'Status', enum: ['submitted', 'approved'] },
		labels: { type: 'array', title: 'Labels', items: { type: 'string', enum: ['billable', 'internal'] } },
	},
}

const dict = {
	'Time entry': 'Urenregistratie',
	Status: 'Status',
	submitted: 'ingediend',
	approved: 'goedgekeurd',
	billable: 'declarabel',
	internal: 'intern',
}
const cnTranslate = (key, vars) => {
	const out = dict[key] ?? key
	return vars ? Object.entries(vars).reduce((acc, [k, v]) => acc.replace('{' + k + '}', v), out) : out
}

const mountDialog = (propsData, provide) => mount(CnFormDialog, { propsData, stubs, provide })

describe('CnFormDialog — schema-derived string translation', () => {
	it('translates the schema title in the create heading', () => {
		const wrapper = mountDialog({ schema, item: null }, { cnTranslate })
		expect(wrapper.vm.resolvedTitle).toContain('Urenregistratie')
		expect(wrapper.vm.resolvedTitle).not.toContain('Time entry')
		wrapper.unmount()
	})

	it('translates the schema title in the edit heading', () => {
		const wrapper = mountDialog({ schema, item: { id: '1' } }, { cnTranslate })
		expect(wrapper.vm.resolvedTitle).toContain('Urenregistratie')
		wrapper.unmount()
	})

	it('translates an explicit dialogTitle too', () => {
		const wrapper = mountDialog({ schema, item: null, dialogTitle: 'Time entry' }, { cnTranslate })
		expect(wrapper.vm.resolvedTitle).toBe('Urenregistratie')
		wrapper.unmount()
	})

	it('translates enum option labels but keeps the raw value as the option id', () => {
		const wrapper = mountDialog({ schema, item: null }, { cnTranslate })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'status')
		expect(wrapper.vm.getEnumOptions(field)).toEqual([
			{ id: 'submitted', label: 'ingediend' },
			{ id: 'approved', label: 'goedgekeurd' },
		])
		wrapper.unmount()
	})

	it('translates the label of the selected enum option', () => {
		const wrapper = mountDialog({ schema, item: { id: '1', status: 'approved' } }, { cnTranslate })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'status')
		expect(wrapper.vm.getSelectedEnumOption(field)).toMatchObject({ id: 'approved', label: 'goedgekeurd' })
		wrapper.unmount()
	})

	it('translates a value that is not in the enum list (constructed fallback option)', () => {
		const wrapper = mountDialog({ schema, item: { id: '1', status: 'submitted' } }, { cnTranslate })
		const field = { key: 'status', enum: ['approved'] }
		expect(wrapper.vm.getSelectedEnumOption(field)).toEqual({ id: 'submitted', label: 'ingediend' })
		wrapper.unmount()
	})

	it('prefers an enumLabels entry over the raw value, and translates that', () => {
		const wrapper = mountDialog({ schema, item: null }, { cnTranslate })
		const field = { key: 'status', enum: ['submitted'], enumLabels: { submitted: 'Status' } }
		expect(wrapper.vm.getEnumOptions(field)).toEqual([{ id: 'submitted', label: 'Status' }])
		wrapper.unmount()
	})

	it('translates array (multiselect) option labels and selected chips', () => {
		const wrapper = mountDialog({ schema, item: { id: '1', labels: ['billable'] } }, { cnTranslate })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'labels')
		expect(wrapper.vm.getArrayEnumOptions(field)).toEqual([
			{ id: 'billable', label: 'declarabel' },
			{ id: 'internal', label: 'intern' },
		])
		expect(wrapper.vm.getSelectedArrayOptions(field)).toEqual([{ id: 'billable', label: 'declarabel' }])
		wrapper.unmount()
	})

	it('reads x-enum-labels off the schema property and translates the LABEL, not the code', () => {
		// Enum values are stored contract values; several are Dutch by design
		// (`ingediend`), so English is not available as the source key. The
		// schema declares the English label and the catalogue translates that.
		const dutchCodes = {
			title: 'Timesheet',
			properties: {
				status: {
					type: 'string',
					title: 'Status',
					enum: ['ingediend', 'afgekeurd'],
					'x-enum-labels': { ingediend: 'Submitted', afgekeurd: 'Rejected' },
				},
			},
		}
		const nl = (key) => ({ Submitted: 'Ingediend', Rejected: 'Afgekeurd' })[key] ?? key
		const wrapper = mountDialog({ schema: dutchCodes, item: null }, { cnTranslate: nl })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'status')

		expect(field.enumLabels).toEqual({ ingediend: 'Submitted', afgekeurd: 'Rejected' })
		expect(wrapper.vm.getEnumOptions(field)).toEqual([
			{ id: 'ingediend', label: 'Ingediend' },
			{ id: 'afgekeurd', label: 'Afgekeurd' },
		])
		wrapper.unmount()
	})

	it('an English session reads the x-enum-labels label, not the Dutch code', () => {
		const dutchCodes = {
			title: 'Timesheet',
			properties: {
				status: { type: 'string', title: 'Status', enum: ['ingediend'], 'x-enum-labels': { ingediend: 'Submitted' } },
			},
		}
		const wrapper = mountDialog({ schema: dutchCodes, item: null })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'status')

		expect(wrapper.vm.getEnumOptions(field)).toEqual([{ id: 'ingediend', label: 'Submitted' }])
		wrapper.unmount()
	})

	it('picks up x-enum-labels declared on items for an array field', () => {
		const arraySchema = {
			title: 'Timesheet',
			properties: {
				labels: {
					type: 'array',
					title: 'Labels',
					items: { type: 'string', enum: ['declarabel'], 'x-enum-labels': { declarabel: 'Billable' } },
				},
			},
		}
		const wrapper = mountDialog({ schema: arraySchema, item: null })
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'labels')

		expect(wrapper.vm.getArrayEnumOptions(field)).toEqual([{ id: 'declarabel', label: 'Billable' }])
		wrapper.unmount()
	})

	it('leaves everything in the English source when no translator is provided', () => {
		const wrapper = mountDialog({ schema, item: null })
		expect(wrapper.vm.resolvedTitle).toContain('Time entry')
		const field = wrapper.vm.resolvedFields.find((f) => f.key === 'status')
		expect(wrapper.vm.getEnumOptions(field)).toEqual([
			{ id: 'submitted', label: 'submitted' },
			{ id: 'approved', label: 'approved' },
		])
		wrapper.unmount()
	})
})
