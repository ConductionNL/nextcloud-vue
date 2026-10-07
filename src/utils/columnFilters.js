/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Per-column sorting and filtering for table headers.
 *
 * Pure helpers: which column can sort, which can filter and how, and the
 * translation between a header filter's state and the OpenRegister query
 * parameters the facet sidebar already sends. A header filter writes into the
 * SAME active-filter map (`{ paramKey: values[] }`) the sidebar uses, so the
 * fetch, the route query and saved views need nothing new.
 *
 * Parameter shapes, as OpenRegister reads them:
 * - equality and "any of": `key=value`, `key[]=a&key[]=b`
 * - ranges: `key[gte]=from`, `key[lte]=to`
 * - contains (text): `key[like]=term`, case-insensitive (openregister#4430);
 *   the server escapes `%`, `_` and `\`, so the raw term goes out as typed
 *
 * @module utils/columnFilters
 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md
 * @spec openspec/changes/header-filter-contains/specs/cn-data-table/spec.md#requirement-a-text-header-filter-matches-on-contains
 */

import { schemaRefSlug } from './schemaRefSlug.js'

/** OpenRegister's case-insensitive contains operator, used by the text filter. */
export const CONTAINS_OPERATOR = 'like'

/** Column keys that mark a value computed on the client, never stored. */
const COMPUTED_MARKERS = ['aggregate', 'compute', 'computed', 'virtual']

/**
 * Normalise a `$ref` to the referenced schema slug, or null.
 *
 * @param {unknown} ref A `$ref` value.
 * @return {string|number|null} The slug.
 */
function refSlug(ref) {
	if (typeof ref === 'number' && !Number.isNaN(ref)) {
		return ref
	}
	if (typeof ref !== 'string' || ref === '') {
		return null
	}
	const tail = ref.includes('/') ? ref.substring(ref.lastIndexOf('/') + 1) : ref
	const slug = tail === '' ? '' : schemaRefSlug(tail)
	return slug !== '' ? slug : null
}

/**
 * The schema property behind a column, or null when the column has none.
 *
 * @param {object} column The column definition.
 * @param {object|null} schema The table's schema.
 * @return {object|null} The property.
 */
export function columnProperty(column, schema) {
	if (!column || !schema || !schema.properties || typeof column.key !== 'string') {
		return null
	}
	const prop = schema.properties[column.key]
	return (prop && typeof prop === 'object') ? prop : null
}

/**
 * Whether a column computes its value on the client, so the server cannot
 * sort or filter on it.
 *
 * @param {object} column The column definition.
 * @return {boolean} True for a computed column.
 */
function isComputedColumn(column) {
	return COMPUTED_MARKERS.some((marker) => column[marker] !== undefined && column[marker] !== null && column[marker] !== false)
}

/**
 * Whether a column header sorts.
 *
 * `sortable: false` always wins, and so does an explicit `sortable: true`.
 * Otherwise, with a schema, a column sorts when a stored schema property backs
 * it: OpenRegister orders on schema properties, so a widget or computed column
 * with no property behind it stays unsortable. Without a schema nothing says
 * the server can sort, so only an explicit flag makes the column sortable,
 * which is how such tables behaved before.
 *
 * @param {object} column The column definition.
 * @param {object|null} schema The table's schema.
 * @return {boolean} True when the header sorts.
 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-sorts-by-default
 */
export function isColumnSortable(column, schema) {
	if (!column || typeof column !== 'object') {
		return false
	}
	if (column.sortable === false) {
		return false
	}
	if (column.sortable === true) {
		return true
	}
	if (!schema || isComputedColumn(column)) {
		return false
	}
	const prop = columnProperty(column, schema)
	return !!prop && prop.type !== 'object'
}

/**
 * Display options for an enum filter: schema `enum` (or `items.enum`) with
 * `x-enum-labels`, else a column `enum` hint, else a badge column's colour
 * map keys.
 *
 * @param {object} column The column definition.
 * @param {object|null} prop The schema property.
 * @return {Array<{value: string, label: string}>} The options, or [].
 */
function enumOptions(column, prop) {
	const p = prop || {}
	const labels = p.enumLabels || p['x-enum-labels'] || (p.items && (p.items.enumLabels || p.items['x-enum-labels'])) || {}
	let values = null
	if (Array.isArray(p.enum) && p.enum.length > 0) {
		values = p.enum
	} else if (p.items && Array.isArray(p.items.enum) && p.items.enum.length > 0) {
		values = p.items.enum
	} else if (Array.isArray(column.enum) && column.enum.length > 0) {
		values = column.enum
	} else if (column.widget === 'badge' && column.widgetProps && column.widgetProps.colorMap) {
		values = Object.keys(column.widgetProps.colorMap)
	}
	if (!values) {
		return []
	}
	return values
		.filter((v) => v !== null && v !== undefined && v !== '')
		.map((v) => ({ value: String(v), label: String(labels[v] !== undefined ? labels[v] : v) }))
}

/**
 * The reference a column points at, for a searchable object filter: a schema
 * `$ref` (or `items.$ref`), else an `fkResolve` cell widget's config.
 *
 * @param {object} column The column definition.
 * @param {object|null} prop The schema property.
 * @return {{schema: (string|number), register: string, labelField: string}|null} The reference.
 */
function referenceTarget(column, prop) {
	const widgetProps = (column.widget === 'fkResolve' && column.widgetProps) || null
	const p = prop || {}
	const schemaRef = refSlug(p.$ref) ?? (p.items ? refSlug(p.items.$ref) : null)
	const schema = schemaRef ?? (widgetProps && widgetProps.schema ? widgetProps.schema : null)
	if (schema === null || schema === undefined || schema === '') {
		return null
	}
	const register = (widgetProps && widgetProps.register)
		|| p['x-external-register']
		|| (p.items && p.items['x-external-register'])
		|| ''
	const labelField = (widgetProps && widgetProps.labelField) || ''
	return { schema, register, labelField }
}

/**
 * How a column filters, or null when it does not.
 *
 * Kinds: `enum` (checkbox list), `boolean` (yes, no, any), `reference`
 * (searchable list of the referenced objects), `number` and `date` (from and
 * to), and `string` (contains, through OpenRegister's `[like]`). `filterable: false` on the column turns it
 * off. A column with no schema property behind it only filters when it
 * carries an enum hint (`enum`, or a badge widget's colour map), because the
 * server cannot filter on a value it does not store.
 *
 * @param {object} column The column definition.
 * @param {object|null} schema The table's schema.
 * @return {{key: string, kind: string, label: string, options: Array<{value: string, label: string}>, reference: object|null, dateTime: boolean}|null} The filter definition.
 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-filters-from-its-header
 */
export function columnFilterDef(column, schema) {
	if (!column || typeof column !== 'object' || typeof column.key !== 'string' || column.key === '') {
		return null
	}
	if (column.filterable === false || isComputedColumn(column)) {
		return null
	}
	const prop = columnProperty(column, schema)
	const base = { key: column.key, label: column.label || (prop && prop.title) || column.key, options: [], reference: null, dateTime: false }

	const options = enumOptions(column, prop)
	if (options.length > 0) {
		return { ...base, kind: 'enum', options }
	}
	if (!prop) {
		return null
	}
	const reference = referenceTarget(column, prop)
	if (reference) {
		return { ...base, kind: 'reference', reference }
	}
	const type = Array.isArray(prop.type) ? prop.type.find((t) => t !== 'null') : prop.type
	const format = prop.format || ''
	if (type === 'boolean') {
		return { ...base, kind: 'boolean' }
	}
	if (type === 'number' || type === 'integer') {
		return { ...base, kind: 'number' }
	}
	if (type === 'string' && (format === 'date' || format === 'date-time')) {
		return { ...base, kind: 'date', dateTime: format === 'date-time' }
	}
	if (type === 'string') {
		return { ...base, kind: 'string' }
	}
	return null
}

/**
 * Read one active-filter entry as a list of strings.
 *
 * @param {unknown} raw An active-filter value: an array, a scalar, or absent.
 * @return {Array<string>} The values.
 */
function asList(raw) {
	if (raw === undefined || raw === null || raw === '') {
		return []
	}
	return (Array.isArray(raw) ? raw : [raw]).filter((v) => v !== undefined && v !== null && v !== '').map((v) => String(v))
}

/**
 * The parameter keys one column filter owns.
 *
 * @param {object} def A filter definition from `columnFilterDef`.
 * @return {Array<string>} The keys.
 */
export function columnFilterParamKeys(def) {
	if (!def) {
		return []
	}
	if (def.kind === 'number' || def.kind === 'date') {
		return [`${def.key}[gte]`, `${def.key}[lte]`]
	}
	if (def.kind === 'string') {
		return [containsKey(def)]
	}
	return [def.key]
}

/**
 * The parameter a text filter writes: `{key}[like]`. An exact `key=value`
 * from the facet sidebar or a fixed filter is a different key, so the header
 * neither shows nor clears it.
 *
 * @param {object} def A filter definition of kind `string`.
 * @return {string} The parameter key.
 * @spec openspec/changes/header-filter-contains/specs/cn-data-table/spec.md#requirement-a-text-header-filter-matches-on-contains
 */
function containsKey(def) {
	return `${def.key}[${CONTAINS_OPERATOR}]`
}

/**
 * A column filter's current state, read from the active-filter map.
 *
 * @param {object} def A filter definition.
 * @param {object} activeFilters The active-filter map (`{ paramKey: values }`).
 * @return {object} `{ values }` for enum and reference, `{ value }` for boolean and string, `{ from, to }` for number and date.
 */
export function columnFilterState(def, activeFilters) {
	const filters = (activeFilters && typeof activeFilters === 'object') ? activeFilters : {}
	if (!def) {
		return {}
	}
	if (def.kind === 'enum' || def.kind === 'reference') {
		return { values: asList(filters[def.key]) }
	}
	if (def.kind === 'number' || def.kind === 'date') {
		const from = asList(filters[`${def.key}[gte]`])[0] || ''
		const to = asList(filters[`${def.key}[lte]`])[0] || ''
		// A date-time column is queried up to the end of the day; the input
		// shows the date the person picked.
		return {
			from: def.kind === 'date' ? from.slice(0, 10) : from,
			to: def.kind === 'date' ? to.slice(0, 10) : to,
		}
	}
	if (def.kind === 'string') {
		return { value: asList(filters[containsKey(def)])[0] || '' }
	}
	return { value: asList(filters[def.key])[0] || '' }
}

/**
 * Whether a column filter is active.
 *
 * @param {object} def A filter definition.
 * @param {object} activeFilters The active-filter map.
 * @return {boolean} True when any of its parameters is set.
 */
export function isColumnFilterActive(def, activeFilters) {
	const filters = (activeFilters && typeof activeFilters === 'object') ? activeFilters : {}
	return columnFilterParamKeys(def).some((key) => asList(filters[key]).length > 0)
}

/**
 * The active-filter entries a column filter state produces. Every key the
 * column owns is present; an empty list clears that key, so changing a range
 * from "from and to" to "from" drops the old upper bound.
 *
 * @param {object} def A filter definition.
 * @param {object} state The column filter state (see `columnFilterState`).
 * @return {object} `{ paramKey: values[] }`.
 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-a-header-filter-speaks-the-sidebars-query-language
 */
export function columnFilterParams(def, state) {
	const s = state || {}
	if (!def) {
		return {}
	}
	if (def.kind === 'enum' || def.kind === 'reference') {
		return { [def.key]: asList(s.values) }
	}
	if (def.kind === 'number' || def.kind === 'date') {
		const from = s.from === undefined || s.from === null ? '' : String(s.from).trim()
		let to = s.to === undefined || s.to === null ? '' : String(s.to).trim()
		if (def.kind === 'date' && def.dateTime && to !== '' && to.length === 10) {
			to = `${to}T23:59:59`
		}
		return {
			[`${def.key}[gte]`]: from === '' ? [] : [from],
			[`${def.key}[lte]`]: to === '' ? [] : [to],
		}
	}
	if (def.kind === 'boolean') {
		return { [def.key]: (s.value === 'true' || s.value === 'false') ? [s.value] : [] }
	}
	// Text: the raw term under `[like]`. No wildcards: OpenRegister wraps
	// the term itself and escapes `%`, `_` and `\` in it.
	const value = s.value === undefined || s.value === null ? '' : String(s.value).trim()
	return { [containsKey(def)]: value === '' ? [] : [value] }
}

/**
 * Clear-all entries for one column: every key it owns, emptied.
 *
 * @param {object} def A filter definition.
 * @return {object} `{ paramKey: [] }`.
 */
export function clearedColumnFilterParams(def) {
	return Object.fromEntries(columnFilterParamKeys(def).map((key) => [key, []]))
}
