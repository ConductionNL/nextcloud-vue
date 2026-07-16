/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { resolveFilterValue } from './resolveFilterTokens.js'

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
 * `currency: '@config.currency'`). Tokens are resolved against `configCtx`; a
 * token that stays unresolved (the config key is unset, or the config map has
 * not been injected yet during a route transition) is DROPPED so the downstream
 * literal default applies instead of a raw `@config.…` string leaking into
 * `Intl.NumberFormat`.
 *
 * @param {object} format    The raw `content.format` spec.
 * @param {object} configCtx The page-level app-config map (from `unwrapAppConfig`).
 * @return {object} A copy of `format` with its string tokens resolved/dropped.
 */
export function resolveConfigFormat(format, configCtx) {
	const fmt = format || {}
	const out = { ...fmt }
	const ctx = { config: (configCtx && typeof configCtx === 'object') ? configCtx : {} }
	for (const key of ['currency', 'prefix', 'suffix']) {
		const raw = fmt[key]
		if (typeof raw !== 'string' || raw.charAt(0) !== '@') continue
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
 * @param {*} currency The (possibly unresolved / invalid) currency value.
 * @return {string} A safe upper-case three-letter code (falls back to `EUR`).
 */
export function safeCurrencyCode(currency) {
	return (typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency))
		? currency.toUpperCase()
		: 'EUR'
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
 * @param {*}      value     The raw value to format.
 * @param {object} format    The `content.format` spec (`{ style, currency, decimals, prefix, suffix }`).
 * @param {object} configCtx The page-level app-config map for `@config.<key>` resolution.
 * @return {string} The formatted display string.
 */
export function formatMetricValue(value, format, configCtx) {
	if (value === null || value === undefined) return '—'
	const num = Number(value)
	if (!Number.isFinite(num)) return String(value)

	const fmt = resolveConfigFormat(format, configCtx)
	// `duration-hours` and `decimal` default to ONE fraction digit; the
	// other styles keep the pre-existing default of 0.
	const oneDigitDefault = fmt.style === 'duration-hours' || fmt.style === 'decimal'
	const decimals = Number.isFinite(fmt.decimals) ? fmt.decimals : (oneDigitDefault ? 1 : 0)

	let body
	if (fmt.style === 'currency') {
		body = new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: safeCurrencyCode(fmt.currency),
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num)
	} else if (fmt.style === 'percent') {
		// Values are stored as the literal percent (83.3), not a 0–1 ratio.
		body = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num) + '%'
	} else if (fmt.style === 'duration-hours') {
		// An hour count (e.g. mean resolution time): `42.5h`.
		body = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num) + 'h'
	} else {
		body = new Intl.NumberFormat(undefined, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(num)
	}
	return `${fmt.prefix || ''}${body}${fmt.suffix || ''}`
}
