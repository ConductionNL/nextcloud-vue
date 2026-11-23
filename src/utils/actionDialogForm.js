/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The rules of a CnActionDialog form that do not need the component: which
 * fields show, which request an act posts, which options an endpoint gave,
 * and what each field sends.
 *
 * @module utils/actionDialogForm
 */

import { readPath } from './readPath.js'

/** A body value that is one whole `fields` token, sent as the value it reads. */
const WHOLE_TOKEN = /^\{(fields\.[^{}\s|]+)\}$/

/**
 * Whether a value counts as given: not empty, not an empty list, not false.
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
export function isFilled(value) {
	if (Array.isArray(value)) {
		return value.length > 0
	}
	return value !== undefined && value !== null && value !== false && String(value).trim() !== ''
}

/**
 * Whether a `visibleWhen` rule holds for the value it reads. `in` lists the
 * values that show, `includes` names a value a list must hold, `equals` one
 * value, `filled` whether there must be a value; no operator means filled.
 *
 * @param {object} rule The rule.
 * @param {unknown} actual The value it reads.
 * @return {boolean}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-shows-only-when-another-value-says-so
 */
export function ruleHolds(rule, actual) {
	if (Array.isArray(rule.in)) {
		return rule.in.map(String).includes(String(actual))
	}
	if ('includes' in rule) {
		return Array.isArray(actual) && actual.map(String).includes(String(rule.includes))
	}
	if ('equals' in rule) {
		return String(actual) === String(rule.equals)
	}
	return isFilled(actual) === (rule.filled !== false)
}

/**
 * Whether a part shows: it has no `visibleWhen`, or its rule holds for
 * another field's value (`field`) or a value of the record (`path`).
 *
 * @param {object} part A field or the note.
 * @param {{values: object, record: (object|null)}} state The field values and the record.
 * @return {boolean}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-shows-only-when-another-value-says-so
 */
export function isShown(part, state) {
	const rule = (part && part.visibleWhen) || null
	if (rule === null || typeof rule !== 'object') {
		return true
	}
	return ruleHolds(rule, ruleValue(rule, state))
}

/**
 * The value a `visibleWhen` rule reads: another field's (`field`) or the
 * record's at `path`.
 *
 * @param {object} rule The rule.
 * @param {{values: object, record: (object|null)}} state The field values and the record.
 * @return {unknown}
 */
function ruleValue(rule, state) {
	return typeof rule.field === 'string' ? state.values[rule.field] : readPath(state.record || {}, rule.path || '')
}

/**
 * The case a choice picks: `{ field, cases }` read with the chosen value of
 * `field`, undefined when the value names no case.
 *
 * @param {object|undefined} by The block.
 * @param {object} values The field values.
 * @return {unknown}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint
 */
export function pickCase(by, values) {
	const cases = (by && by.cases) || null
	if (cases === null || typeof cases !== 'object') {
		return undefined
	}
	return cases[String(values[by.field] ?? '')]
}

/**
 * The request the confirm button posts: the case of `requestsBy` the chosen
 * act names, else `request`.
 *
 * @param {object} confirm The confirm config.
 * @param {object} values The field values.
 * @return {object|null}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint
 */
export function chosenRequest(confirm, values) {
	const picked = pickCase(confirm.requestsBy, values)
	if (picked && typeof picked === 'object') {
		return picked
	}
	return confirm.request && typeof confirm.request === 'object' ? confirm.request : null
}

/**
 * The entries of a list whose fields equal every field of `match`.
 *
 * @param {unknown} list The list.
 * @param {object} [match] The fields to match.
 * @return {Array<object>}
 */
export function matchingRows(list, match) {
	const wanted = Object.entries(match || {})
	const rows = Array.isArray(list) ? list : []
	return rows.filter((row) => row && typeof row === 'object' && wanted.every(([key, value]) => String(row[key]) === String(value)))
}

/**
 * The read of an options source: its params with the typed term under
 * `searchParam` (default `_search`) when the source searches.
 *
 * @param {object} source The field's `optionsSource`.
 * @param {string} term What the reader typed.
 * @return {object} An endpointSource block.
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-reads-its-options-from-an-endpoint
 */
export function optionsRead(source, term) {
	if (source.search !== true || term === '') {
		return source
	}
	return { ...source, params: { ...(source.params || {}), [source.searchParam || '_search']: term } }
}

/**
 * A body value as sent: one whole field token (`{fields.limits}`) as the
 * value it reads, so a list stays a list; any other text through `fill`.
 *
 * @param {unknown} value The configured value.
 * @param {{context: object, fill: (text: string, context: object) => string}} filler What tokens read and how text fills.
 * @return {unknown}
 */
export function bodyValue(value, filler) {
	if (typeof value !== 'string') {
		return value
	}
	const whole = value.match(WHOLE_TOKEN)
	if (whole) {
		const read = readPath(filler.context, whole[1])
		return read === undefined ? '' : read
	}
	return filler.fill(value, filler.context)
}

/**
 * What a checks field sends: the ticked values, or with `sendUnticked` the
 * items left unticked.
 *
 * @param {object} field The field.
 * @param {{ticked: Array<string>, items: Array<{value: string}>}} state The ticked values and the items.
 * @return {Array<string>}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-ticked-can-mean-left-out
 */
export function checksSent(field, state) {
	if (field.sendUnticked !== true) {
		return state.ticked
	}
	return state.items.map((item) => item.value).filter((value) => !state.ticked.includes(value))
}

/**
 * The items ticked in more than one column of a checks field with
 * `columns`, each once.
 *
 * @param {Array<{field: string}>} columns The columns.
 * @param {object} values The field values.
 * @return {Array<string>}
 * @spec openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-checks-field-can-tick-in-columns-that-exclude-each-other
 */
export function tickedTwice(columns, values) {
	const seen = new Set()
	const twice = new Set()
	for (const column of columns) {
		for (const value of (Array.isArray(values[column.field]) ? values[column.field] : [])) {
			if (seen.has(value)) {
				twice.add(value)
			}
			seen.add(value)
		}
	}
	return [...twice]
}
