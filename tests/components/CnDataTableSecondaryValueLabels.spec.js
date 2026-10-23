/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A secondary line can name a field's value in words through the column's
 * `secondaryLabels`, `{ field: { value: label, '*': label } }`, translated:
 * DqZaaktypen reads "Meegeleverd · Woo" for a case type the app shipped
 * (`@self.owner` `__system__`) and "Eigen zaaktype · ..." for any other.
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const ROWS = [
	{ id: '1', title: 'Woo-verzoek', subject: 'Woo', '@self': { owner: '__system__' } },
	{ id: '2', title: 'Subsidie', subject: 'gekopieerd', '@self': { owner: 'anouk' } },
	{ id: '3', title: 'Leeg', subject: 'geen eigenaar', '@self': {} },
]

const NL = { Shipped: 'Meegeleverd', 'Own case type': 'Eigen zaaktype' }

function mountTable(columns) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns, rowKey: 'id' },
		global: { provide: { cnTranslate: (key) => NL[key] || key } },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

const lines = (wrapper) => wrapper.findAll('[data-testid="cn-cell-secondary"]').map((w) => w.text())

describe('CnDataTable — secondary line with value labels', () => {
	const labels = { '@self.owner': { __system__: 'Shipped', '*': 'Own case type' } }

	it('names a value by its label and any other value by the fallback, translated', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Zaaktype', secondary: '{@self.owner} · {subject}', secondaryLabels: labels }])
		expect(lines(wrapper)).toEqual(['Meegeleverd · Woo', 'Eigen zaaktype · gekopieerd', 'geen eigenaar'])
	})

	it('works on a bare field key too', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Zaaktype', secondary: '@self.owner', secondaryLabels: labels }])
		expect(lines(wrapper)).toEqual(['Meegeleverd', 'Eigen zaaktype'])
	})

	it('keeps the stored value without a fallback for it', () => {
		const wrapper = mountTable([{ key: 'title', label: 'Zaaktype', secondary: '@self.owner', secondaryLabels: { '@self.owner': { __system__: 'Shipped' } } }])
		expect(lines(wrapper)).toEqual(['Meegeleverd', 'anouk'])
	})
})
