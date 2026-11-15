/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A field offers only the values its controlling field allows
 * (`x-openregister-dependent-values`, the table OpenRegister enforces on
 * save), and loses a value the new row does not allow: stackiq's licence per
 * licence type.
 *
 * @spec openspec/changes/form-dependent-values/specs/form-dialog/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

const SCHEMA = {
	type: 'object',
	properties: {
		licentietype: { type: 'string', title: 'Licence type', enum: ['Open source', 'Closed source', 'Mixed'] },
		licence: {
			type: 'string',
			title: 'Licence',
			enum: ['EUPL-1.2', 'MIT', 'Apache-2.0'],
			'x-openregister-dependent-values': { controlledBy: 'licentietype', allowed: { 'Open source': ['EUPL-1.2', 'MIT', 'Apache-2.0'], 'Closed source': [] } },
		},
		standards: {
			type: 'array',
			title: 'Standards',
			items: { type: 'string', enum: ['A', 'B', 'C'], 'x-openregister-dependent-values': { controlledBy: 'licentietype', allowed: { 'Open source': ['A', 'B'] } } },
		},
	},
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const mountForm = (item) => shallowMount(CnFormDialog, { propsData: { schema: SCHEMA, item }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })
const field = (w, key) => w.vm.resolvedFields.find((f) => f.key === key)
const ids = (options) => options.map((o) => o.id)

describe('CnFormDialog dependent values', () => {
	it('offers the row of the controlling value, nothing for an empty row, everything for an unlisted value', async () => {
		const w = mountForm({ licentietype: 'Open source' })
		await tick()
		expect(ids(w.vm.getEffectiveOptions(field(w, 'licence')))).toEqual(['EUPL-1.2', 'MIT', 'Apache-2.0'])
		w.vm.updateField('licentietype', 'Closed source')
		expect(w.vm.getEffectiveOptions(field(w, 'licence'))).toEqual([])
		w.vm.updateField('licentietype', 'Mixed')
		expect(ids(w.vm.getEffectiveOptions(field(w, 'licence')))).toEqual(['EUPL-1.2', 'MIT', 'Apache-2.0'])
	})

	it('narrows an array field by its items\' table', async () => {
		const w = mountForm({ licentietype: 'Open source' })
		await tick()
		expect(ids(w.vm.getEffectiveArrayOptions(field(w, 'standards')))).toEqual(['A', 'B'])
	})

	it('clears a value the new row does not allow, and keeps one it does', async () => {
		const w = mountForm({ licentietype: 'Open source', licence: 'MIT', standards: ['A', 'C'] })
		await tick()
		w.vm.updateField('licentietype', 'Closed source')
		await w.vm.$nextTick()
		expect(w.vm.formData.licence).toBeNull()
		w.vm.updateField('licentietype', 'Open source')
		w.vm.updateField('licence', 'EUPL-1.2')
		await w.vm.$nextTick()
		expect(w.vm.formData.licence).toBe('EUPL-1.2')
		expect(w.vm.formData.standards).toEqual(['A'])
	})

	it('leaves a field without a table alone', async () => {
		const w = mountForm({ licentietype: 'Closed source' })
		await tick()
		expect(ids(w.vm.getEffectiveOptions(field(w, 'licentietype')))).toEqual(['Open source', 'Closed source', 'Mixed'])
	})
})
