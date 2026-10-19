/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Select options read from a source (`optionsFrom`), the shape a dashboard
 * page filter and a form field share:
 *
 * - `{ url, params?, responsePath? }`: rows from an app endpoint;
 * - `{ register, schema, filter? }`: OpenRegister objects of that schema;
 *
 * each with `valueField` (default `id`, else the object's uuid),
 * `labelField` (default `title`, else `name`, else the value) and an optional
 * `groupField` that groups the options, all dot-paths.
 *
 * @module utils/optionsFrom
 * @spec openspec/changes/form-field-options-from/specs/form-dialog/spec.md#requirement-a-select-field-can-read-its-options-from-a-source
 */

import { fetchEndpointSource } from '../composables/useEndpointSource.js'
import { readPath } from './readPath.js'

/** How many objects a `{ register, schema }` source reads. */
export const OPTIONS_FROM_LIMIT = 500

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Whether a value is a usable `optionsFrom` block.
 *
 * @param {unknown} from The block.
 * @return {boolean} True for an endpoint or a register and schema.
 */
export function isOptionsFrom(from) {
	if (!isPlainObject(from)) {
		return false
	}
	const endpoint = typeof from.url === 'string' && from.url !== ''
	const objects = typeof from.register === 'string' && from.register !== '' && typeof from.schema === 'string' && from.schema !== ''
	return endpoint || objects
}

/**
 * The endpoint source an `optionsFrom` block reads, in the `endpointSource`
 * shape `fetchEndpointSource` takes.
 *
 * @param {object} from The `optionsFrom` block.
 * @return {{url: string, params?: object, responsePath?: string}|null} The source, or null when unusable.
 */
export function optionsFromSource(from) {
	if (!isOptionsFrom(from)) {
		return null
	}
	if (typeof from.url === 'string' && from.url !== '') {
		return {
			url: from.url,
			...(isPlainObject(from.params) ? { params: from.params } : {}),
			...(typeof from.responsePath === 'string' && from.responsePath !== '' ? { responsePath: from.responsePath } : {}),
		}
	}
	return {
		url: `/apps/openregister/api/objects/${encodeURIComponent(from.register)}/${encodeURIComponent(from.schema)}`,
		params: { _limit: OPTIONS_FROM_LIMIT, ...(isPlainObject(from.filter) ? from.filter : {}) },
		responsePath: 'results',
	}
}

/**
 * One row as an `{ id, label }` option, or null for a row without a value.
 * A plain string or number is its own value and label.
 *
 * @param {unknown} row The row.
 * @param {{valueField?: string, labelField?: string}} [from] The `optionsFrom` block.
 * @return {{id: (string|number), label: string}|null} The option.
 */
export function optionFromRow(row, from = {}) {
	if (row === null || row === undefined) {
		return null
	}
	if (typeof row !== 'object') {
		return row === '' ? null : { id: row, label: String(row) }
	}
	const id = typeof from.valueField === 'string' && from.valueField !== ''
		? readPath(row, from.valueField)
		: (row.id ?? row['@self']?.id ?? row.uuid)
	if (id === null || id === undefined || id === '' || typeof id === 'object') {
		return null
	}
	const label = typeof from.labelField === 'string' && from.labelField !== ''
		? readPath(row, from.labelField)
		: (row.title || row.name)
	const option = { id, label: label === null || label === undefined || label === '' ? String(id) : String(label) }
	// `groupField`: the option's group, which keeps options of one group together.
	if (typeof from.groupField === 'string' && from.groupField !== '') {
		const group = readPath(row, from.groupField)
		if (group !== null && group !== undefined && group !== '') {
			option.group = String(group)
		}
	}
	return option
}

/**
 * Read the options of an `optionsFrom` block. A failed or empty read gives
 * no options; the caller decides how to show that.
 *
 * @param {object} from The `optionsFrom` block.
 * @param {object} [ctx] The token context for the params (see `fetchEndpointSource`).
 * @return {Promise<Array<{id: (string|number), label: string}>>} The options, in the source's order.
 */
export async function loadOptionsFrom(from, ctx = {}) {
	const source = optionsFromSource(from)
	if (!source) {
		return []
	}
	const data = await fetchEndpointSource(source, ctx, { force: true })
	const rows = narrowRows(Array.isArray(data) ? data : [], from)
	const seen = new Set()
	const out = []
	for (const row of rows) {
		const option = optionFromRow(row, from)
		if (option && !seen.has(String(option.id))) {
			seen.add(String(option.id))
			out.push(option)
		}
	}
	if (typeof from.groupField === 'string' && from.groupField !== '') {
		// Groups in the order they first appear, each option keeping its place within its group.
		const order = [...new Set(out.map((o) => o.group || ''))]
		return order.flatMap((group) => out.filter((o) => (o.group || '') === group))
	}
	return out
}

/**
 * The rows a source answers, narrowed: `where` keeps the rows whose fields
 * equal its values (`{ type: 'string' }`), and `itemsPath` replaces each
 * remaining row by the list at that path (the formats of one property type).
 *
 * @param {Array<unknown>} rows The rows.
 * @param {{where?: object, itemsPath?: string}} from The `optionsFrom` block.
 * @return {Array<unknown>} The rows the options are read from.
 */
function narrowRows(rows, from) {
	let out = rows
	if (isPlainObject(from.where)) {
		out = out.filter((row) => row && typeof row === 'object' && Object.entries(from.where).every(([key, value]) => String(readPath(row, key)) === String(value)))
	}
	if (typeof from.itemsPath === 'string' && from.itemsPath !== '') {
		out = out.flatMap((row) => {
			const items = readPath(row, from.itemsPath)
			return Array.isArray(items) ? items : []
		})
	}
	return out
}

/**
 * An `optionsFrom` block with every `@form.<key>` string replaced by that
 * form value, so a source can depend on another field (`where: { type:
 * '@form.propertyType' }`). A value the form does not hold becomes ''.
 *
 * @param {unknown} value The block, or a part of it.
 * @param {object} formData The form values.
 * @return {unknown} The block with the form values filled in.
 */
export function resolveFormTokens(value, formData) {
	if (typeof value === 'string' && value.startsWith('@form.')) {
		const held = (formData || {})[value.slice('@form.'.length)]
		return held === undefined || held === null ? '' : held
	}
	if (Array.isArray(value)) {
		return value.map((v) => resolveFormTokens(v, formData))
	}
	if (isPlainObject(value)) {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveFormTokens(v, formData)]))
	}
	return value
}

/**
 * The form fields an `optionsFrom` block reads through `@form.<key>`.
 *
 * @param {unknown} from The block.
 * @return {Array<string>} The keys.
 */
export function formTokenKeys(from) {
	const keys = new Set()
	const walk = (v) => {
		if (typeof v === 'string' && v.startsWith('@form.')) {
			keys.add(v.slice('@form.'.length))
		} else if (Array.isArray(v)) {
			v.forEach(walk)
		} else if (isPlainObject(v)) {
			Object.values(v).forEach(walk)
		}
	}
	walk(from)
	return [...keys]
}

/**
 * The options whose label holds the query, ignoring case. An empty query
 * keeps them all.
 *
 * @param {Array<{id: (string|number), label: string}>} options The options.
 * @param {string} [query] The search text.
 * @return {Array<{id: (string|number), label: string}>} The matching options.
 */
export function filterOptions(options, query = '') {
	const q = typeof query === 'string' ? query.trim().toLowerCase() : ''
	if (q === '') {
		return options
	}
	return options.filter((o) => o.label.toLowerCase().includes(q) || String(o.id).toLowerCase().includes(q))
}

/**
 * A form field that reads its options (`optionsFrom`) drawn as a select: a
 * single select, or a multiselect for an array field. Any other field is
 * returned as it is.
 *
 * @param {object} field The field definition.
 * @return {object} The field.
 */
export function fieldWithOptionsFrom(field) {
	if (!field || !isOptionsFrom(field.optionsFrom)) {
		return field
	}
	const widget = field.type === 'array' ? 'multiselect' : 'select'
	return field.widget === widget ? field : { ...field, widget }
}
