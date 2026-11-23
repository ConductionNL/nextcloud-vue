/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stats-block entry's money value is shown in the currency the entry names.
 *
 * pipelinq's sales contract printed "EUR" as a count label beside a bare
 * number, whatever the contract's own currency, and an entry's
 * `"format": "currency"` was ignored. Now an entry declares where the
 * currency comes from (`currencyField` on the page object, or `currency`,
 * e.g. `@config.currency`), falls back to the app's reporting currency, and
 * the amount is formatted with Intl in the user's locale.
 *
 * These mount the real CnStatsBlock, so the text asserted is what a user sees.
 *
 * @spec openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md
 */
import { mount } from '@vue/test-utils'

let mockLocale = 'en-US'
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	getCanonicalLocale: () => mockLocale,
}))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const CnStatsBlockWidget = require('../../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue').default

/**
 * Let the lazy imports and the fetches settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

/**
 * Mount the widget on a detail page holding `object`, in an app whose
 * reporting currency is `reporting`.
 *
 * @param {object} props The widget props.
 * @param {object} [options] The page context.
 * @param {object|null} [options.object] The detail page's object.
 * @param {string} [options.reporting] The app config's `currency`.
 * @return {object} The wrapper.
 */
function mountWidget(props, { object = null, reporting } = {}) {
	return mount(CnStatsBlockWidget, {
		props,
		global: {
			provide: {
				cnObjectContext: { value: { objectId: 'c-1', object } },
				cnAppConfig: { value: reporting ? { currency: reporting } : {} },
			},
		},
	})
}

const money = (amount, currency, locale = 'en-US') => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
const values = (wrapper) => wrapper.findAll('.cn-stats-block__count-value').map((v) => v.text())

beforeEach(() => {
	mockLocale = 'en-US'
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { value: 1250 } })
})

describe('CnStatsBlockWidget: money in the currency the entry names', () => {
	it('reads the currency from the page object with currencyField', async () => {
		const wrapper = mountWidget({
			entries: [{ title: 'Contract value', register: 'pipelinq', schema: 'salesContract', metric: 'sum', field: 'value', currencyField: 'currency', filter: { id: '@objectId' } }],
		}, { object: { currency: 'USD' }, reporting: 'EUR' })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'USD')])
	})

	it('falls back to the reporting currency when the object has none', async () => {
		const wrapper = mountWidget({
			entries: [{ register: 'pipelinq', schema: 'salesContract', metric: 'sum', field: 'value', currencyField: 'currency' }],
		}, { object: { currency: '' }, reporting: 'GBP' })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'GBP')])
	})

	it('honours "format": "currency" on an entry, in the reporting currency', async () => {
		const wrapper = mountWidget({
			entries: [{ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', format: 'currency' }],
		}, { reporting: 'CHF' })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'CHF')])
	})

	it('reads currency: "@config.currency" and a literal code', async () => {
		const wrapper = mountWidget({
			entries: [
				{ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', currency: '@config.currency' },
				{ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', format: { style: 'currency', currency: 'JPY' } },
			],
		}, { reporting: 'SEK' })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'SEK'), money(1250, 'JPY')])
	})

	it('shows EUR when nothing names a currency', async () => {
		const wrapper = mountWidget({
			entries: [{ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', format: 'currency' }],
		})
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'EUR')])
	})

	it('formats in the user\'s locale', async () => {
		mockLocale = 'nl-NL'
		const wrapper = mountWidget({
			entries: [{ register: 'pipelinq', schema: 'lead', metric: 'sum', field: 'value', currencyField: 'currency' }],
		}, { object: { currency: 'USD' } })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'USD', 'nl-NL')])
		expect(values(wrapper)[0]).not.toBe(money(1250, 'USD'))
	})

	it('keeps the plain count for an entry without a format', async () => {
		const wrapper = mountWidget({
			entries: [{ register: 'pipelinq', schema: 'lead', metric: 'count' }],
		}, { object: { currency: 'USD' }, reporting: 'EUR' })
		await flush()

		expect(values(wrapper)).toEqual([(1250).toLocaleString()])
	})

	it('formats the single-source value with the format prop', async () => {
		const wrapper = mountWidget({
			dataSource: { register: 'pipelinq', schema: 'salesContract', metric: 'sum', field: 'value' },
			format: { style: 'currency', currencyField: 'currency' },
		}, { object: { currency: 'USD' } })
		await flush()

		expect(values(wrapper)).toEqual([money(1250, 'USD')])
	})
})
