// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { translate as t } from '@nextcloud/l10n'
import { MISSING_VALUE } from './facets.js'

/**
 * A saved view's filters as one readable line: "Case type Woo request,
 * status open". Each filter is its field's title and its values' display
 * names, in the order the view stores them; the line is in sentence case, so
 * every field title after the first starts in lower case.
 *
 * A filter is named as the page's Active line names it: the page's
 * `filterLabels` entry first (its `label` for the field, its `values` per
 * value), then the schema. A filter whose `filterLabels` entry says
 * `hidden: true` is left out: a working-list rule such as "not a draft" that
 * every view carries is not what tells one view from another.
 *
 * A value's display name comes from, in order: the page's `filterLabels`
 * values, `valueLabels` (the names the caller looked up, such as the title of
 * a referenced record or a facet bucket's label), the property's `oneOf`
 * titles, its `x-enum-labels`, yes or no for a boolean, and else the value
 * itself. A range shows as "from" and "up to"; a search term as `"term"`.
 *
 * @param {{filters?: object, search?: string}} state The view's state (see `extractViewState`).
 * @param {object} [options] Options.
 * @param {object} [options.properties] The page schema's `properties`.
 * @param {{[key: string]: {[value: string]: string}}} [options.valueLabels] Display names per filter key and value.
 * @param {{[key: string]: {label?: string, values?: object, hidden?: boolean}}} [options.filterLabels] The page's `config.filterLabels`.
 * @param {(text: string) => string} [options.translate] The app's translate, for titles and labels the schema declares.
 * @return {string} The line, or '' for a view without filters or search.
 * @spec openspec/changes/saved-view-summary-reads-like-the-chips/specs/saved-view-menu-settings/spec.md
 * @spec openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-a-menu-entry-says-what-its-view-shows-and-how-many
 */
export function summarizeViewFilters(state, options = {}) {
	const properties = (options.properties && typeof options.properties === 'object') ? options.properties : {}
	const valueLabels = (options.valueLabels && typeof options.valueLabels === 'object') ? options.valueLabels : {}
	const filterLabels = (options.filterLabels && typeof options.filterLabels === 'object') ? options.filterLabels : {}
	const tr = typeof options.translate === 'function' ? options.translate : (text) => text
	const filters = (state && state.filters && typeof state.filters === 'object') ? state.filters : {}
	const parts = []
	for (const [key, raw] of Object.entries(filters)) {
		const named = (filterLabels[key] && typeof filterLabels[key] === 'object') ? filterLabels[key] : {}
		if (named.hidden === true) {
			continue
		}
		const prop = properties[key] || {}
		const namedValues = (named.values && typeof named.values === 'object') ? named.values : {}
		const values = (Array.isArray(raw) ? raw : [raw])
			.filter((value) => value !== undefined && value !== '')
			.map((value) => (typeof namedValues[String(value)] === 'string' && namedValues[String(value)] !== ''
				? tr(namedValues[String(value)])
				: valueText(value, prop, valueLabels[key] || {}, tr)))
			.filter((text) => text !== '')
		if (values.length === 0) {
			continue
		}
		const title = typeof named.label === 'string' && named.label !== ''
			? named.label
			: (typeof prop.title === 'string' && prop.title !== '' ? prop.title : key)
		const field = tr(title)
		parts.push(`${field} ${values.join(` ${t('nextcloud-vue', 'or')} `)}`)
	}
	if (state && typeof state.search === 'string' && state.search.trim() !== '') {
		parts.push(`"${state.search.trim()}"`)
	}
	return parts.map((part, index) => (index === 0 ? part : lowerFirst(part))).join(', ')
}

/**
 * The ids a view's filters hold per reference property, for a label lookup.
 * A filter on a value that identifies a record without being its id (a case
 * type's `identifier`) is a reference too when the page's `filterLabels`
 * entry names it: `reference: { register?, schema, matchField, labelField }`.
 *
 * @param {{filters?: object}} state The view's state.
 * @param {Array<object>} fields The page schema's fields (`fieldsFromSchema`).
 * @param {{[key: string]: {reference?: object}}} [filterLabels] The page's `config.filterLabels`.
 * @return {Array<{key: string, register: string, schema: string, labelField: string, matchField?: string, ids: Array<string>}>} One entry per reference filter.
 * @spec openspec/changes/saved-view-summary-match-field-labels/specs/saved-view-menu-settings/spec.md#requirement-a-filter-on-a-records-identifier-reads-as-the-records-name
 */
export function viewFilterReferences(state, fields, filterLabels = {}) {
	const filters = (state && state.filters && typeof state.filters === 'object') ? state.filters : {}
	const out = []
	for (const [key, raw] of Object.entries(filters)) {
		const field = (Array.isArray(fields) ? fields : []).find((f) => f && f.key === key)
		const named = filterLabels && filterLabels[key] && filterLabels[key].reference && typeof filterLabels[key].reference === 'object' ? filterLabels[key].reference : null
		const ref = (field && field.reference) || named
		if (!ref || ref.schema === undefined || ref.schema === null) {
			continue
		}
		const ids = (Array.isArray(raw) ? raw : [raw])
			.filter((id) => (typeof id === 'string' || typeof id === 'number') && id !== '' && id !== MISSING_VALUE)
			.map(String)
		if (ids.length > 0) {
			const matchField = ref === named && typeof ref.matchField === 'string' && ref.matchField !== '' ? { matchField: ref.matchField } : {}
			out.push({ key, register: ref.register || '', schema: String(ref.schema), labelField: ref.labelField || '', ...matchField, ids })
		}
	}
	return out
}

/**
 * One value's display name.
 *
 * @param {unknown} value The stored value.
 * @param {object} prop The property.
 * @param {{[value: string]: string}} labels Looked-up names for this key.
 * @param {(text: string) => string} tr The app's translate.
 * @return {string}
 */
function valueText(value, prop, labels, tr) {
	if (value === null || value === MISSING_VALUE) {
		return t('nextcloud-vue', 'no value')
	}
	if (typeof value === 'boolean' || value === 'true' || value === 'false') {
		return (value === true || value === 'true') ? t('nextcloud-vue', 'yes') : t('nextcloud-vue', 'no')
	}
	if (typeof value === 'object') {
		return Object.entries(value)
			.map(([op, operand]) => {
				if (op === 'gte' || op === 'gt') {
					return t('nextcloud-vue', 'from {value}', { value: String(operand) })
				}
				if (op === 'lte' || op === 'lt') {
					return t('nextcloud-vue', 'up to {value}', { value: String(operand) })
				}
				return `${op} ${String(operand)}`
			})
			.join(' ')
	}
	const id = String(value)
	if (typeof labels[id] === 'string' && labels[id] !== '') {
		return labels[id]
	}
	const option = (Array.isArray(prop.oneOf) ? prop.oneOf : []).find((o) => o && String(o.const) === id && typeof o.title === 'string')
	if (option) {
		return tr(option.title)
	}
	const enumLabels = prop['x-enum-labels']
	if (enumLabels && typeof enumLabels === 'object' && typeof enumLabels[id] === 'string') {
		return tr(enumLabels[id])
	}
	return id
}

/**
 * The text with its first letter in lower case, unless the first word is in
 * capitals (an abbreviation such as "BSN").
 *
 * @param {string} text The text.
 * @return {string}
 */
function lowerFirst(text) {
	const word = text.split(' ')[0]
	if (word.length > 1 && word === word.toUpperCase()) {
		return text
	}
	return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * What a view holds, as sentences: its filters and search term
 * (`summarizeViewFilters`), then its sort, "Sorted by deadline, descending."
 * The saved-view edit dialog shows it under each criteria choice
 * (DqFilterBewerken).
 *
 * @param {{filters?: object, search?: string, sortKeys?: Array<{key: string, order: string}>, sortKey?: string, sortOrder?: string}} state The view's state.
 * @param {object} [options] As for `summarizeViewFilters`.
 * @return {string} The sentences, or '' for a view with no filters, search or sort.
 * @spec openspec/changes/saved-view-edit-board-form/specs/saved-views/spec.md
 */
export function viewCriteriaSummary(state, options = {}) {
	const properties = (options.properties && typeof options.properties === 'object') ? options.properties : {}
	const tr = typeof options.translate === 'function' ? options.translate : (text) => text
	const sentences = []
	const filters = summarizeViewFilters(state, options)
	if (filters !== '') {
		sentences.push(`${filters}.`)
	}
	const keys = state && Array.isArray(state.sortKeys) && state.sortKeys.length > 0
		? state.sortKeys
		: (state && state.sortKey ? [{ key: state.sortKey, order: state.sortOrder }] : [])
	const first = keys.find((entry) => entry && typeof entry.key === 'string' && entry.key !== '')
	if (first) {
		const prop = properties[first.key] || {}
		const field = lowerFirst(tr(typeof prop.title === 'string' && prop.title !== '' ? prop.title : first.key))
		const direction = first.order === 'desc' ? t('nextcloud-vue', 'descending') : t('nextcloud-vue', 'ascending')
		sentences.push(t('nextcloud-vue', 'Sorted by {field}, {direction}.', { field, direction }))
	}
	return sentences.join(' ')
}
