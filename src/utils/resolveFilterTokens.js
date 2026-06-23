/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Resolve dynamic `@`-tokens inside a widget filter at FETCH time, so manifest
 * filters can express "relative to now / the current user" without baking a
 * fixed value. The widgets call this just before sending the filter to
 * OpenRegister.
 *
 * Supported tokens:
 *  - `@me`                → the current Nextcloud user id (`window.OC.currentUser`)
 *  - `@now`               → the current instant, ISO-8601
 *  - `@today`             → today at 00:00, `YYYY-MM-DD` (date-prefix comparable)
 *  - `@today±Nd`          → N days from today (e.g. `@today-7d`, `@today+30d`)
 *  - `@monthStart`        → first day of the current month, `YYYY-MM-DD`
 *  - `@quarterStart`      → first day of the current quarter, `YYYY-MM-DD`
 *  - `@yearStart`         → first day of the current year, `YYYY-MM-DD`
 *  - `@currentFiscalYear` → the current calendar year as a number string, e.g. `2026`
 *  - `@objectId`          → the current detail-page object's id (needs `ctx`)
 *  - `@object.<field>`    → a field off the current detail-page object (needs `ctx`)
 *  - `@workspace.<key>`   → a value off the page-level workspace context (needs `ctx.workspace`)
 *  - `@config.<key>`      → a value off the page-level app config (needs `ctx.config`)
 *
 * `@objectId` / `@object.<field>` are OBJECT-CONTEXT tokens: they resolve only
 * when a `ctx` `{ objectId, object }` is supplied (a detail page provides it via
 * the `cnObjectContext` inject). `@workspace.<key>` is a WORKSPACE-CONTEXT token:
 * it resolves a key off `ctx.workspace` (the reactive `cnWorkspaceContext` a
 * dashboard/workspace page provides) so a list widget can react to page-level
 * state another widget writes (e.g. a selected client). Without the matching
 * context the tokens pass through unchanged — and an UNRESOLVED `@workspace.*`
 * token signals "no selection yet" to the caller (see {@link hasUnresolvedTokens}).
 *
 * `@config.<key>` is an APP-CONFIG token: it resolves a key off `ctx.config` (the
 * page-level app config a dashboard/detail page provides via `cnAppConfig` — e.g.
 * a reporting `currency` captured by the setup wizard). Like `@workspace.<key>`, a
 * trailing `?` marks it optional. An UNRESOLVED required `@config.<key>` passes
 * through unchanged; this lets `format: { currency: '@config.currency' }` fall
 * back to a literal default when the config is unset.
 *
 * @module utils/resolveFilterTokens
 */

/**
 * Format a Date as `YYYY-MM-DD` (local).
 *
 * @param {Date} d The date.
 * @return {string} The date-only string.
 */
function ymd(d) {
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${m}-${day}`
}

/**
 * Resolve a single filter value if it is a dynamic `@`-token, else pass through.
 *
 * @param {*} v The candidate value.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] Optional
 *   context for `@objectId` / `@object.<field>` (detail page),
 *   `@workspace.<key>` (page-level workspace state), and `@config.<key>`
 *   (page-level app config) tokens.
 * @return {*} The resolved value.
 */
export function resolveFilterValue(v, ctx) {
	if (typeof v !== 'string' || v.charAt(0) !== '@') return v
	const now = new Date()
	if (v === '@objectId') {
		return (ctx && ctx.objectId !== undefined && ctx.objectId !== null) ? String(ctx.objectId) : v
	}
	if (v.startsWith('@object.')) {
		const field = v.slice('@object.'.length)
		if (ctx && ctx.object && field && ctx.object[field] !== undefined) return ctx.object[field]
		return v
	}
	if (v.startsWith('@workspace.')) {
		// A trailing `?` marks the token OPTIONAL: when unset the caller drops the
		// filter key (show all) instead of waiting (see hasUnresolvedTokens /
		// CnObjectListWidget). The `?` is stripped from the key lookup.
		const raw = v.slice('@workspace.'.length)
		const key = raw.endsWith('?') ? raw.slice(0, -1) : raw
		if (ctx && ctx.workspace && key && ctx.workspace[key] !== undefined
			&& ctx.workspace[key] !== null && ctx.workspace[key] !== '') {
			return ctx.workspace[key]
		}
		return v
	}
	if (v.startsWith('@config.')) {
		// A trailing `?` marks the token OPTIONAL (same convention as
		// `@workspace.<key>?`): an unset value lets the caller drop the key. A
		// required `@config.<key>` that is unset passes through unchanged so a
		// downstream consumer can fall back to a literal default (e.g.
		// `format.currency` → `'EUR'`).
		const raw = v.slice('@config.'.length)
		const key = raw.endsWith('?') ? raw.slice(0, -1) : raw
		if (ctx && ctx.config && key && ctx.config[key] !== undefined
			&& ctx.config[key] !== null && ctx.config[key] !== '') {
			return ctx.config[key]
		}
		return v
	}
	if (v === '@me') {
		return (typeof window !== 'undefined' && window.OC && window.OC.currentUser) || ''
	}
	if (v === '@now') return now.toISOString()
	if (v === '@today') {
		const d = new Date(now)
		d.setHours(0, 0, 0, 0)
		return ymd(d)
	}
	if (v === '@monthStart') {
		return ymd(new Date(now.getFullYear(), now.getMonth(), 1))
	}
	if (v === '@quarterStart') {
		return ymd(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1))
	}
	if (v === '@yearStart') {
		return ymd(new Date(now.getFullYear(), 0, 1))
	}
	if (v === '@currentFiscalYear') {
		return String(now.getFullYear())
	}
	const m = v.match(/^@today([+-]\d+)d$/)
	if (m) {
		const d = new Date(now)
		d.setHours(0, 0, 0, 0)
		d.setDate(d.getDate() + Number(m[1]))
		return ymd(d)
	}
	return v
}

/**
 * Whether a value is an UNRESOLVED OPTIONAL token — a string still shaped like
 * `@workspace.<key>?` or `@config.<key>?` after token resolution (the `?` marks
 * it as "drop me when unset"). Callers strip such keys from the filter so the
 * list shows all rows rather than waiting for a selection / a config value.
 *
 * @param {*} v A (possibly resolved) filter value.
 * @return {boolean}
 */
export function isOptionalUnresolved(v) {
	return typeof v === 'string'
		&& (v.startsWith('@workspace.') || v.startsWith('@config.'))
		&& v.endsWith('?')
}

/**
 * Return a copy of a resolved filter map with every UNRESOLVED OPTIONAL
 * workspace token (`@workspace.<key>?` left as-is) removed. Required tokens and
 * concrete values are kept untouched.
 *
 * @param {object} filter A filter map already passed through {@link resolveFilterTokens}.
 * @return {object} The filter without optional-unresolved keys.
 */
export function dropOptionalUnresolved(filter) {
	if (!filter || typeof filter !== 'object') return filter
	const out = {}
	for (const [k, v] of Object.entries(filter)) {
		if (isOptionalUnresolved(v)) continue
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			const inner = {}
			for (const [op, ov] of Object.entries(v)) {
				if (!isOptionalUnresolved(ov)) inner[op] = ov
			}
			if (Object.keys(inner).length > 0) out[k] = inner
		} else {
			out[k] = v
		}
	}
	return out
}

/**
 * Whether a resolved filter map still carries an unresolved `@`-token. Used by
 * context-bound widgets to detect "the page state this widget depends on isn't
 * set yet" (e.g. a client-overview list whose `client` filter is still the raw
 * `@workspace.selectedClient` because no client is selected) and skip the query
 * / render a prompt instead of fetching the whole register.
 *
 * OPTIONAL tokens (`@workspace.<key>?`) are NOT counted — they are meant to be
 * dropped, not waited on (see {@link dropOptionalUnresolved}).
 *
 * @param {object} filter A filter map already passed through {@link resolveFilterTokens}.
 * @return {boolean} True when any value is still a (non-optional) string beginning with `@`.
 */
export function hasUnresolvedTokens(filter) {
	if (!filter || typeof filter !== 'object') return false
	const blocking = (x) => typeof x === 'string' && x.charAt(0) === '@' && !isOptionalUnresolved(x)
	for (const v of Object.values(filter)) {
		if (blocking(v)) return true
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			for (const ov of Object.values(v)) {
				if (blocking(ov)) return true
			}
		}
	}
	return false
}

/**
 * Resolve every dynamic `@`-token in a filter map (equality + operator shapes).
 *
 * @param {object} filter The filter map (`{ field: value | { op: value } }`).
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] Optional
 *   context forwarded to {@link resolveFilterValue} for `@objectId` /
 *   `@object.<field>` / `@workspace.<key>` / `@config.<key>` tokens.
 * @return {object} A new filter map with tokens resolved.
 */
export function resolveFilterTokens(filter, ctx) {
	if (!filter || typeof filter !== 'object') return filter
	const out = {}
	for (const [k, v] of Object.entries(filter)) {
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			const inner = {}
			for (const [op, ov] of Object.entries(v)) inner[op] = resolveFilterValue(ov, ctx)
			out[k] = inner
		} else {
			out[k] = resolveFilterValue(v, ctx)
		}
	}
	return out
}
