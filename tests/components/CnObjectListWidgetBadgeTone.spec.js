/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A badge column's `widgetProps.resolve` colour reaches the cell in an object
 * list too (DqZaakGerelateerd Deelzaken: "In behandeling" in its status type's purple).
 *
 * @spec openspec/changes/object-list-badge-tone-from-record/specs/object-list-badge-tone-from-record/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

const statusColumn = {
	key: 'status',
	label: 'Status',
	widget: 'badge',
	widgetProps: { resolve: { register: 'dossiq', schema: 'statusType', colorField: 'colour' } },
}

function mountWith(columns, resolve) {
	const w = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'case', columns } },
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
	w.vm._refLookResolver = { resolve }
	return w
}

describe('CnObjectListWidget badge tone from the referenced record', () => {
	it('reads the colour field for the ids on screen and hands it to the badge column', async () => {
		const resolve = jest.fn((register, schema, ids, field) => Promise.resolve(field === 'colour' ? { s1: 'purple', s2: 'blue' } : {}))
		const w = mountWith([{ key: 'title' }, statusColumn], resolve)
		w.vm.rows = [{ id: 'a', title: 'A', status: 's1' }, { id: 'b', title: 'B', status: 's2' }, { id: 'c', title: 'C', status: 's1' }]
		await w.vm.loadRefLooks()
		await w.vm.$nextTick()

		expect(resolve).toHaveBeenCalledWith('dossiq', 'statusType', ['s1', 's2'], 'colour', { strict: true })
		const status = w.vm.resolvedColumns.find((c) => c.key === 'status')
		expect(status.widgetProps.looks).toEqual({ s1: { color: 'purple', icon: null }, s2: { color: 'blue', icon: null } })
		expect(status.widgetProps.resolve).toEqual(statusColumn.widgetProps.resolve)
	})

	it('leaves a column without resolve alone and asks nothing', async () => {
		const resolve = jest.fn(() => Promise.resolve({}))
		const w = mountWith([{ key: 'status', widget: 'badge', widgetProps: { variant: 'info' } }], resolve)
		w.vm.rows = [{ id: 'a', status: 's1' }]
		await w.vm.loadRefLooks()

		expect(resolve).not.toHaveBeenCalled()
		expect(w.vm.resolvedColumns[0].widgetProps).toEqual({ variant: 'info' })
	})

	it('keeps the badge as declared when the read fails', async () => {
		const resolve = jest.fn(() => Promise.reject(new Error('down')))
		const w = mountWith([statusColumn], resolve)
		w.vm.rows = [{ id: 'a', status: 's1' }]
		await w.vm.loadRefLooks()

		expect(w.vm.resolvedColumns[0].widgetProps.looks).toEqual({ s1: { color: null, icon: null } })
	})
})
