/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget shows a money value in the currency of the detail page's
 * object: `content.format.currencyField` names the object's currency field,
 * and `currency: '@object.<field>'` reads it as a token. Before this the
 * format could only reach `@config.<key>`, so a contract in dollars printed
 * in the reporting currency.
 *
 * @spec openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getCanonicalLocale: () => 'en-US',
}))

const money = (amount, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

function mountTile(content, record, reporting = 'EUR') {
	return mount(CnStatWidget, {
		props: { content },
		global: {
			provide: {
				cnObjectContext: ref({ objectId: 'c-1', object: record, register: 'pipelinq', schema: 'salesContract' }),
				cnAppConfig: ref({ currency: reporting }),
			},
		},
	})
}

describe('CnStatWidget: the object\'s own currency', () => {
	it('reads the currency from format.currencyField', () => {
		const w = mountTile({ label: 'Value', objectField: 'value', format: { style: 'currency', currencyField: 'currency' } }, { value: 1250, currency: 'USD' })
		expect(w.text()).toContain(money(1250, 'USD'))
	})

	it('reads currency: "@object.currency"', () => {
		const w = mountTile({ label: 'Value', objectField: 'value', format: { style: 'currency', currency: '@object.currency' } }, { value: 1250, currency: 'GBP' })
		expect(w.text()).toContain(money(1250, 'GBP'))
	})

	it('falls back to the reporting currency when the object has none', () => {
		const w = mountTile({ label: 'Value', objectField: 'value', format: { style: 'currency', currencyField: 'currency' } }, { value: 1250 }, 'CHF')
		expect(w.text()).toContain(money(1250, 'CHF'))
	})
})
