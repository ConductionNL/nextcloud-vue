/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `emptyValue` reaches the table, so a badge column draws a pill
 * on a row without a value (DqZaaktypeVelden Herkomst: an own field has no
 * `origin` and reads "Eigen veld"). The list used to copy a fixed set of
 * column keys and dropped it, so own fields showed a dash.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: {} }) },
}))

describe('CnObjectListWidget column emptyValue', () => {
	it('keeps a column\'s emptyValue for the table', () => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: {
				content: {
					register: 'dossiq',
					schema: 'propertyDefinition',
					columns: [{ key: 'name', label: 'Field' }, { key: 'origin', label: 'Origin', widget: 'badge', emptyValue: 'own' }],
				},
			},
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		expect(w.vm.resolvedColumns[1]).toMatchObject({ key: 'origin', widget: 'badge', emptyValue: 'own' })
		expect(w.vm.resolvedColumns[0].emptyValue).toBeUndefined()
	})
	it('keeps a column\'s emptyValueBy for the table (DqZaaktypeStatussen Resultaten "Permanent")', () => {
		const by = { field: 'archivalAction', values: { bewaren: 'Kept permanently' } }
		const w = shallowMount(CnObjectListWidget, {
			propsData: {
				content: {
					register: 'dossiq',
					schema: 'resultType',
					columns: [{ key: 'name', label: 'Result' }, { key: 'archivalPeriod', label: 'Archival period', formatter: 'isoDuration', emptyValueBy: by }],
				},
			},
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		expect(w.vm.resolvedColumns[1].emptyValueBy).toEqual(by)
	})
})
