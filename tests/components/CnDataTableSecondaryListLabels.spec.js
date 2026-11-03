/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A secondary line names each value of a list field through the column's
 * `secondaryLabels` and joins them as a list in the user's language:
 * PtMededelingenActies reads "Informatie · toont op website en Mijn Zuiddrecht"
 * for a notice on `surfaces: ['site', 'portal']`.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/data-table/spec.md#requirement-a-secondary-line-names-each-value-of-a-list-field
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const NL = { Information: 'Informatie', Warning: 'Waarschuwing', website: 'website', 'Mijn Zuiddrecht': 'Mijn Zuiddrecht', '{level} · shows on {surfaces}': '{level} · toont op {surfaces}' }

function lines(rows, column) {
	document.documentElement.lang = 'nl'
	const wrapper = mount(CnDataTable, {
		propsData: { rows, columns: [column], rowKey: 'id' },
		global: { provide: { cnTranslate: (key) => NL[key] || key } },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
	return wrapper.findAll('[data-testid="cn-cell-secondary"]').map((w) => w.text())
}

const COLUMN = {
	key: 'message',
	label: 'Mededeling',
	secondary: '{level} · toont op {surfaces}',
	secondaryLabels: { level: { info: 'Information', warning: 'Warning' }, surfaces: { site: 'website', portal: 'Mijn Zuiddrecht' } },
}

describe('CnDataTable: secondary line with a list field', () => {
	it('names every value and joins them as a list', () => {
		expect(lines([
			{ id: '1', message: 'Kerst', level: 'info', surfaces: ['site', 'portal'] },
			{ id: '2', message: 'DigiD', level: 'warning', surfaces: ['portal'] },
		], COLUMN)).toEqual(['Informatie · toont op website en Mijn Zuiddrecht', 'Waarschuwing · toont op Mijn Zuiddrecht'])
	})

	it('reads the template in the host\'s translation', () => {
		expect(lines([{ id: '4', message: 'x', level: 'warning', surfaces: ['site'] }], { ...COLUMN, secondary: '{level} · shows on {surfaces}' })).toEqual(['Waarschuwing · toont op website'])
	})

	it('keeps a value the labels do not name, and drops empty entries', () => {
		expect(lines([{ id: '3', message: 'x', level: 'info', surfaces: ['site', '', 'kiosk'] }], COLUMN)).toEqual(['Informatie · toont op website en kiosk'])
	})
})
