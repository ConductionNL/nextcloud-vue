/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board columns from a REFERENCED field (screens-board-reference-columns).
 *
 * A status that is an enum or a lifecycle list carries its stages on the
 * field, and `boardColumns.js` reads them there. A status that is a reference
 * to another object (a case's `status` pointing at a statusType row) carries
 * nothing on the field: the stages are the rows of the referenced schema. This
 * module turns those rows into the same `states` list `stagesOf()` reads, plus
 * the map from a row's raw value (the referenced id) to its column.
 *
 * 🔴 THE COLUMNS ARE STILL THE SCHEMA'S, NOT THE DATA'S. They are the
 * referenced rows, fetched, not the values present on the loaded cards, so an
 * empty stage is still a column to drop a card into. The one exception is a
 * field with no referenced schema at all (a Nextcloud user id): there the
 * values present are all there is, and a "nobody" column is always added so
 * work without an owner stays visible and can be dropped back to nobody.
 *
 * 🔴 MERGED COLUMNS RESOLVE PER CARD. Referenced rows are often per parent
 * (every case type has its own "In behandeling"). Merged by name they make one
 * column, and a drop must then write the row of THAT card's parent. A column
 * with no row for the card's parent is not a place the card can go, and the
 * drop is refused rather than written to some other parent's row.
 *
 * Pure apart from `fetchReferenceObjects`: no store, no Vue.
 */

import { buildHeaders, buildQueryString, prefixUrl } from './headers.js'
import { readPath } from './readPath.js'
import { schemaRefSlug } from './schemaRefSlug.js'

/** The column of cards with no value, for a `values` column field. */
export const NO_VALUE_KEY = '__none__'

/**
 * The id a reference value carries: a string as is, an object by its `id`,
 * `uuid` or `@self.id`.
 *
 * @param {unknown} value A reference as a row holds it.
 * @return {string} The id, '' when there is none.
 */
export function refIdOf(value) {
	if (value === null || value === undefined) {
		return ''
	}
	if (typeof value === 'object') {
		const id = value.id ?? value.uuid ?? value['@self']?.id ?? value.value ?? ''
		return id === null || id === undefined ? '' : String(id)
	}
	return String(value)
}

/**
 * A value as text: a string or number as is, an object by its name.
 *
 * @param {unknown} value The raw value.
 * @return {string} The text.
 */
function textOf(value) {
	if (value === null || value === undefined) {
		return ''
	}
	if (typeof value === 'object') {
		return String(value.displayName ?? value.name ?? value.title ?? value.label ?? '').trim()
	}
	return String(value).trim()
}

/**
 * The column fields a board offers, normalised. Without `columnFields` the
 * board has one, its `statusField`, read from the schema as before.
 *
 * @param {object} board The board configuration (manifest `config.board`).
 * @return {Array<{field: string, label: string, source: (object|null), kind: string, readOnly: boolean, moveHandler: string, moveTargetsHandler: string}>} The fields.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-board-can-switch-the-field-its-columns-come-from
 */
export function columnFieldsOf(board) {
	const declared = Array.isArray(board?.columnFields) ? board.columnFields : []
	return declared
		.map((entry) => (typeof entry === 'string' ? { field: entry } : entry))
		.filter((entry) => entry && typeof entry.field === 'string' && entry.field !== '')
		.map((entry) => ({
			field: entry.field,
			label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : entry.field,
			source: entry.source && typeof entry.source === 'object' ? entry.source : null,
			kind: entry.kind === 'values' ? 'values' : (entry.source ? 'reference' : 'schema'),
			readOnly: entry.readOnly === true,
			moveHandler: typeof entry.moveHandler === 'string' ? entry.moveHandler : '',
			moveTargetsHandler: typeof entry.moveTargetsHandler === 'string' ? entry.moveTargetsHandler : '',
			valueLabels: entry.valueLabels && typeof entry.valueLabels === 'object' ? entry.valueLabels : null,
			emptyLabel: typeof entry.emptyLabel === 'string' ? entry.emptyLabel : '',
		}))
}

/**
 * The register and schema a reference column reads its rows from: the
 * source's own, else the page's register and the property's `$ref`.
 *
 * @param {object} source The column field's `source`.
 * @param {object} options The context.
 * @param {string} options.register The page's register.
 * @param {object} [options.property] The field's schema property.
 * @return {{register: string, schema: string}} Both, '' when unknown.
 */
export function referenceTargetOf(source, { register = '', property = null } = {}) {
	const schema = source?.schema || schemaRefSlug(property?.$ref ?? property?.items?.$ref ?? '')
	return {
		register: String(source?.register || register || ''),
		schema: schema === '' || schema === null || schema === undefined ? '' : String(schema),
	}
}

/**
 * The stages of a referenced field: the referenced rows, narrowed to one
 * parent when asked, ordered, and merged by a field when asked.
 *
 * @param {object} options The call.
 * @param {Array<object>} options.refs The referenced rows.
 * @param {string} [options.labelField] The row field that names a column.
 * @param {string} [options.orderField] The numeric row field the columns are ordered by.
 * @param {string} [options.colorField] The row field that holds the dot colour.
 * @param {string} [options.mergeBy] The row field whose equal values make one column.
 * @param {{field: string, rowField: string}|null} [options.narrowBy] The parent link.
 * @param {string} [options.narrowValue] The parent the board is narrowed to, '' for all.
 * @return {{states: Array<{key: string, label: string, color: string}>, keyByValue: Map<string, string>, refsByKey: Map<string, Array<object>>}} The stages.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references
 */
export function buildReferenceStages({
	refs = [],
	labelField = '',
	orderField = '',
	colorField = '',
	mergeBy = '',
	narrowBy = null,
	narrowValue = '',
} = {}) {
	const list = (Array.isArray(refs) ? refs : []).filter((ref) => ref && typeof ref === 'object' && refIdOf(ref) !== '')
	const narrowed = narrowBy && narrowBy.field && narrowValue !== ''
		? list.filter((ref) => refIdOf(readPath(ref, narrowBy.field)) === String(narrowValue))
		: list

	const orderOf = (ref) => {
		const n = Number(orderField ? readPath(ref, orderField) : NaN)
		return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
	}
	const ordered = narrowed
		.map((ref, index) => ({ ref, index }))
		.sort((a, b) => (orderOf(a.ref) - orderOf(b.ref)) || (a.index - b.index))
		.map((entry) => entry.ref)

	const states = []
	const keyByValue = new Map()
	const refsByKey = new Map()
	for (const ref of ordered) {
		const id = refIdOf(ref)
		const label = textOf(labelField ? readPath(ref, labelField) : (ref.name ?? ref.title)) || id
		const key = mergeBy ? (textOf(readPath(ref, mergeBy)) || id) : id
		keyByValue.set(id, key)
		if (!refsByKey.has(key)) {
			refsByKey.set(key, [])
			const color = colorField ? readPath(ref, colorField) : ref.color
			states.push({ key, label, color: typeof color === 'string' ? color : '' })
		}
		refsByKey.get(key).push(ref)
	}
	return { states, keyByValue, refsByKey }
}

/**
 * The stages of a field with no referenced schema (a user id): the values
 * present on the rows, by label, then one column for no value.
 *
 * @param {object} options The call.
 * @param {Array<object>} options.rows The rows the list holds.
 * @param {string} options.field The row field.
 * @param {object} [options.valueLabels] Raw value to the label to show.
 * @param {string} [options.emptyLabel] The no-value column's label.
 * @return {{states: Array<{key: string, label: string, color: string}>, keyByValue: Map<string, string>, refsByKey: Map<string, Array<object>>}} The stages.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-field-without-a-referenced-schema-takes-its-values
 */
export function buildValueStages({ rows = [], field = '', valueLabels = null, emptyLabel = 'Nobody' } = {}) {
	const labels = valueLabels && typeof valueLabels === 'object' ? valueLabels : {}
	const seen = new Map()
	for (const row of Array.isArray(rows) ? rows : []) {
		const raw = readPath(row, field)
		const id = refIdOf(raw)
		if (id !== '' && !seen.has(id)) {
			seen.set(id, typeof labels[id] === 'string' ? labels[id] : (textOf(raw) || id))
		}
	}
	const states = [...seen.entries()]
		.sort((a, b) => a[1].localeCompare(b[1]))
		.map(([key, label]) => ({ key, label, color: '' }))
	states.push({ key: NO_VALUE_KEY, label: emptyLabel, color: '' })
	const keyByValue = new Map(states.map((state) => [state.key, state.key]))
	keyByValue.set('', NO_VALUE_KEY)
	return { states, keyByValue, refsByKey: new Map() }
}

/**
 * The column a row sits in, under a value-to-column map.
 *
 * @param {object} row The row.
 * @param {string} field The row field.
 * @param {Map<string, string>} keyByValue The value-to-column map.
 * @return {string} The column key, or the raw value when the map has none
 *   (which lands the card in the off-board column).
 */
export function columnKeyOfRow(row, field, keyByValue) {
	const id = refIdOf(readPath(row, field))
	return keyByValue.has(id) ? keyByValue.get(id) : id
}

/**
 * What a drop on a column writes for one card: the referenced row of that
 * column which belongs to the card's parent, or null when the column has none
 * (the card cannot go there).
 *
 * @param {object} options The call.
 * @param {object} options.card The card.
 * @param {string} options.toKey The column it was dropped on.
 * @param {string} options.kind `reference` or `values`.
 * @param {Map<string, Array<object>>} [options.refsByKey] The column's rows.
 * @param {{field: string, rowField: string}|null} [options.narrowBy] The parent link.
 * @return {{value: (string|null), target: (object|null)}|null} The value to write and its row, or null.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-drop-writes-the-reference
 */
export function resolveDropValue({ card, toKey, kind, refsByKey = new Map(), narrowBy = null } = {}) {
	if (kind === 'values') {
		return { value: toKey === NO_VALUE_KEY ? null : String(toKey), target: null }
	}
	const candidates = refsByKey.get(String(toKey)) || []
	if (candidates.length === 0) {
		return null
	}
	if (narrowBy && narrowBy.field && narrowBy.rowField) {
		const parent = refIdOf(readPath(card, narrowBy.rowField))
		const match = candidates.find((ref) => refIdOf(readPath(ref, narrowBy.field)) === parent)
		return match ? { value: refIdOf(match), target: match } : null
	}
	return { value: refIdOf(candidates[0]), target: candidates[0] }
}

/**
 * Fetch the rows a reference column is built from, one list request.
 *
 * @param {object} options The call.
 * @param {string} options.register The register slug.
 * @param {string} options.schema The schema slug.
 * @param {object} [options.filter] Equality filters, e.g. `{ isFinal: false }`.
 * @param {number} [options.limit] The page size, 500 by default.
 * @return {Promise<Array<object>>} The rows.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references
 */
export async function fetchReferenceObjects({ register, schema, filter = {}, limit = 500 } = {}) {
	if (!register || !schema) {
		return []
	}
	const params = { _limit: limit }
	for (const [key, value] of Object.entries(filter || {})) {
		if (value !== undefined && value !== null && typeof value !== 'object') {
			params[key] = typeof value === 'boolean' ? String(value) : value
		}
	}
	const url = prefixUrl(`/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}${buildQueryString(params)}`)
	const response = await fetch(url, { headers: buildHeaders() })
	if (!response.ok) {
		throw new Error(`list returned ${response.status}`)
	}
	const data = await response.json()
	return Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
}
