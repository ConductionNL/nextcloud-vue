// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Form fields that a record's own data decides, rather than its schema.
 *
 * Some domains keep half of an object's shape in the database instead of the
 * schema. A municipal case type declares which extra questions its cases must
 * answer; a product line declares which attributes its orders carry. The
 * schema cannot enumerate those, because a functional admin adds them at
 * runtime without a release.
 *
 * The pattern is always the same three parts, so this module names them once:
 *
 *  - a **driving property** on the schema — a reference the user picks first
 *    (`case.caseType`), carrying an `x-openregister-extends-form` block;
 *  - a **definitions schema** whose records describe the extra fields
 *    (`propertyDefinition`), filtered by the driving property's value;
 *  - a **values schema** that stores one answer per definition per object
 *    (`caseProperty`), written after the parent object exists.
 *
 * Definitions are mapped into ordinary JSON Schema properties and handed to
 * `fieldsFromSchema`, so widget resolution, enum labels, validation and
 * description splitting all come from the one engine. A dynamic field is not
 * a second kind of field; it is a normal field whose declaration arrived late.
 *
 * @module utils/dynamicProperties
 */

import { resolveFilterTokens } from './resolveFilterTokens.js'

/**
 * The vendor extension a driving property carries.
 *
 * @type {string}
 */
export const EXTENDS_FORM_KEY = 'x-openregister-extends-form'

/**
 * The vendor extension a driving property carries to prefill its siblings.
 *
 * Where `x-openregister-extends-form` adds NEW fields, this one fills fields
 * the schema already declares. A case type knows the status a case of its
 * kind starts in and who normally handles it, so a person should not have to
 * retype what the chosen type already answers.
 *
 * @type {string}
 */
export const PREFILL_KEY = 'x-openregister-prefill'

/**
 * Prefix that namespaces a dynamic field's key inside form data.
 *
 * Definition records are named by a functional admin, so a definition called
 * `title` or `status` is not merely possible but likely. Without a namespace
 * it would overwrite the real schema property of that name — silently, since
 * a form has no way to tell the two apart once they share a key.
 *
 * @type {string}
 */
export const DYNAMIC_KEY_PREFIX = 'x-prop:'

/**
 * How a definition record's declared type becomes a JSON Schema property.
 *
 * Covers the JSON Schema type names themselves plus the shorthands a
 * definitions schema tends to use, because an admin picking a type from a
 * dropdown picks `date`, not `string`/`format: date`.
 *
 * @type {Record<string, object>}
 */
const TYPE_MAP = {
	string: { type: 'string' },
	text: { type: 'string' },
	textarea: { type: 'string', format: 'textarea' },
	markdown: { type: 'string', format: 'markdown' },
	number: { type: 'number' },
	integer: { type: 'integer' },
	boolean: { type: 'boolean' },
	date: { type: 'string', format: 'date' },
	datetime: { type: 'string', format: 'date-time' },
	'date-time': { type: 'string', format: 'date-time' },
	url: { type: 'string', format: 'uri' },
	uri: { type: 'string', format: 'uri' },
	email: { type: 'string', format: 'email' },
	enum: { type: 'string' },
	json: { type: 'object', widget: 'json' },
	array: { type: 'array' },
	object: { type: 'object', widget: 'json' },
}

/**
 * Field names read off a definition record when the declaration omits `map`.
 *
 * @type {Record<string, string>}
 */
const DEFAULT_MAP = {
	title: 'name',
	description: 'description',
	type: 'propertyType',
	enum: 'enumValues',
	required: 'isRequired',
	default: 'defaultValue',
}

/**
 * Read a value off a record by mapped field name.
 *
 * @param {object} record The definition record.
 * @param {object} map The resolved field-name map.
 * @param {string} role The map role (`title`, `type`, …).
 * @return {*} The value, or undefined when the role is unmapped or absent.
 */
function mapped(record, map, role) {
	const field = map[role]
	if (!field) return undefined
	return record[field]
}

/**
 * The `x-openregister-extends-form` declarations on a schema, one per driving
 * property. Pure: reads the schema and nothing else.
 *
 * A schema may carry more than one — an order extended by both its product
 * line and its customer segment — so this always returns a list.
 *
 * @param {object} schema The schema object with a `properties` field.
 * @return {Array<{key: string, config: object}>} The declarations, in property order.
 */
export function extendsFormDeclarations(schema) {
	if (!schema || !schema.properties) return []
	const out = []
	for (const [key, prop] of Object.entries(schema.properties)) {
		const config = prop && prop[EXTENDS_FORM_KEY]
		if (config && typeof config === 'object' && config.definitions) {
			out.push({ key, config })
		}
	}
	return out
}

/**
 * A definition's name as a person should read it.
 *
 * Definition names are typed by a functional admin, and in practice a good
 * many arrive as identifiers rather than labels: real seeded data in dossiq
 * carries `auditorsStatementThreshold` and `interimReportTermWeeks`, which
 * render verbatim on a form a case handler is supposed to find friendly.
 *
 * Only an identifier-shaped name is touched. Anything containing a space is
 * already a label someone wrote deliberately, and reformatting it would be
 * this function deciding it knows better than the person who typed it.
 *
 * @param {string} name The definition's name.
 * @return {string} The name, made readable when it was an identifier.
 */
function humaniseName(name) {
	const value = String(name || '')
	if (!value || value.includes(' ')) return value

	const words = value
		// `camelCase` and `snake_case` / `kebab-case` both become words. The
		// lookahead pair keeps an acronym whole: `defaultBSNPolicy` splits to
		// `default BSN Policy`, not `default B S N Policy`.
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
	if (words.length === 0) return value

	// Sentence case, not Title Case: splitting `auditorsStatementThreshold`
	// leaves each word capitalised, and shipping that would put a Title Case
	// label on every form. An all-caps word is an acronym and keeps its shape.
	const cased = words.map((word, index) => {
		if (word.length > 1 && word === word.toUpperCase()) return word
		const lower = word.toLowerCase()
		return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
	})

	return cased.join(' ')
}

/**
 * The schema's `x-openregister-prefill` declarations, in property order.
 *
 * A declaration needs a `fields` map to be worth acting on: without it there
 * is nothing to copy, and returning it anyway would cost a fetch per change
 * for no effect.
 *
 * @param {object} schema The schema object with a `properties` field.
 * @return {Array<{key: string, config: object}>} The declarations, in property order.
 */
export function prefillDeclarations(schema) {
	if (!schema || !schema.properties) return []
	const out = []
	for (const [key, prop] of Object.entries(schema.properties)) {
		const config = prop && prop[PREFILL_KEY]
		if (config && typeof config === 'object' && config.fields
			&& Object.keys(config.fields).length > 0) {
			out.push({ key, config })
		}
	}
	return out
}

/**
 * The values one chosen record offers its siblings.
 *
 * Reads `config.fields` as `{ targetProperty: sourceProperty }` and returns
 * only the pairs the record can actually answer. A source field the record
 * leaves empty yields nothing, so a case type with no default assignee
 * prefills the status it does know and leaves the assignee alone, rather
 * than blanking a value.
 *
 * @param {object} record The chosen record, as the API returned it.
 * @param {object} config The `x-openregister-prefill` block (needs `fields`).
 * @return {object} Target property keys mapped to the values to apply.
 */
export function prefillValues(record, config) {
	const fields = (config && config.fields) || null
	if (!record || !fields) return {}

	const out = {}
	for (const [target, source] of Object.entries(fields)) {
		if (typeof source !== 'string' || !source) continue
		const value = record[source]
		if (value === undefined || value === null || value === '') continue
		if (Array.isArray(value) && value.length === 0) continue
		out[target] = value
	}
	return out
}

/**
 * The query parameters that fetch the definitions for one driving value.
 *
 * `config.definitions.filter` is token-resolved the way `x-relation-filter`
 * is, with the driving property's value available as `$value` and the whole
 * form as `@object.<field>`. A filter entry whose token stays unresolved is
 * dropped rather than sent, because a literal `@object.foo` reaching the API
 * filters on nonsense and returns zero rows — which reads exactly like a
 * case type that has no extra properties.
 *
 * @param {object} config The `x-openregister-extends-form` block.
 * @param {*} value The driving property's current value.
 * @param {object} [formData] The full form data, for `@object.<field>` tokens.
 * @return {object} Query parameters for `fetchCollection`.
 */
export function definitionQueryParams(config, value, formData = {}) {
	const params = { _limit: 100 }
	const raw = (config && config.definitions && config.definitions.filter) || null
	if (!raw || typeof raw !== 'object') return params

	// `$value` is the driving property itself; substitute it before token
	// resolution so the generic resolver never sees a token it cannot answer.
	const seeded = {}
	for (const [key, entry] of Object.entries(raw)) {
		seeded[key] = entry === '$value' ? value : entry
	}
	const resolved = resolveFilterTokens(seeded, { object: { ...formData }, objectId: formData.id })
	for (const [key, entry] of Object.entries(resolved)) {
		if (typeof entry === 'string' && entry.charAt(0) === '@') continue
		if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
			for (const [op, operand] of Object.entries(entry)) params[`${key}[${op}]`] = operand
		} else if (entry !== '' && entry !== null && entry !== undefined) {
			params[key] = entry
		}
	}
	return params
}

/**
 * Turn definition records into JSON Schema properties.
 *
 * The result is an ordinary `properties` map — the same shape a schema
 * carries — so the caller can hand it straight to `fieldsFromSchema` and get
 * widgets, enum labels, validation and required-marking for free.
 *
 * Each key is `DYNAMIC_KEY_PREFIX` + the record's id, never the admin-authored
 * name, so a definition can be renamed without orphaning the answers already
 * stored against it.
 *
 * @param {Array<object>} definitions The definition records.
 * @param {object} [config] The `x-openregister-extends-form` block (`map`, `typeMap`).
 * @param {object} [options] Extra options.
 * @param {number} [options.orderFrom] Order assigned to the first field; each subsequent field takes the next integer. Dynamic fields sort after the schema's own, so pass a number above every declared `order`.
 * @return {{properties: object, required: string[]}} Properties keyed by prefixed id, plus the required key list.
 */
export function propertiesFromDefinitions(definitions, config = {}, options = {}) {
	const map = { ...DEFAULT_MAP, ...(config.map || {}) }
	const typeMap = { ...TYPE_MAP, ...(config.typeMap || {}) }
	const orderFrom = typeof options.orderFrom === 'number' ? options.orderFrom : 1000

	const properties = {}
	const required = []
	const list = Array.isArray(definitions) ? definitions : []

	list.forEach((record, index) => {
		if (!record || !record.id) return
		const key = DYNAMIC_KEY_PREFIX + record.id
		const declaredType = mapped(record, map, 'type')
		const base = typeMap[declaredType] || typeMap.string

		const title = mapped(record, map, 'title')
		const description = mapped(record, map, 'description')
		const enumValues = mapped(record, map, 'enum')
		const defaultValue = mapped(record, map, 'default')
		const maxLength = mapped(record, map, 'maxLength')
		const format = mapped(record, map, 'format')

		const prop = {
			...base,
			title: humaniseName(title) || key,
			// A definition record separates its short `definition` from its
			// longer `description`; either may be absent, and an empty string
			// must not become the helper text "undefined".
			description: description || mapped(record, map, 'definition') || '',
		}
		// An explicitly mapped format wins over the one the type shorthand
		// implied, so a definition can say `string` + `date` and still get a
		// date picker.
		if (format) prop.format = format
		if (typeof maxLength === 'number' && maxLength > 0) prop.maxLength = maxLength
		if (Array.isArray(enumValues) && enumValues.length > 0) prop.enum = [...enumValues]
		if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
			prop.default = defaultValue
		}
		prop.order = orderFrom + index

		properties[key] = prop
		if (mapped(record, map, 'required') === true) required.push(key)
	})

	return { properties, required }
}

/**
 * Whether a form-data key holds a dynamic field's answer.
 *
 * @param {string} key The form-data key.
 * @return {boolean} True for a dynamic key.
 */
export function isDynamicKey(key) {
	return typeof key === 'string' && key.startsWith(DYNAMIC_KEY_PREFIX)
}

/**
 * The definition id a dynamic key refers to.
 *
 * @param {string} key The dynamic form-data key.
 * @return {string} The definition id, or '' when the key is not dynamic.
 */
export function definitionIdFromKey(key) {
	return isDynamicKey(key) ? key.slice(DYNAMIC_KEY_PREFIX.length) : ''
}

/**
 * Split a submitted form payload into the object's own fields and the answers
 * that belong in the values schema.
 *
 * The parent object must be saved first — a value row references it — so the
 * two halves cannot go out in one call, and mixing them would post keys the
 * parent schema does not declare. OpenRegister drops undeclared properties
 * silently, so an unsplit payload loses every answer with a 200 and no error.
 *
 * @param {object} formData The dialog's confirmed payload.
 * @return {{base: object, answers: Array<{definitionId: string, value: *}>}} The parent's fields, and one answer per dynamic field.
 */
export function splitDynamicFormData(formData) {
	const base = {}
	const answers = []
	for (const [key, value] of Object.entries(formData || {})) {
		if (isDynamicKey(key)) {
			answers.push({ definitionId: definitionIdFromKey(key), value })
		} else {
			base[key] = value
		}
	}
	return { base, answers }
}

/**
 * Whether a declaration stores its answers as an array on the parent.
 *
 * Two shapes are supported. The default writes one child record per answer
 * (`values.schema` + `objectRef` + `definitionRef`), which is normalised and
 * queryable. Setting `values.mode: 'array'` instead folds the answers into an
 * array property on the parent object itself, which reads in one request and
 * saves in one write, at the cost of not being queryable per answer.
 *
 * @param {object} config One `x-openregister-extends-form` declaration.
 * @return {boolean} True when the declaration stores an array on the parent.
 */
export function usesArrayValues(config) {
	const values = (config && config.values) || null
	return !!(values && values.mode === 'array' && values.arrayKey)
}

/**
 * Build the array a declaration stores on its parent object.
 *
 * Each entry carries the definition it answers as well as its name, so a
 * reader can render the answers without resolving every definition first.
 * That denormalisation is the point of the array shape: one read, no joins.
 *
 * @param {Array<object>} answers `{ definitionId, value }` entries.
 * @param {object} config One `x-openregister-extends-form` declaration.
 * @param {Array<object>} definitions The definition records, for their names.
 * @return {Array<object>} Entries for the parent's array property.
 */
export function valueArrayFor(answers, config, definitions = []) {
	if (!usesArrayValues(config)) return []
	const values = config.values
	const definitionRef = values.definitionRef || 'definition'
	const valueKey = values.valueKey || 'value'
	const nameKey = values.nameKey || 'name'
	const nameFrom = (config.map && config.map.title) || 'name'
	const byId = new Map((definitions || []).map((d) => [String(d.id ?? d.uuid ?? ''), d]))

	return (answers || [])
		.filter(({ value }) => value !== undefined && value !== null && value !== '')
		.map(({ definitionId, value }) => {
			const def = byId.get(String(definitionId))
			return {
				[definitionRef]: definitionId,
				[nameKey]: def ? String(def[nameFrom] ?? '') : '',
				// Same rule as the record shape: a non-scalar answer is
				// serialised rather than dropped.
				[valueKey]: (typeof value === 'object') ? JSON.stringify(value) : String(value),
			}
		})
}

/**
 * The value-schema records to write for one saved parent object.
 *
 * An answer left empty writes no row: an absent row and a row holding `''`
 * mean the same thing to every reader, and not writing it keeps the value
 * schema free of rows that only record that someone opened the form.
 *
 * @param {Array<{definitionId: string, value: *}>} answers The answers from `splitDynamicFormData`.
 * @param {object} config The `x-openregister-extends-form` block (needs `values`).
 * @param {string} objectId The saved parent object's id.
 * @return {Array<object>} One payload per row to create; empty when nothing is to be written.
 */
export function valueRecordsFor(answers, config, objectId) {
	const values = (config && config.values) || null
	if (!values || !values.schema || !objectId) return []
	const objectRef = values.objectRef || 'object'
	const definitionRef = values.definitionRef || 'definition'
	const valueKey = values.valueKey || 'value'

	return (answers || [])
		.filter(({ value }) => value !== undefined && value !== null && value !== '')
		.map(({ definitionId, value }) => ({
			[objectRef]: objectId,
			[definitionRef]: definitionId,
			// A value schema stores one column for every type it carries, so a
			// non-scalar answer is serialised rather than dropped.
			[valueKey]: (typeof value === 'object') ? JSON.stringify(value) : String(value),
		}))
}
