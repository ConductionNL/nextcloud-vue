/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts entry with `format: "currency"` shows a money amount, as shillinq's
 * invoice facts must ("€ 1.234,50", not "1234.5"). It reuses the library's
 * money formatter (formatMoney), so the currency resolves as in a table cell:
 * `currency`, else the record's `currencyField`, else the app's reporting
 * currency, else EUR.
 *
 * @spec openspec/changes/facts-currency-format/specs/facts-widget/spec.md#requirement-a-facts-entry-can-show-a-money-amount
 */
import { mount } from '@vue/test-utils'

import '../../src/components/CnFactsWidget/index.js'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const invoice = { id: 'f-1', number: 'F-2026-0001', total: 1234.5, currency: 'USD', note: 'n.v.t.' }

/**
 * Mount the widget over the invoice.
 *
 * @param {Array<object>} fields The facts entries.
 * @param {object} [provide] Extra provides.
 * @return {object} The wrapper.
 */
function mountFacts(fields, provide = {}) {
	return mount(CnFactsWidget, {
		propsData: { objectData: invoice, content: { fields } },
		provide,
		stubs: { NcLoadingIcon: true },
	})
}

const text = (w, index = 0) => w.findAll('.cn-facts-widget__row').at(index).find('dd').text().replace(/[  ]/g, ' ')

describe('CnFactsWidget: a currency entry', () => {
	it('shows the amount as money, in EUR by default', () => {
		const value = text(mountFacts([{ path: 'total', label: 'Total', format: 'currency' }]))
		expect(value).toContain('€')
		expect(value).toMatch(/1[.,\s]?234[.,]50/)
	})

	it('shows the raw number without the format (control)', () => {
		expect(text(mountFacts([{ path: 'total', label: 'Total' }]))).toBe('1234.5')
	})

	it('reads the currency from the entry, then from the record\'s currencyField', () => {
		expect(text(mountFacts([{ path: 'total', label: 'Total', format: 'currency', currency: 'GBP' }]))).toMatch(/£|GBP/)
		expect(text(mountFacts([{ path: 'total', label: 'Total', format: 'currency', currencyField: 'currency' }]))).toMatch(/\$|USD/)
	})

	it('falls back to the app\'s reporting currency', () => {
		const w = mountFacts([{ path: 'total', label: 'Total', format: 'currency' }], { cnAppConfig: { value: { currency: 'CHF' } } })
		expect(text(w)).toMatch(/CHF/)
	})

	it('honours decimals', () => {
		expect(text(mountFacts([{ path: 'total', label: 'Total', format: 'currency', decimals: 0 }]))).toMatch(/1[.,\s]?235(?![.,]\d)/)
	})

	it('shows a value that is not a number as written', () => {
		expect(text(mountFacts([{ path: 'note', label: 'Total', format: 'currency' }]))).toBe('n.v.t.')
	})

	it('formats a currency part of a line', () => {
		const w = mountFacts([{ as: 'line', parts: ['number', { path: 'total', format: 'currency' }] }])
		const line = w.text().replace(/[  ]/g, ' ')
		expect(line).toContain('F-2026-0001 · ')
		expect(line).toMatch(/€\s?1[.,\s]?234[.,]50|1[.,\s]?234[.,]50\s?€/)
	})
})
