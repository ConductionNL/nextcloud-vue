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

import { capacityValue } from './boardColumns.js'
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
			states: Array.isArray(entry.states) ? entry.states : null,
		}))
}

/**
 * The columns a page declares for a column field (`states`), normalised to
 * the `{ key, label, hidden, closed, color? }` entries `stagesOf()` reads.
 * The active column field's own `states` win; on the board's `statusField`
 * `board.states` applies. A referenced or values column has no declared
 * states: its columns are rows or values.
 *
 * @param {object} board The board configuration (manifest `config.board`).
 * @param {object|null} active The active column field from `columnFieldsOf`, or null.
 * @param {string} field The field the columns come from.
 * @return {Array<{key: string, label: string, hidden: boolean, closed: boolean, color?: string}>|null} The states, or null when none are declared.
 * @spec openspec/changes/board-declared-states/specs/board-view/spec.md#requirement-a-board-can-declare-the-states-its-columns-come-from
 */
export function declaredStatesOf(board, active, field) {
	if (active && active.kind !== 'schema') {
		return null
	}
	let declared = active && Array.isArray(active.states) ? active.states : null
	if (declared === null && field !== '' && field === board?.statusField && Array.isArray(board?.states)) {
		declared = board.states
	}
	if (declared === null || declared.length === 0) {
		return null
	}
	return declared
		.map((entry) => (typeof entry === 'string' ? { key: entry } : entry))
		.filter((entry) => entry && typeof entry === 'object' && String(entry.key ?? '') !== '')
		.map((entry) => ({
			key: String(entry.key),
			label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : String(entry.key),
			hidden: entry.hidden === true,
			closed: entry.closed === true,
			...(typeof entry.color === 'string' && entry.color !== '' ? { color: entry.color } : {}),
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
 * @param {string} [options.capacityField] The numeric row field that holds a column's limit.
 *   A column merged from two or more rows shows none: each row has its own limit.
 * @param {string} [options.neutralColor] The colour a row holds when nobody chose one. A merged
 *   column then takes its first row colour that is not this one, and this one only when no row
 *   has another. Compared as written: "Grey" is not "grey", and a hex value is not a name.
 * @param {object} [options.colorMap] A stored colour to the CSS colour a column is drawn in,
 *   applied after the merge. A colour it does not map is kept as stored.
 * @param {string} [options.closedField] The row field that marks a stage closed (a won or
 *   lost deal): its column starts collapsed. A merged column is closed when all its rows are.
 * @return {{states: Array<{key: string, label: string, color: string, capacity?: (number|null), closed?: boolean}>, keyByValue: Map<string, string>, refsByKey: Map<string, Array<object>>}} The stages.
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references
 * @spec openspec/changes/pl4-board-list-stages/specs/pl4-board-list-stages/spec.md#requirement-a-closed-stage-starts-collapsed
 */
export function buildReferenceStages({
	refs = [],
	labelField = '',
	orderField = '',
	colorField = '',
	mergeBy = '',
	narrowBy = null,
	narrowValue = '',
	capacityField = '',
	neutralColor = '',
	colorMap = null,
	closedField = '',
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
			const state = { key, label, color: colorOfRef(ref, colorField) }
			if (capacityField) {
				state.capacity = capacityOfRef(ref, capacityField)
			}
			states.push(state)
		}
		refsByKey.get(key).push(ref)
	}
	for (const state of states) {
		const rows = refsByKey.get(state.key)
		if (capacityField && rows.length > 1) {
			state.capacity = null
		}
		if (neutralColor && rows.length > 1) {
			state.color = mergedColumnColor(rows.map((ref) => colorOfRef(ref, colorField)), neutralColor, state.color)
		}
		state.color = mappedColor(state.color, colorMap)
		if (closedField) {
			state.closed = rows.every((ref) => Boolean(readPath(ref, closedField)))
		}
	}
	return { states, keyByValue, refsByKey }
}

/**
 * The items of a list on each parent row (a pipeline's `stages`) as rows a
 * reference column can be built from: each keyed by its `keyField` value, the
 * value a card stores, and linked to its parent under `_parent`, so
 * `narrowBy: { field: "_parent", rowField }` narrows the columns to the parent
 * the page filters on. An item without a key is dropped.
 *
 * @param {Array<object>} rows The parent rows.
 * @param {object} options The call.
 * @param {string} options.itemsPath Where each parent holds its list.
 * @param {string} options.keyField The item field a card stores.
 * @return {Array<object>} The items as rows.
 * @spec openspec/changes/pl4-board-list-stages/specs/pl4-board-list-stages/spec.md#requirement-columns-can-be-a-list-on-a-parent-row
 */
export function flattenItemRefs(rows, { itemsPath, keyField } = {}) {
	const out = []
	for (const parent of Array.isArray(rows) ? rows : []) {
		const items = readPath(parent, itemsPath)
		if (!Array.isArray(items)) {
			continue
		}
		for (const item of items) {
			const key = item && typeof item === 'object' ? textOf(readPath(item, keyField)) : ''
			if (key !== '') {
				out.push({ ...item, id: key, _parent: refIdOf(parent) })
			}
		}
	}
	return out
}

/**
 * The colour one referenced row carries.
 *
 * @param {object} ref The referenced row.
 * @param {string} colorField The row field that holds the colour, '' for `color`.
 * @return {string} The colour, '' when it has none.
 */
function colorOfRef(ref, colorField) {
	const color = colorField ? readPath(ref, colorField) : ref.color
	return typeof color === 'string' ? color : ''
}

/**
 * The colour a column merged from several rows takes when a neutral colour
 * is declared: the first chosen colour, so a row stored with the default
 * never outranks one somebody picked, whatever order the rows come in.
 *
 * @param {Array<string>} colors The rows' colours, in column order.
 * @param {string} neutralColor The colour a row holds when nobody chose one.
 * @param {string} fallback The colour when no row has a chosen or neutral one.
 * @return {string} The column's colour.
 * @spec openspec/changes/board-neutral-column-colour/specs/board-view/spec.md#requirement-a-merged-column-prefers-a-chosen-colour
 */
export function mergedColumnColor(colors, neutralColor, fallback = '') {
	const chosen = colors.find((color) => color !== '' && color !== neutralColor)
	if (chosen !== undefined) {
		return chosen
	}
	return colors.includes(neutralColor) ? neutralColor : fallback
}

/**
 * The CSS colour a stored colour maps to, so a palette name such as
 * "orange" or "grey-light" can draw a theme token.
 *
 * @param {string} color The stored colour.
 * @param {object|null} colorMap A stored colour to a CSS colour.
 * @return {string} The mapped colour, else the stored one.
 * @spec openspec/changes/board-column-colour-map/specs/board-view/spec.md#requirement-a-column-colour-can-be-mapped-to-a-css-colour
 */
export function mappedColor(color, colorMap) {
	if (!colorMap || typeof colorMap !== 'object' || color === '' || !Object.hasOwn(colorMap, color)) {
		return color
	}
	const mapped = colorMap[color]
	return typeof mapped === 'string' && mapped !== '' ? mapped : color
}

/**
 * The limit one referenced row declares.
 *
 * @param {object} ref The referenced row.
 * @param {string} capacityField The row field that holds the limit.
 * @return {number|null} The limit, or null when it has none.
 * @spec openspec/changes/board-column-capacity/specs/board-view/spec.md#requirement-a-column-can-carry-a-capacity
 */
export function capacityOfRef(ref, capacityField) {
	return capacityField ? capacityValue(readPath(ref, capacityField)) : null
}

/**
 * Whether a drop fills a referenced row past its limit: the cards that
 * already carry that row, counted against the row's own limit. Counted per
 * row, not per column, so a column merged from several rows still refuses
 * the one that is full.
 *
 * @param {object} options The call.
 * @param {object} options.target The referenced row the drop would write.
 * @param {object} options.card The card being moved.
 * @param {Array<object>} options.rows The cards the board holds.
 * @param {string} options.field The row field the columns come from.
 * @param {string} options.capacityField The referenced row's limit field.
 * @param {string} [options.rowKey] The row key, so the moving card is not counted.
 * @return {{count: number, capacity: number}|null} The count and limit when full, else null.
 * @spec openspec/changes/board-column-capacity/specs/board-view/spec.md#requirement-a-drop-into-a-full-column-is-refused
 */
export function fullTargetOf({ target, card, rows = [], field, capacityField, rowKey = 'id' } = {}) {
	const capacity = capacityOfRef(target, capacityField)
	if (capacity === null) {
		return null
	}
	const id = refIdOf(target)
	const self = String(card?.[rowKey] ?? '')
	const count = (Array.isArray(rows) ? rows : []).filter((row) => String(row?.[rowKey] ?? '') !== self && refIdOf(readPath(row, field)) === id).length
	return count >= capacity ? { count, capacity } : null
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
