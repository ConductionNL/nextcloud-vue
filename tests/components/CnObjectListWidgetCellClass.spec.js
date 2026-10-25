/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest column's `cellClass` reaches the table (DqZaakContact's summary
 * wraps with `cn-cell--wrap`).
 *
 * @spec openspec/changes/object-list-column-cell-class/specs/object-list-column-cell-class/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

describe('CnObjectListWidget column cellClass', () => {
	it('passes it through', async () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 'contactmoment', columns: [{ key: 'summary', label: 'Summary', cellClass: 'cn-cell--wrap' }] } },
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		w.vm.rows = []
		await w.vm.$nextTick()
		expect(w.vm.resolvedColumns[0].cellClass).toBe('cn-cell--wrap')
	})
})
