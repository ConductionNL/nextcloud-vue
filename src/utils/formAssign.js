/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Live values for forms: a field filled in from another answer (`assign`), and
 * a default resolved from the signed-in user or the record.
 *
 * `assign` is a list of `{ when, value }` rules. `when` is the same local
 * `visibleWhen` condition that drives visibility; `value` is a literal,
 * `@answer.<field>` (another answer) or a sentinel token. The first rule whose
 * condition holds sets the field.
 *
 * @module utils/formAssign
 * @spec openspec/changes/form-live-values/tasks.md#task-1
 */

import { resolveFilterValue } from './resolveFilterTokens.js'
import { evaluateVisibleWhenLocal } from './visibleWhen.js'

/**
 * The answer keys a condition reads (`field`, and the same inside `all` / `any`).
 *
 * @param {object|null} cond A visibleWhen condition.
 * @return {string[]} First path segment of each field read.
 */
function conditionReads(cond) {
	if (!cond || typeof cond !== 'object') {
		return []
	}
	const parts = [...(Array.isArray(cond.all) ? cond.all : []), ...(Array.isArray(cond.any) ? cond.any : [])]
	const own = typeof cond.field === 'string' ? [cond.field.split('.')[0]] : []
	return own.concat(...parts.map(conditionReads))
}

/**
 * The answer keys an `assign` rule list reads.
 *
 * @param {Array<{when?: object, value?: unknown}>} rules The field's rules.
 * @return {Set<string>} The keys.
 */
export function assignReads(rules) {
	const keys = new Set()
	for (const rule of Array.isArray(rules) ? rules : []) {
		conditionReads(rule && rule.when).forEach((k) => keys.add(k))
		if (rule && typeof rule.value === 'string' && rule.value.startsWith('@answer.')) {
			keys.add(rule.value.slice('@answer.'.length).split('.')[0])
		}
	}
	return keys
}

/**
 * Resolve a rule value: `@answer.<field>` from the answers, any other token
 * through the shared resolver, a literal as it is.
 *
 * @param {unknown} value The rule's value.
 * @param {object} answers The answers so far.
 * @param {object} [ctx] Token context (`me`, `object`, ...).
 * @return {unknown} The value to set.
 */
export function resolveAssignValue(value, answers, ctx = {}) {
	if (typeof value === 'string' && value.startsWith('@answer.')) {
		return value.slice('@answer.'.length).split('.').reduce((o, k) => (o === null || o === undefined ? o : o[k]), answers)
	}
	return resolveFilterValue(value, ctx)
}

/**
 * The value the first matching rule gives, or `undefined` for no match.
 *
 * @param {Array<{when?: object, value?: unknown}>} rules The field's rules.
 * @param {object} answers The answers so far.
 * @param {object} [ctx] Token context.
 * @return {{matched: boolean, value?: unknown}} Whether a rule matched, and its value.
 */
export function pickAssignment(rules, answers, ctx) {
	for (const rule of Array.isArray(rules) ? rules : []) {
		if (rule && evaluateVisibleWhenLocal(rule.when === undefined ? null : rule.when, answers)) {
			return { matched: true, value: resolveAssignValue(rule.value, answers, ctx) }
		}
	}
	return { matched: false }
}

/**
 * Work out what the `assign` rules set after some answers changed. Fields run
 * in declaration order in ONE pass, so a field filled in by a rule can feed a
 * later field's rule, and a rule never reads its own output (no loop). A field
 * the user edited by hand is left alone.
 *
 * @param {object} args Arguments.
 * @param {Array<object>} args.fields The form's fields.
 * @param {object} args.answers The answers as they are now (not modified).
 * @param {string[]|null} args.changed Keys that just changed; `null` = a first pass over empty fields.
 * @param {Iterable<string>} [args.edited] Keys the user edited by hand.
 * @param {object} [args.ctx] Token context.
 * @return {{values: Object<string, unknown>, from: Object<string, string>}} New values by key, and the key each came from.
 */
export function computeAssignments({ fields, answers, changed, edited = [], ctx }) {
	const handEdited = new Set(edited)
	const touched = new Set(changed || [])
	const next = { ...answers }
	const values = {}
	const from = {}
	for (const field of Array.isArray(fields) ? fields : []) {
		if (!field || typeof field.key !== 'string' || !Array.isArray(field.assign) || field.assign.length === 0 || handEdited.has(field.key)) {
			continue
		}
		const reads = [...assignReads(field.assign)].filter((k) => k !== field.key)
		const source = reads.find((k) => touched.has(k))
		if (changed === null) {
			const current = next[field.key]
			if (current !== undefined && current !== null && current !== '') {
				continue
			}
		} else if (source === undefined) {
			continue
		}
		const picked = pickAssignment(field.assign, next, ctx)
		if (!picked.matched || picked.value === undefined || picked.value === next[field.key]) {
			continue
		}
		next[field.key] = picked.value
		values[field.key] = picked.value
		from[field.key] = source !== undefined ? source : (reads[0] || '')
		touched.add(field.key)
	}
	return { values, from }
}

/**
 * The defaults of a form, resolved once when it opens: tokens (`@me`,
 * `@me.displayName`, `@me.email`, `@today`, `@now`, `@object.<field>`) go
 * through the shared resolver, a literal is taken as it is. A key the form
 * already has a value for (from `initialValue`) is never replaced.
 *
 * @param {Array<object>} fields The form's fields.
 * @param {object} initial The initial values.
 * @param {object} [ctx] Token context (`me`, `object`, ...).
 * @return {Object<string, unknown>} Defaults by key, for keys without an initial value.
 */
export function resolveFieldDefaults(fields, initial, ctx = {}) {
	const out = {}
	const have = initial || {}
	for (const field of Array.isArray(fields) ? fields : []) {
		if (!field || typeof field.key !== 'string' || field.default === undefined || field.default === null) {
			continue
		}
		if (have[field.key] !== undefined && have[field.key] !== null && have[field.key] !== '') {
			continue
		}
		const value = resolveFilterValue(field.default, { object: have, ...ctx })
		// An unresolved token (user unknown yet) is not a value.
		if (typeof value === 'string' && value.startsWith('@') && value === field.default) {
			continue
		}
		out[field.key] = value
	}
	return out
}
