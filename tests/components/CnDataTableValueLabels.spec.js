/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column can name an empty value (`emptyLabel`), show a coded value as a
 * word (`valueLabels`) and ask whether a list holds a value (`contains`), so
 * a mandate table reads "Onbeperkt", "Ja" and "Waarschuwing" without a
 * custom cell.
 *
 * @spec openspec/changes/column-value-labels/specs/column-value-labels/spec.md#requirement-a-column-can-name-empty-values-code-words-and-list-membership
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: 'behandelaar', role: 'Behandelaar', terms: { plafond: 500000, decisionTypes: ['vergunning'], enforcement: 'none' } },
	{ id: 'hoofd', role: 'Afdelingshoofd', terms: { plafond: null, decisionTypes: ['vergunning', 'bezwaar'], enforcement: 'full' } },
]
const COLUMNS = [
	{ key: 'role', label: 'Role' },
	{ key: 'terms.plafond', label: 'Decides up to', emptyLabel: 'Unlimited' },
	{ key: 'terms.decisionTypes', label: 'Decides objections', contains: 'bezwaar', valueLabels: { true: 'Yes', false: 'No' } },
	{ key: 'terms.enforcement', label: 'Enforcement', valueLabels: { none: 'No', warning: 'Warning', full: 'Yes' } },
]

function cells(translate = (s) => s) {
	const wrapper = mount(CnDataTable, {
		props: { rows: ROWS, columns: COLUMNS, rowKey: 'id' },
		global: {
			provide: { cnTranslate: translate },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ String(value) }}</span>' } },
		},
	})
	return wrapper.findAll('tbody tr').map((tr) => tr.findAll('.cell').map((c) => c.text()))
}

describe('CnDataTable: value labels', () => {
	it('names an empty value, shows codes as words and answers list membership', () => {
		expect(cells()).toEqual([
			['Behandelaar', '500000', 'No', 'No'],
			['Afdelingshoofd', 'Unlimited', 'Yes', 'Yes'],
		])
	})

	it('translates the words through the app', () => {
		const nl = { Unlimited: 'Onbeperkt', Yes: 'Ja', No: 'Nee' }
		expect(cells((s) => nl[s] ?? s)[1]).toEqual(['Afdelingshoofd', 'Onbeperkt', 'Ja', 'Ja'])
	})

	it('leaves a column without these keys as it was', () => {
		expect(cells()[0][0]).toBe('Behandelaar')
	})
})
