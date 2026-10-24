/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * relatedFieldFilters — filtering a list on a type's own declared fields,
 * whose values live as rows in a related schema that points back at the row
 * being searched (an EAV pair: a definition and a value).
 *
 * The grammar is OpenRegister's `RelatedRowFilterParser`:
 *
 *     _related[<schema>][<backref>][<definitionKey>]=pd-7
 *     _related[<schema>][<backref>][<valueKey>][gte]=100
 *
 * ONE BLOCK IS ONE EXISTENCE CLAUSE: one related row that is both the named
 * definition and passes the value test. Two conditions are two NUMBERED
 * blocks, the number after the backref (`…[<backref>][0][…]`). Merged into one
 * block they ask for a row that is two definitions at once, and the list
 * comes back empty with no reason. A malformed block is refused with a
 * sentence, which `readRelatedRefusal` turns back into the field's name.
 *
 * When the values live on the searched row itself, as an array of
 * `{ <definitionKey>, <valueKey> }` entries (`related.element`, the array
 * property), the grammar is OpenRegister's `_element` filter instead, with
 * the same blocks: one block is one element of the array.
 *
 *     _element[<property>][<definitionKey>]=pd-7
 *     _element[<property>][<valueKey>][gte]=100
 *
 * Internal helper of CnRelatedFieldFilters.
 *
 * @module utils/relatedFieldFilters
 */

/** The property types asked for as a number range. */
const NUMERIC_TYPES = ['number', 'integer']

/** The property types and formats asked for as a date range. */
const DATE_TYPES = ['date', 'datetime', 'date-time']

/**
 * The definitions offered as filters: only those that declare
 * `filterable: true`, in the order given.
 *
 * @param {Array<object>} [definitions] The type's field definitions.
 * @return {Array<object>} The filterable ones.
 */
export function filterableDefinitions(definitions) {
	return (Array.isArray(definitions) ? definitions : []).filter((definition) => definition && definition.filterable === true)
}

/**
 * The control a definition is asked for with: a declared list is a select, a
 * number a range, a date (by type or format) a date range, anything else text.
 *
 * @param {object} [definition] The field definition.
 * @return {'select'|'range'|'dateRange'|'text'} The control.
 */
export function controlFor(definition) {
	const type = String(definition?.propertyType || '')
	const format = String(definition?.format || '')
	const values = definition?.enumValues
	if (Array.isArray(values) && values.length > 0) {
		return 'select'
	}
	if (NUMERIC_TYPES.includes(type)) {
		return 'range'
	}
	if (DATE_TYPES.includes(type) || DATE_TYPES.includes(format)) {
		return 'dateRange'
	}
	return 'text'
}

/**
 * The id a definition is addressed by in a filter.
 *
 * @param {object} [definition] The field definition.
 * @return {string} The id, or ''.
 */
export function definitionId(definition) {
	const self = definition?.['@self']
	return String(self?.uuid || self?.id || definition?.id || '')
}

/**
 * Whether one field's entered value asks anything at all. A blank field is
 * not a filter.
 *
 * @param {object} [value] `{ eq?, gte?, lte?, in? }`.
 * @return {boolean} True when the field asks something.
 */
export function isFilled(value) {
	if (value === undefined || value === null) {
		return false
	}
	return ['eq', 'gte', 'lte', 'in'].some((key) => {
		const entry = value[key]
		if (Array.isArray(entry)) {
			return entry.length > 0
		}
		return entry !== undefined && entry !== null && String(entry) !== ''
	})
}

/**
 * Compile the entered values into one `_related` block per filled field,
 * numbered when there is more than one; with `element`, one `_element` block.
 *
 * @param {Array<{definitionId: string, value: object}>} [entries] In bar order.
 * @param {object} related Where the values live.
 * @param {string} [related.element] The searched row's array property holding them, instead of a related schema.
 * @param {string} [related.schema] The related schema.
 * @param {string} [related.backref] Its property pointing back at the searched row.
 * @param {string} [related.definitionKey] Its property naming the definition.
 * @param {string} [related.valueKey] Its property holding the value.
 * @return {object} The query keys.
 */
export function buildRelatedFilters(entries, { element, schema, backref, definitionKey = 'propertyDefinition', valueKey = 'value' }) {
	const filled = (Array.isArray(entries) ? entries : []).filter((entry) => entry && entry.definitionId && isFilled(entry.value))
	const onElement = typeof element === 'string' && element !== ''
	const query = {}
	filled.forEach((entry, index) => {
		const block = filled.length === 1 ? '' : `[${index}]`
		const prefix = onElement ? `_element[${element}]${block}` : `_related[${schema}][${backref}]${block}`
		query[`${prefix}[${definitionKey}]`] = entry.definitionId
		const value = entry.value
		if (Array.isArray(value.in) && value.in.length > 0) {
			// `_element` takes the list as a list; `_related` as one comma-separated value.
			if (onElement) {
				value.in.forEach((item, at) => {
					query[`${prefix}[${valueKey}][in][${at}]`] = String(item)
				})
			} else {
				query[`${prefix}[${valueKey}][in]`] = value.in.join(',')
			}
		}
		['eq', 'gte', 'lte'].forEach((operator) => {
			const operand = value[operator]
			if (operand === undefined || operand === null || String(operand) === '') {
				return
			}
			const suffix = operator === 'eq' ? '' : `[${operator}]`
			query[`${prefix}[${valueKey}]${suffix}`] = String(operand)
		})
	})
	return query
}

/**
 * The `_related` and `_element` keys a query carries.
 *
 * @param {object} [query] A route query.
 * @return {Array<string>} The keys.
 */
export function relatedKeysIn(query) {
	return Object.keys(query || {}).filter((key) => key.startsWith('_related[') || key.startsWith('_element['))
}

/**
 * The field a refused `_related` block is about, named for the reader: the
 * server names the definition by id, and an id is not a sentence anyone can
 * act on.
 *
 * @param {object} [options] The inputs.
 * @param {object} [options.error] What the object store recorded for the list.
 * @param {Array<object>} [options.definitions] The type's definitions.
 * @return {{name: string, message: string}|null} The refusal, or null.
 */
export function readRelatedRefusal({ error, definitions } = {}) {
	if (!error) {
		return null
	}
	const message = String(error?.response?.data?.error || error?.response?.data?.message || error?.message || '')
	if (message === '' || (!message.includes('_related') && !message.includes('_element'))) {
		return null
	}
	const named = (Array.isArray(definitions) ? definitions : []).find((definition) => {
		const id = definitionId(definition)
		return id !== '' && message.includes(id)
	})
	return { name: String(named?.name || ''), message }
}
