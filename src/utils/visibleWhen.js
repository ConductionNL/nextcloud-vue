/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * visibleWhen — the shared declarative visibility predicate (Wave 1 banner
 * shape, generalised in Wave 3 of nextcloud-vue#91 for manifest actions).
 *
 * A `visibleWhen` condition is `{ endpoint?, source?, field?, op?, value }`
 * with THREE evaluation modes (first match wins):
 *
 *  1. `endpoint` — GET a same-origin JSON endpoint; `field` is a dot-path
 *     into the response body.
 *  2. `source` — `{ register, schema, filter? }`, an OpenRegister object
 *     query (`filter` supports the shared @-token grammar). `field` is a
 *     dot-path into the FIRST result; omit it — or use `@total` — to
 *     compare the collection total.
 *  3. Neither — the LOCAL mode (Wave 3): `field` is a dot-path into the
 *     caller's object context (`ctx.object`, e.g. the loaded detail-page
 *     record) — no request is made. This is how detail header actions gate
 *     on the current record's state (`{ field: "lifecycleState", op: "eq",
 *     value: "approved" }`).
 *
 * `op` is `eq | neq | gt | gte | lt | lte` (default `eq`); `value` is the
 * literal right-hand side. Evaluation is FAIL-SAFE: any fetch / shape error
 * resolves `false` (hidden) — a broken predicate never breaks a page.
 *
 * manifest-form-logic adds `evaluateVisibleWhenLocal(cond, data)`, a SYNC
 * counterpart to `evaluateVisibleWhen()` for the LOCAL mode only, composed
 * from `readVisibleWhenPath` + `compareVisibleWhen` with no fetch / promise.
 * `CnFormPage` calls it on every form-data change so conditions gating one
 * field on another's live value resolve without flicker. `endpoint` /
 * `source` conditions on form fields still go through the async
 * `evaluateVisibleWhen()`, evaluated once at mount and cached.
 *
 * @module utils/visibleWhen
 */

import { buildHeaders, buildQueryString, prefixUrl } from './headers.js'
import { resolveFilterTokens } from './resolveFilterTokens.js'

/** Supported visibleWhen comparison operators. */
export const VISIBLE_WHEN_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte']

/**
 * Read a dot-path off an object (`'a.b.c'`); the object itself when no
 * field is given.
 *
 * @param {object} data The source object.
 * @param {string} [field] Dot-path into the object.
 * @return {*} The value at the path (undefined on a missing segment).
 */
export function readVisibleWhenPath(data, field) {
	if (!field) return data
	return String(field).split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), data)
}

/**
 * Apply a visibleWhen comparison operator. Ordering operators coerce both
 * sides to Number; equality compares loosely-normalized primitives
 * (`String(a) === String(b)` when types differ) so `"3" eq 3` holds for
 * JSON round-trips.
 *
 * @param {*} actual The resolved left-hand value.
 * @param {string} op The operator (`eq` when unknown).
 * @param {*} expected The declared right-hand value.
 * @return {boolean} Whether the comparison holds.
 */
export function compareVisibleWhen(actual, op, expected) {
	const operator = VISIBLE_WHEN_OPS.includes(op) ? op : 'eq'
	if (operator === 'eq' || operator === 'neq') {
		const equal = actual === expected || String(actual) === String(expected)
		return operator === 'eq' ? equal : !equal
	}
	const a = Number(actual)
	const b = Number(expected)
	if (!Number.isFinite(a) || !Number.isFinite(b)) return false
	if (operator === 'gt') return a > b
	if (operator === 'gte') return a >= b
	if (operator === 'lt') return a < b
	return a <= b
}

/**
 * Resolve the condition's left-hand value from its endpoint / OpenRegister
 * source / local object context (see the module docblock for the three
 * modes). Throws on unusable conditions and failed fetches — callers that
 * want the fail-safe boolean use {@link evaluateVisibleWhen}.
 *
 * @param {{endpoint?: string, source?: {register: string, schema: string, filter?: object}, field?: string}} cond The visibleWhen condition.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] The caller's token / object context.
 * @return {Promise<*>} The value `field` points at.
 */
export async function readVisibleWhenValue(cond, ctx) {
	if (cond.endpoint) {
		const response = await fetch(prefixUrl(cond.endpoint), { headers: buildHeaders() })
		if (!response.ok) throw new Error(`endpoint returned ${response.status}`)
		const data = await response.json()
		return readVisibleWhenPath(data, cond.field)
	}
	const src = cond.source
	if (src && src.register && src.schema) {
		const filter = resolveFilterTokens(src.filter || {}, ctx)
		const qs = buildQueryString({ ...filter, _limit: 1 })
		const url = prefixUrl(`/apps/openregister/api/objects/${src.register}/${src.schema}${qs}`)
		const response = await fetch(url, { headers: buildHeaders() })
		if (!response.ok) throw new Error(`source returned ${response.status}`)
		const data = await response.json()
		if (!cond.field || cond.field === '@total') {
			return data.total ?? (Array.isArray(data.results) ? data.results.length : 0)
		}
		const first = Array.isArray(data.results) ? data.results[0] : data
		return readVisibleWhenPath(first, cond.field)
	}
	// Local mode (Wave 3): evaluate against the caller's object context.
	if (cond.field && ctx && ctx.object && typeof ctx.object === 'object') {
		return readVisibleWhenPath(ctx.object, cond.field)
	}
	throw new Error('visibleWhen needs an endpoint, a source, or a field on the object context')
}

/**
 * Evaluate a visibleWhen condition to a boolean, FAIL-SAFE: any error
 * (fetch failure, unusable condition, missing context) resolves `false`.
 * A `null` / `undefined` condition resolves `true` (no condition = always
 * visible) so callers can pass the raw config value straight through.
 *
 * @param {{endpoint?: string, source?: object, field?: string, op?: string, value?: *}|null} cond The condition (or null).
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] The caller's token / object context.
 * @return {Promise<boolean>} Whether the guarded element should show.
 */
export async function evaluateVisibleWhen(cond, ctx) {
	if (!cond) return true
	try {
		const actual = await readVisibleWhenValue(cond, ctx)
		return compareVisibleWhen(actual, cond.op || 'eq', cond.value)
	} catch (e) {
		return false
	}
}

/**
 * Evaluate a LOCAL-mode visibleWhen condition synchronously against a
 * plain data object (`CnFormPage`'s live `formData`). No fetch, no
 * promise — pure composition of {@link readVisibleWhenPath} and
 * {@link compareVisibleWhen}, so it is safe to call on every keystroke.
 *
 * A nullish condition resolves `true` (no condition = always visible),
 * mirroring {@link evaluateVisibleWhen}'s fail-safe posture. A malformed
 * condition — not a plain object, missing `field`, or declaring
 * `endpoint` / `source` (those are NOT local-mode conditions) — resolves
 * `false` (hidden).
 *
 * @param {{field?: string, op?: string, value?: *}|null} cond The LOCAL visibleWhen condition (or null).
 * @param {object} data The live data object `field` dot-paths into (e.g. formData).
 * @return {boolean} Whether the guarded element should show.
 */
export function evaluateVisibleWhenLocal(cond, data) {
	if (cond === null || cond === undefined) return true
	if (typeof cond !== 'object' || Array.isArray(cond)) return false
	if (cond.endpoint || cond.source) return false
	if (typeof cond.field !== 'string' || cond.field.length === 0) return false
	try {
		const actual = readVisibleWhenPath(data, cond.field)
		return compareVisibleWhen(actual, cond.op || 'eq', cond.value)
	} catch (e) {
		return false
	}
}
