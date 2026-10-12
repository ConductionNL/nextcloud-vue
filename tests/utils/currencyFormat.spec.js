/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A money amount in a record-list template, a formatter and a table cell.
 *
 * @spec openspec/changes/screens-currency-format/specs/currency-format/spec.md
 */
const { mount } = require('@vue/test-utils')
const { registerTranslations } = require('../../src/l10n/index.js')
const { formatMoney } = require('../../src/utils/formatMetric.js')
const { fillTemplate } = require('../../src/utils/fillTemplate.js')
const { BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const plain = (text) => text.replace(/ /g, ' ')

function setLanguage(language) {
	globalThis._nc_l10n_language = language
	globalThis._nc_l10n_locale = language
	registerTranslations()
}

beforeEach(() => setLanguage('nl'))
afterAll(() => setLanguage('en'))

describe('formatMoney', () => {
	it('writes an amount in the reader language and the named currency', () => {
		expect(plain(formatMoney(1234.5, { currency: 'EUR' }))).toBe('€ 1.234,50')
		expect(plain(formatMoney(1234.5, { currency: 'USD' }))).toMatch(/US\$\s?1\.234,50/)
	})

	it('reads the currency from a row field, and falls back to EUR for a bad code', () => {
		expect(plain(formatMoney(10, { currencyField: 'price.code' }, { price: { code: 'GBP' } }))).toMatch(/£\s?10,00/)
		expect(plain(formatMoney(10, { currencyField: 'code' }, { code: 'nope' }))).toBe('€ 10,00')
	})

	it('answers empty for an empty or non-numeric value', () => {
		expect(formatMoney(null)).toBe('')
		expect(formatMoney('abc')).toBe('')
	})
})

describe('the currency template token', () => {
	it('fills {amount|currency}, a literal code and a row field', () => {
		const row = { value: 12000, code: 'USD' }
		expect(plain(fillTemplate('{value|currency}', row))).toBe('€ 12.000,00')
		expect(plain(fillTemplate('{value|currency:GBP}', row))).toMatch(/£\s?12\.000,00/)
		expect(plain(fillTemplate('Waarde {value|currency:code}', row))).toMatch(/^Waarde US\$\s?12\.000,00$/)
	})

	it('falls back to the app reporting currency, for a row without a code and for a bare token', () => {
		const context = { config: { currency: 'USD' } }
		expect(plain(fillTemplate('{value|currency:code}', { value: 5 }, new Date(), context))).toMatch(/US\$\s?5,00/)
		expect(plain(fillTemplate('{value|currency}', { value: 5 }, new Date(), context))).toMatch(/US\$\s?5,00/)
		expect(plain(fillTemplate('{value|currency:code}', { value: 5, code: 'GBP' }, new Date(), context))).toMatch(/£\s?5,00/)
	})

	it('empties the template when the amount is missing', () => {
		expect(fillTemplate('{value|currency}', {})).toBe('')
	})
})

describe('the currency formatter and cell', () => {
	it('takes the code from formatterOptions.currencyField', () => {
		expect(plain(BUILT_IN_FORMATTERS.currency(5, { cur: 'GBP' }, {}, { currencyField: 'cur' }))).toMatch(/£\s?5,00/)
	})

	it('draws a currency cell in the code the row holds', () => {
		const cell = mount(CnCellRenderer, {
			propsData: { value: 99.5, row: { cur: 'USD' }, format: { style: 'currency', currencyField: 'cur' } },
			stubs: { NcDateTime: true },
		})
		expect(plain(cell.text())).toMatch(/US\$\s?99,50/)
	})
})
