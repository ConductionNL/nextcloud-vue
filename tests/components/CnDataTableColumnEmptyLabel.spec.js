/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's `emptyLabel` is the words an empty cell reads, translated, as
 * plain text past the column's format (DqTenant Mandaten "Besluiten tot": an
 * Afdelingshoofd without a ceiling reads "Onbeperkt", not a dash or a
 * currency-formatted string). A cell with a value is unchanged.
 *
 * @spec openspec/changes/column-empty-label/specs/data-table/spec.md
 */
const { mount, shallowMount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: {} }) },
}))

const ROWS = [
	{ id: 'a', role: 'Behandelaar', ceiling: 5000 },
	{ id: 'b', role: 'Afdelingshoofd' },
	{ id: 'c', role: 'Stagiair', ceiling: '' },
]

describe('CnDataTable column emptyLabel', () => {
	it('reads an empty cell as the translated label, as text, and leaves a value to the renderer', () => {
		const w = mount(CnDataTable, {
			propsData: {
				rows: ROWS,
				columns: [
					{ key: 'role', label: 'Role' },
					{ key: 'ceiling', label: 'Decides up to', format: { style: 'currency', currency: 'EUR' }, emptyLabel: 'Unlimited' },
				],
			},
			global: {
				provide: { cnTranslate: (key) => ({ Unlimited: 'Onbeperkt' })[key] ?? key },
				stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
			},
		})
		const rows = w.findAll('[data-testid="cn-object-row"]')
		expect(rows[0].findAll('.cell')[1].text()).toBe('5000')
		expect(rows[1].find('[data-testid="cn-cell-empty-label"]').text()).toBe('Onbeperkt')
		expect(rows[2].find('[data-testid="cn-cell-empty-label"]').text()).toBe('Onbeperkt')
		expect(rows[1].findAll('.cell')).toHaveLength(1)
	})

	it('reaches the table from an object-list column', () => {
		const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'dossiq', schema: 'tenantMandate', columns: [{ key: 'terms.plafond', label: 'Decides up to', emptyLabel: 'Unlimited' }] } },
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		expect(w.vm.resolvedColumns[0].emptyLabel).toBe('Unlimited')
	})
})
