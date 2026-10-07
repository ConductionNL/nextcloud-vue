/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { formatMetricValue, normalizeMetricFormat, resolveConfigFormat, resolveFormatCurrency, safeCurrencyCode, unwrapAppConfig } from '../../src/utils/formatMetric.js'

describe('safeCurrencyCode', () => {
	it('accepts valid three-letter codes and upper-cases them', () => {
		expect(safeCurrencyCode('USD')).toBe('USD')
		expect(safeCurrencyCode('usd')).toBe('USD')
		expect(safeCurrencyCode('chf')).toBe('CHF')
	})

	it('falls back to EUR for unresolved tokens and invalid values', () => {
		expect(safeCurrencyCode('@config.currency')).toBe('EUR')
		expect(safeCurrencyCode('EURO')).toBe('EUR')
		expect(safeCurrencyCode('')).toBe('EUR')
		expect(safeCurrencyCode(null)).toBe('EUR')
		expect(safeCurrencyCode(undefined)).toBe('EUR')
		expect(safeCurrencyCode(42)).toBe('EUR')
	})
})

describe('unwrapAppConfig', () => {
	it('returns the plain object as-is', () => {
		expect(unwrapAppConfig({ currency: 'USD' })).toEqual({ currency: 'USD' })
	})
	it('unwraps a ref-shaped value', () => {
		expect(unwrapAppConfig({ value: { currency: 'GBP' } })).toEqual({ currency: 'GBP' })
	})
	it('defaults to an empty object', () => {
		expect(unwrapAppConfig(null)).toEqual({})
		expect(unwrapAppConfig(undefined)).toEqual({})
		expect(unwrapAppConfig('nope')).toEqual({})
	})
})

describe('resolveConfigFormat', () => {
	it('resolves @config.<key> tokens against the config map', () => {
		const out = resolveConfigFormat({ style: 'currency', currency: '@config.currency' }, { currency: 'USD' })
		expect(out.currency).toBe('USD')
	})

	it('drops an unresolved @config token so a downstream default can apply', () => {
		const out = resolveConfigFormat({ style: 'currency', currency: '@config.currency' }, {})
		expect(out.currency).toBeUndefined()
	})

	it('leaves literal (non-token) fields untouched', () => {
		const out = resolveConfigFormat({ style: 'currency', currency: 'EUR', prefix: '~' }, { currency: 'USD' })
		expect(out.currency).toBe('EUR')
		expect(out.prefix).toBe('~')
	})
})

describe('formatMetricValue', () => {
	it('returns an em dash for null/undefined', () => {
		expect(formatMetricValue(null, { style: 'currency' }, {})).toBe('—')
		expect(formatMetricValue(undefined, { style: 'currency' }, {})).toBe('—')
	})

	it('returns the raw string for non-numeric input', () => {
		expect(formatMetricValue('n/a', { style: 'currency' }, {})).toBe('n/a')
	})

	// The core regression: an unresolved @config.currency (e.g. the app-config
	// inject not yet available during an SPA route transition) must NEVER throw
	// a RangeError — it falls back to a valid currency instead.
	it('never throws on an unresolved @config.currency token', () => {
		expect(() => formatMetricValue(1000, { style: 'currency', currency: '@config.currency' }, {})).not.toThrow()
		const out = formatMetricValue(1000, { style: 'currency', currency: '@config.currency' }, {})
		expect(out).not.toContain('@config')
		expect(out).toMatch(/1[.,\s]?000/)
	})

	it('formats with the configured currency when the token resolves', () => {
		const usd = formatMetricValue(1000, { style: 'currency', currency: '@config.currency' }, { currency: 'USD' })
		expect(usd).toContain('$')
		expect(usd).not.toContain('@config')
	})

	it('formats a literal currency', () => {
		const eur = formatMetricValue(1000, { style: 'currency', currency: 'EUR' }, {})
		expect(eur).toContain('€')
	})

	it('formats percent and number styles with prefix/suffix', () => {
		expect(formatMetricValue(83.3, { style: 'percent', decimals: 1 }, {})).toMatch(/^83[.,]3%$/)
		expect(formatMetricValue(5, { style: 'number', prefix: '≈', suffix: ' pts' }, {})).toBe('≈5 pts')
	})

	// Wave 2 (#91): the fleet-KPI styles — duration-hours (pipelinq mean
	// resolution time, `42.5h`) and decimal (the toFixed(1) convention).
	it('formats duration-hours with one fraction digit by default and an h suffix', () => {
		expect(formatMetricValue(42.51, { style: 'duration-hours' }, {})).toMatch(/^42[.,]5h$/)
		expect(formatMetricValue(3, { style: 'duration-hours', decimals: 0 }, {})).toBe('3h')
	})

	it('formats decimal with one fraction digit by default', () => {
		expect(formatMetricValue(83.33, { style: 'decimal' }, {})).toMatch(/^83[.,]3$/)
		expect(formatMetricValue(83.336, { style: 'decimal', decimals: 2 }, {})).toMatch(/^83[.,]34$/)
	})
})

describe('resolveFormatCurrency', () => {
	it('takes the object\'s own currency first', () => {
		expect(resolveFormatCurrency({ currencyField: 'currency', currency: 'GBP' }, { currency: 'CHF' }, { currency: 'usd' })).toBe('USD')
	})

	it('reads a dot-path currencyField', () => {
		expect(resolveFormatCurrency({ currencyField: 'price.currency' }, {}, { price: { currency: 'JPY' } })).toBe('JPY')
	})

	it('falls back to the declared currency, then the reporting currency, then EUR', () => {
		expect(resolveFormatCurrency({ currencyField: 'currency', currency: 'GBP' }, { currency: 'CHF' }, { currency: '' })).toBe('GBP')
		expect(resolveFormatCurrency({ currencyField: 'currency' }, { currency: 'CHF' }, {})).toBe('CHF')
		expect(resolveFormatCurrency({ currency: '@config.currency' }, {}, null)).toBe('EUR')
	})

	it('resolves @object.<field> and @config.<key> tokens', () => {
		expect(resolveFormatCurrency({ currency: '@object.currency' }, {}, { currency: 'SEK' })).toBe('SEK')
		expect(resolveFormatCurrency({ currency: '@config.currency' }, { currency: 'NOK' }, null)).toBe('NOK')
	})
})

describe('normalizeMetricFormat', () => {
	it('answers null when the entry declares no format', () => {
		expect(normalizeMetricFormat({ title: 'Open' })).toBeNull()
	})

	it('reads a style name and an object', () => {
		expect(normalizeMetricFormat({ format: 'currency' })).toEqual({ style: 'currency' })
		expect(normalizeMetricFormat({ format: { style: 'percent', decimals: 1 } })).toEqual({ style: 'percent', decimals: 1 })
	})

	it('lets currency or currencyField on the entry imply a currency format', () => {
		expect(normalizeMetricFormat({ currencyField: 'currency' })).toEqual({ style: 'currency', currencyField: 'currency' })
		expect(normalizeMetricFormat({ currency: '@config.currency' })).toEqual({ style: 'currency', currency: '@config.currency' })
	})

	it('keeps a currency the format object names over the entry\'s', () => {
		expect(normalizeMetricFormat({ format: { style: 'currency', currency: 'USD' }, currency: 'GBP' })).toEqual({ style: 'currency', currency: 'USD' })
	})
})

describe('formatMetricValue with an object', () => {
	it('formats money in the object\'s currency', () => {
		const out = formatMetricValue(1000, { style: 'currency', currencyField: 'currency' }, { currency: 'EUR' }, { currency: 'USD' })
		expect(out).toContain('$')
	})

	it('falls back to the reporting currency when the format names none', () => {
		expect(formatMetricValue(1000, { style: 'currency' }, { currency: 'GBP' })).toContain('£')
	})
})
