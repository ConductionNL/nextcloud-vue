/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for `enumLabels` on manifest columns.
 *
 * A list column that addresses a dotted path into an extend-inlined reference has
 * no schema property to take `x-enum-labels` from, so the column carries the
 * mapping itself. CnObjectListWidget must pass it through, and CnDataTable must
 * hand it to CnCellRenderer alongside `enum`.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

describe('manifest column enumLabels', () => {
	it('CnObjectListWidget passes enumLabels through with enum', async () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: {
				content: {
					register: 'r',
					schema: 'document',
					columns: [{
						key: 'informatieobject.direction',
						enum: ['incoming', 'outgoing'],
						enumLabels: { incoming: 'Incoming', outgoing: 'Outgoing' },
					}],
				},
			},
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		w.vm.rows = []
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns[0].enumLabels).toEqual({ incoming: 'Incoming', outgoing: 'Outgoing' })
	})

	it('CnDataTable hands the column enumLabels to the cell renderer', () => {
		const ctx = { getSchemaProperty: () => ({}) }
		const property = CnDataTable.methods.columnProperty.call(ctx, {
			key: 'informatieobject.direction',
			enum: ['incoming'],
			enumLabels: { incoming: 'Incoming' },
		})

		expect(property.enum).toEqual(['incoming'])
		expect(property.enumLabels).toEqual({ incoming: 'Incoming' })
	})

	it('CnDataTable falls back to the schema property enumLabels when the column has none', () => {
		const ctx = { getSchemaProperty: () => ({ enumLabels: { a: 'A' } }) }
		const property = CnDataTable.methods.columnProperty.call(ctx, { key: 'status', enum: ['a'] })

		expect(property.enumLabels).toEqual({ a: 'A' })
	})
})
