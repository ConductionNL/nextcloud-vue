/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest column's `filterable` and `filterField` reach the table, so a
 * column that opts out of the head filter draws no funnel (DqZaaktypeVelden
 * "In de lijst").
 *
 * @spec openspec/changes/object-list-column-filterable/specs/object-list-column-filterable/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

/**
 * @param {Array<object>} columns The manifest columns.
 * @return {object} The mounted widget.
 */
function mount(columns) {
	const w = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', filterable: true, columns } },
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
	w.vm.rows = []
	return w
}

describe('CnObjectListWidget column filterable', () => {
	it('passes filterable: false through', async () => {
		const w = mount([{ key: 'caseType', label: 'In the list', filterable: false }])
		await w.vm.$nextTick()
		expect(w.vm.resolvedColumns[0].filterable).toBe(false)
	})

	it('passes filterField through', async () => {
		const w = mount([{ key: 'clientName', label: 'Client', filterField: 'clientRef' }])
		await w.vm.$nextTick()
		expect(w.vm.resolvedColumns[0].filterField).toBe('clientRef')
	})

	it('leaves filterable unset when the column does not say', async () => {
		const w = mount([{ key: 'title', label: 'Title' }])
		await w.vm.$nextTick()
		expect('filterable' in w.vm.resolvedColumns[0]).toBe(false)
	})
})
