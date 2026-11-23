/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-widgets-duration-and-subobject-table/tasks.md#task-2
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnSubObjectsField from '../../src/components/CnSubObjectsField/CnSubObjectsField.vue'

const items = {
	type: 'object',
	required: ['name', 'key'],
	properties: { name: { title: 'Name' }, key: { title: 'Key' }, color: {}, order: { type: 'integer' } },
}
const rows = [
	{ name: 'A', key: 'a', order: 1 },
	{ name: 'B', key: 'b', order: 2 },
	{ name: 'C', key: 'c', order: 3 },
]

function mountIt(extra = {}) {
	return shallowMount(CnSubObjectsField, { props: { modelValue: rows, items, inputLabel: 'Statuses', ...extra } })
}
const last = (w) => w.emitted('update:modelValue').at(-1)[0]

describe('CnSubObjectsField', () => {
	it('lists a column per property up to maxColumns', () => {
		expect(mountIt().vm.columns.map((c) => c.key)).toEqual(['name', 'key', 'color', 'order'])
		expect(mountIt({ maxColumns: 2 }).vm.columns).toHaveLength(2)
		expect(mountIt().vm.tableRows).toHaveLength(3)
	})

	it('moves a row down and renumbers order', () => {
		const w = mountIt()
		w.vm.moveRow(0, 1)
		expect(last(w).map((r) => [r.key, r.order])).toEqual([['b', 1], ['a', 2], ['c', 3]])
	})

	it('does not move past the ends', () => {
		const w = mountIt()
		w.vm.moveRow(0, -1)
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('duplicates and removes rows', () => {
		const w = mountIt()
		w.vm.duplicateRow(1)
		expect(last(w).map((r) => r.key)).toEqual(['a', 'b', 'b', 'c'])
		w.vm.removeRow(0)
		expect(last(w).map((r) => r.key)).toEqual(['b', 'c'])
	})

	it('adds and edits through the nested dialog payload', () => {
		const w = mountIt()
		w.vm.openAdd()
		w.vm.onDialogConfirm({ name: 'D', key: 'd' })
		expect(last(w)).toHaveLength(4)
		expect(last(w)[3]).toMatchObject({ key: 'd', order: 4 })
		w.vm.openEdit(1)
		expect(w.vm.editing.row).toMatchObject({ key: 'b' })
		w.vm.onDialogConfirm({ name: 'B2', key: 'b' })
		expect(last(w)[1].name).toBe('B2')
		expect(w.vm.editing).toBeNull()
	})

	it('leaves rows alone without an order property', () => {
		const w = shallowMount(CnSubObjectsField, { props: { modelValue: [{ a: 1 }, { a: 2 }], items: { properties: { a: {} } } } })
		w.vm.moveRow(0, 1)
		expect(last(w)).toEqual([{ a: 2 }, { a: 1 }])
	})

	it('renders Move up and Move down as buttons for keyboard use', () => {
		const w = mount(CnSubObjectsField, {
			props: { modelValue: rows, items, inputLabel: 'Statuses' },
			global: { stubs: { NcActions: { template: '<div><slot /></div>' }, NcActionButton: { template: '<button><slot /></button>' }, CnFormDialog: true } },
		})
		const labels = w.findAll('button').map((b) => b.text())
		expect(labels).toContain('Move up')
		expect(labels).toContain('Move down')
	})
})
