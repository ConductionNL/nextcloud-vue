/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { getCanonicalLocale } from '@nextcloud/l10n'
import { resolveFilterValue } from './resolveFilterTokens.js'

/**
 * The format styles a stat or stats-block entry may name.
 *
 * @type {Array<string>}
 */
export const METRIC_FORMAT_STYLES = ['number', 'currency', 'percent', 'duration-hours', 'decimal']

/**
 * Unwrap a possibly-ref-wrapped `cnAppConfig` inject into a plain object.
 *
 * Dashboard / detail pages provide `cnAppConfig` either as a plain object or as
 * a Vue ref (`{ value: {...} }`, depending on how the page seeds it). Widgets
 * need the plain map to resolve `@config.<key>` tokens against it.
 *
 * @param {object} cnAppConfig The injected app-config value (object or ref).
 * @return {object} The plain config map (always an object; `{}` when absent).
 */
export function unwrapAppConfig(cnAppConfig) {
	const c = cnAppConfig
	const unwrapped = (c && typeof c === 'object' && 'value' in c) ? c.value : c
	return (unwrapped && typeof unwrapped === 'object') ? unwrapped : {}
}

/**
 * Resolve `@config.<key>` tokens in a `content.format` spec's string fields.
 *
 * Each of `currency` / `prefix` / `suffix` may be a `@config.<key>` token (e.g.
 * `currency: '@config.currency'`), or an `@object.<field>` token read off the
 * detail page's object when `object` is given. Tokens are resolved against
 * `configCtx`; a token that stays unresolved (the config key is unset, or the
 * config map has not been injected yet during a route transition) is DROPPED
 * so the downstream literal default applies instead of a raw `@config.…`
 * string leaking into `Intl.NumberFormat`.
 *
 * @param {object} format    The raw `content.format` spec.
 * @param {object} configCtx The page-level app-config map (from `unwrapAppConfig`).
 * @param {object|null} [object] The detail page's object, for `@object.<field>` tokens.
 * @return {object} A copy of `format` with its string tokens resolved/dropped.
 */
export function resolveConfigFormat(format, configCtx, object = null) {
	const fmt = format || {}
	const out = { ...fmt }
	const ctx = {
		config: (configCtx && typeof configCtx === 'object') ? configCtx : {},
		object: (object && typeof object === 'object') ? object : null,
	}
	for (const key of ['currency', 'prefix', 'suffix']) {
		const raw = fmt[key]
		if (typeof raw !== 'string' || raw.charAt(0) !== '@') {
			continue
		}
		const resolved = resolveFilterValue(raw, ctx)
		out[key] = (typeof resolved === 'string' && resolved.charAt(0) === '@') ? undefined : resolved
	}
	return out
}

/**
 * Coerce a currency value to a safe ISO-4217-shaped code.
 *
 * `Intl.NumberFormat({ style: 'currency', currency })` throws a `RangeError`
 * when `currency` is not a three-letter code — which is exactly what happens
 * when an unresolved `@config.currency` token (or any bad value) reaches it.
 * This guard is the single choke point that keeps a malformed currency from
 * ever throwing: anything that is not three ASCII letters falls back to `EUR`.
 *
 * @param {unknown} currency The (possibly unresolved / invalid) currency value.
 * @return {string} A safe upper-case three-letter code (falls back to `EUR`).
 */
export function safeCurrencyCode(currency) {
	return (typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency))
		? currency.toUpperCase()
		: 'EUR'
}

/**
 * Whether a value is a three-letter currency code.
 *
 * @param {unknown} value The candidate.
 * @return {boolean}
 */
function isCurrencyCode(value) {
	return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value)
}

/**
 * Read a dot-path off an object.
 *
 * @param {object} object The object.
 * @param {string} path The path, e.g. `currency` or `price.currency`.
 * @return {unknown} The value, or undefined.
 */
function readPath(object, path) {
	return String(path).split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), object)
}

/**
 * The currency a money value is shown in. In order:
 *
 * 1. `currencyField`: the field of the page's object that holds the currency
 *    (a detail page; e.g. a contract's own `currency`).
 * 2. `currency`: a literal code, or a token (`@config.currency`,
 *    `@object.currency`).
 * 3. The app's reporting currency, `currency` in the page's app config.
 * 4. `EUR`.
 *
 * A step whose value is not a three-letter code is skipped, so an object
 * without a currency falls back to the reporting currency instead of
 * throwing in `Intl.NumberFormat`.
 *
 * @param {object} format The format spec (`{ currency?, currencyField? }`).
 * @param {object} configCtx The page-level app-config map.
 * @param {object|null} [object] The detail page's object.
 * @return {string} An upper-case three-letter code.
 * @spec openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md#requirement-a-money-value-is-shown-in-the-currency-the-entry-names
 */
export function resolveFormatCurrency(format, configCtx, object = null) {
	const fmt = format || {}
	if (typeof fmt.currencyField === 'string' && fmt.currencyField !== '' && object && typeof object === 'object') {
		const own = readPath(object, fmt.currencyField)
		if (isCurrencyCode(own)) {
			return own.toUpperCase()
		}
	}
	const declared = resolveConfigFormat({ currency: fmt.currency }, configCtx, object).currency
	if (isCurrencyCode(declared)) {
		return declared.toUpperCase()
	}
	const reporting = configCtx && typeof configCtx === 'object' ? configCtx.currency : undefined
	return safeCurrencyCode(reporting)
}

/**
 * The format spec of a stat or stats-block entry in one shape.
 *
 * `format` may be a style name (`"currency"`) or an object (`{ style,
 * currency, currencyField, decimals, prefix, suffix }`). A sibling `currency`
 * or `currencyField` on the entry itself fills the same keys, and either one
 * makes the style `currency` when none is named. Answers null when the entry
 * declares no format at all, so the caller keeps its own rendering.
 *
 * @param {object} entry The declaration (`{ format?, currency?, currencyField? }`).
 * @return {object|null} The format spec, or null.
 * @spec openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md#requirement-a-stats-block-entry-formats-its-value
 */
export function normalizeMetricFormat(entry) {
	const source = entry && typeof entry === 'object' ? entry : {}
	let fmt = null
	if (typeof source.format === 'string' && source.format !== '') {
		fmt = { style: source.format }
	} else if (source.format && typeof source.format === 'object' && !Array.isArray(source.format)) {
		fmt = { ...source.format }
	}
	for (const key of ['currency', 'currencyField']) {
		if (typeof source[key] === 'string' && source[key] !== '') {
			fmt = fmt || {}
			if (fmt[key] === undefined) {
				fmt[key] = source[key]
			}
		}
	}
	if (fmt && !fmt.style && (fmt.currency || fmt.currencyField)) {
		fmt.style = 'currency'
	}
	return fmt
}

/**
 * The user's locale for number formatting: the Nextcloud locale setting,
 * else the browser's.
 *
 * @return {string|undefined} A BCP 47 tag, or undefined for the runtime default.
 */
export function metricLocale() {
	try {
		const tag = getCanonicalLocale()
		// A tag Intl does not accept would throw a RangeError on every value.
		return tag && Intl.NumberFormat.supportedLocalesOf([tag]).length > 0 ? tag : undefined
	} catch {
		return undefined
	}
}

/**
 * Format a numeric value per a manifest `content.format` spec.
 *
 * Handles the `number` / `currency` / `percent` / `duration-hours` /
 * `decimal` styles, resolves `@config.<key>` tokens in `currency` / `prefix`
 * / `suffix` against `configCtx`, and guards the currency code so an
 * unresolved or invalid currency can never throw a `RangeError`. Returns
 * `'—'` for null/undefined and the raw string for non-numeric input,
 * matching the KPI widgets' prior behaviour.
 *
 * Style notes:
 *  - `duration-hours` renders an hour count with an `h` suffix and ONE
 *    fraction digit by default (`42.5h` — the pipelinq resolution-time KPI
 *    contract); `decimals` overrides the fraction digits.
 *  - `decimal` is a plain number with ONE fraction digit by default (the
 *    fleet KPIs' `toFixed(1)` convention), where `number` defaults to 0.
 *
 * The currency follows `resolveFormatCurrency`: the object's own currency
 * (`currencyField`), then `currency`, then the app's reporting currency, then
 * EUR. Numbers are formatted in the user's locale (`metricLocale`).
 *
 * @param {unknown}      value     The raw value to format.
 * @param {object} format    The `content.format` spec (`{ style, currency, currencyField, decimals, prefix, suffix }`).
 * @param {object} configCtx The page-level app-config map for `@config.<key>` resolution.
 * @param {object|null} [object] The detail page's object, for `currencyField` and `@object.<field>`.
 * @return {string} The formatted display string.
 * @spec openspec/changes/stat-currency-from-object/specs/dashboard-page/spec.md#requirement-a-money-value-is-shown-in-the-currency-the-entry-names
 */
export function formatMetricValue(value, format, configCtx, object = null) {
	if (value === null || value === undefined) {
		return '—'
	}
	const num = Number(value)
	if (!Number.isFinite(num)) {
		return String(value)
	}

	const fmt = resolveConfigFormat(format, configCtx, object)
	const locale = metricLocale()
	// `duration-hours` and `decimal` default to ONE fraction digit; the
	// other styles keep the pre-existing default of 0.
	const oneDigitDefault = fmt.style === 'duration-hours' || fmt.style === 'decimal'
	const decimals = Number.isFinite(fmt.decimals) ? fmt.decimals : (oneDigitDefault ? 1 : 0)

	let body
	if (fmt.style === 'currency') {
		body = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: resolveFormatCurrency(format, configCtx, object),
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num)
	} else if (fmt.style === 'percent') {
		// Values are stored as the literal percent (83.3), not a 0–1 ratio.
		body = new Intl.NumberFormat(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num) + '%'
	} else if (fmt.style === 'duration-hours') {
		// An hour count (e.g. mean resolution time): `42.5h`.
		body = new Intl.NumberFormat(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num) + 'h'
	} else {
		body = new Intl.NumberFormat(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num)
	}
	return `${fmt.prefix || ''}${body}${fmt.suffix || ''}`
}
