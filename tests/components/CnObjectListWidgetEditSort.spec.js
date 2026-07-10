/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's editable + orderable rows (round-2 review):
 *  - a column-header sort toggles a client-side asc/desc sort
 *  - `content.allowEdit` opens CnFormDialog in edit mode for the clicked row
 *  - `content.orderField` swaps a row's order value with its neighbour
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content },
		stubs: { CnDataTable: true, CnFormDialog: true, NcActions: true, NcActionButton: true },
		mocks: { t: (_app, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

const rows = [
	{ id: 'a', title: 'Banana', value: 30, pos: 2 },
	{ id: 'b', title: 'Apple', value: 10, pos: 1 },
	{ id: 'c', title: 'Cherry', value: 20, pos: 3 },
]

describe('CnObjectListWidget — sort toggle', () => {
	it('sorts rows ascending then descending on repeated header clicks', async () => {
		const w = mountWidget({ register: 'r', schema: 's', columns: [{ key: 'value', label: 'Value' }] })
		w.vm.rows = rows.slice()
		await w.vm.$nextTick()

		w.vm.onSort({ key: 'value', order: 'asc' })
		expect(w.vm.displayRows.map((r) => r.value)).toEqual([10, 20, 30])

		w.vm.onSort({ key: 'value', order: 'desc' })
		expect(w.vm.displayRows.map((r) => r.value)).toEqual([30, 20, 10])

		// Cleared sort → fetched order restored.
		w.vm.onSort({ key: null, order: null })
		expect(w.vm.displayRows.map((r) => r.value)).toEqual([30, 10, 20])
	})

	it('string-sorts non-numeric columns', async () => {
		const w = mountWidget({ register: 'r', schema: 's', columns: [{ key: 'title', label: 'Title' }] })
		w.vm.rows = rows.slice()
		await w.vm.$nextTick()
		w.vm.onSort({ key: 'title', order: 'asc' })
		expect(w.vm.displayRows.map((r) => r.title)).toEqual(['Apple', 'Banana', 'Cherry'])
	})

	it('defaults columns to sortable', () => {
		const w = mountWidget({ register: 'r', schema: 's', columns: [{ key: 'value', label: 'Value' }] })
		expect(w.vm.resolvedColumns[0].sortable).toBe(true)
	})
})

describe('CnObjectListWidget — inline edit', () => {
	it('opens CnFormDialog in edit mode for the clicked row', async () => {
		const w = mountWidget({ register: 'r', schema: 's', allowEdit: true, columns: [{ key: 'title' }] })
		w.vm.createSchema = { title: 'S', properties: { title: { type: 'string' } } } // short-circuits loadSchema
		await w.vm.openEdit(rows[0])
		expect(w.vm.showEdit).toBe(true)
		expect(w.vm.editItem).toEqual(rows[0])
		expect(w.vm.editItem).not.toBe(rows[0]) // cloned, not the same reference
	})

	it('exposes allowEdit only when content opts in with a register+schema', () => {
		expect(mountWidget({ register: 'r', schema: 's', allowEdit: true }).vm.allowEdit).toBe(true)
		expect(mountWidget({ register: 'r', schema: 's' }).vm.allowEdit).toBe(false)
		expect(mountWidget({ allowEdit: true }).vm.allowEdit).toBe(false)
	})
})

describe('CnObjectListWidget — reorder', () => {
	it('swaps the orderField value with the neighbour and persists both', async () => {
		const w = mountWidget({ register: 'r', schema: 's', orderField: 'pos', columns: [{ key: 'title' }] })
		w.vm.rows = rows.slice()
		const persisted = []
		w.vm.persistRow = jest.fn((obj) => { persisted.push({ id: obj.id, pos: obj.pos }); return Promise.resolve() })
		w.vm.fetchRows = jest.fn().mockResolvedValue()
		await w.vm.$nextTick()

		// Ordering by pos asc: b(1), a(2), c(3). Move a DOWN swaps a.pos<->c.pos.
		await w.vm.moveRow(rows[0], 1)
		expect(w.vm.persistRow).toHaveBeenCalledTimes(2)
		const byId = Object.fromEntries(persisted.map((p) => [p.id, p.pos]))
		expect(byId.a).toBe(3)
		expect(byId.c).toBe(2)
		expect(w.vm.fetchRows).toHaveBeenCalled()
	})

	it('is a no-op at the end of the list', async () => {
		const w = mountWidget({ register: 'r', schema: 's', orderField: 'pos', columns: [{ key: 'title' }] })
		w.vm.rows = rows.slice()
		w.vm.persistRow = jest.fn().mockResolvedValue()
		// c has pos 3 (last) → moving down does nothing.
		await w.vm.moveRow(rows[2], 1)
		expect(w.vm.persistRow).not.toHaveBeenCalled()
		expect(w.vm.isLastRow(rows[2])).toBe(true)
		expect(w.vm.isFirstRow(rows[1])).toBe(true) // b has pos 1
	})
})
