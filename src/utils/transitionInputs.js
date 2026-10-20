/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The declared inputs of a transition or an act, resolved into the fields a
 * form draws, the check that they are complete and the values they send.
 *
 * Shared by CnTransitionInputDialog (the inputs in their own dialog) and
 * CnTransitionInputFields (the same inputs drawn wherever a host puts them,
 * such as under the chosen card of a list of acts), so the two never decide
 * differently whether a form may be confirmed.
 *
 * @module utils/transitionInputs
 * @spec openspec/changes/dq-abstract-forms/specs/transition-inputs/spec.md
 */

import { formatDateForDisplay } from './dateDisplay.js'
import { readPath } from './readPath.js'
import { fieldsFromSchema } from './schema.js'

/**
 * The picker value of an input's "Other" entry. Never sent: see `submittedValue`.
 *
 * @type {string}
 */
export const OTHER_OPTION_VALUE = '__other'

/** Widgets an input may name outright, whatever the schema says. */
const DECLARED_WIDGETS = ['text', 'textarea', 'number', 'date', 'select', 'template']

/**
 * A non-empty trimmed string, or null.
 *
 * @param {unknown} value The value.
 * @return {string|null}
 */
function text(value) {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * The choices an input declares, as `[{ value, label }]`, or null when it
 * declares none. An option without a value is dropped, because it cannot be
 * sent; one without a label shows its value.
 *
 * @param {unknown} options The input's declared `options`.
 * @return {Array<{value: string, label: string}>|null}
 */
export function declaredOptions(options) {
	if (!Array.isArray(options)) {
		return null
	}
	const usable = options
		.filter((option) => option && typeof option === 'object'
			&& (typeof option.value === 'string' || typeof option.value === 'number')
			&& String(option.value).trim() !== '')
		.map((option) => ({
			value: String(option.value),
			label: text(option.label) || String(option.value),
		}))
	return usable.length > 0 ? usable : null
}

/**
 * The declared inputs, normalised. An input without a `field` is dropped.
 *
 * @param {unknown} declared The declared `inputs`.
 * @return {Array<object>} The inputs.
 */
export function normaliseInputs(declared) {
	if (!Array.isArray(declared)) {
		return []
	}
	return declared
		.filter((input) => input && typeof input.field === 'string' && input.field !== '')
		.map((input) => ({
			...input,
			field: input.field,
			required: input.required === true,
			picker: input.picker && typeof input.picker === 'object' ? input.picker : null,
			fields: Array.isArray(input.fields) ? input.fields.filter((f) => typeof f === 'string') : null,
			label: text(input.label),
			options: declaredOptions(input.options),
			widget: DECLARED_WIDGETS.includes(input.widget) ? input.widget : null,
			optionsSource: text(input.optionsSource),
			other: input.other && typeof input.other === 'object' && text(input.other.label) ? input.other : null,
		}))
}

/**
 * Clamp a `fieldsFromSchema()` widget to the minimal set the inputs draw.
 * Anything richer (select, user picker, …) degrades to a plain text input
 * rather than pulling a form engine in.
 *
 * @param {string} widget The resolved widget name.
 * @return {'text'|'textarea'|'number'|'checkbox'}
 */
export function clampWidget(widget) {
	if (widget === 'checkbox' || widget === 'switch') {
		return 'checkbox'
	}
	if (widget === 'textarea' || widget === 'number') {
		return widget
	}
	return 'text'
}

/**
 * The choices an `optionsSource` input reads off the context: each row's
 * `optionValue` (default `value`) and `optionLabel` (default `label`), with
 * the rows kept so `helperFrom` can read another key of the picked one.
 *
 * @param {object} input The normalised input.
 * @param {object} context What the source path is read from.
 * @return {{options: Array<{value: string, label: string}>, rows: Array<object>}}
 */
function sourcedOptions(input, context) {
	const list = readPath(context || {}, input.optionsSource)
	const valueKey = text(input.optionValue) || 'value'
	const labelKey = text(input.optionLabel) || 'label'
	const options = []
	const rows = []
	for (const row of Array.isArray(list) ? list : []) {
		const value = row && typeof row === 'object' ? row[valueKey] : row
		if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
			continue
		}
		const label = row && typeof row === 'object' ? row[labelKey] : null
		options.push({ value: String(value), label: text(label) || String(value) })
		rows.push(row)
	}
	return { options, rows }
}

/**
 * The descriptor of an object input: its sub-properties (narrowed to the
 * input's `fields` when it names them), each with its own widget. A
 * sub-field is required when the input names it in `fields` and the
 * sub-schema lists it as required, or when the whole input is required and
 * it is the only one asked.
 *
 * @param {object} input The normalised input.
 * @param {object} prop The object property's schema.
 * @return {object} The field descriptor.
 */
function objectField(input, prop) {
	const subs = fieldsFromSchema(prop, { includeReadOnly: true, ...(input.fields ? { include: input.fields } : {}) })
	const required = Array.isArray(prop.required) ? prop.required : []
	const only = subs.length === 1
	return {
		key: input.field,
		label: prop.title || input.field,
		description: prop.description || '',
		widget: 'object',
		required: input.required,
		subFields: subs.map((sub) => ({
			...sub,
			widget: clampWidget(sub.widget),
			required: (input.fields ? required.includes(sub.key) : sub.required === true) || (input.required && only),
		})),
	}
}

/**
 * The field one input resolves to before the context is applied.
 *
 * @param {object} input The normalised input.
 * @param {object} resolved The schema's fields for the declared keys.
 * @param {object} options What the field is resolved against.
 * @param {object|null} options.schema The object's JSON Schema.
 * @param {string} options.register Register the reference pickers fall back to.
 * @param {object} options.context What `optionsSource` reads.
 * @return {object} The field descriptor.
 */
function baseField(input, resolved, { schema, register, context }) {
	const field = resolved.find((f) => f.key === input.field)
	const label = input.label || (field && field.label) || input.field
	const description = text(input.description) || (field && field.description) || ''

	if (input.widget === 'template') {
		return { key: input.field, label, description, widget: 'template', required: false }
	}
	if (input.optionsSource) {
		const { options, rows } = sourcedOptions(input, context)
		return { key: input.field, label, description, widget: 'select', options, rows, required: input.required }
	}
	if (input.options) {
		return { key: input.field, label, description, widget: 'select', options: input.options, rows: [], required: input.required }
	}
	if (input.widget && input.widget !== 'select') {
		return { key: input.field, label, description, widget: input.widget, required: input.required }
	}
	const prop = (schema && schema.properties && schema.properties[input.field]) || null
	if (prop && prop.type === 'object' && prop.properties && typeof prop.properties === 'object') {
		return objectField(input, prop)
	}
	if (!field) {
		return { key: input.field, label, description, widget: 'text', required: input.required }
	}
	if (field.reference && field.reference.multiple !== true) {
		const referenceRegister = field.reference.register || register
		if (referenceRegister !== '') {
			return { ...field, label, widget: 'reference', referenceRegister, picker: input.picker, required: input.required }
		}
	}
	return { ...field, label, widget: clampWidget(field.widget), required: input.required }
}

/**
 * A date `days` whole days after `now`, or null without a positive count.
 *
 * @param {unknown} days The count.
 * @param {Date} now Today.
 * @return {Date|null}
 */
function daysAfter(days, now) {
	const count = Number.parseInt(String(days ?? ''), 10)
	if (!Number.isFinite(count) || count < 1) {
		return null
	}
	const date = new Date(now.getTime())
	date.setDate(date.getDate() + count)
	return date
}

/**
 * A date as a reader sees it: day, short month and year.
 *
 * @param {Date|string} value The date.
 * @return {string} The text, '' when not a date.
 */
function dateText(value) {
	const shown = formatDateForDisplay(value, { dateOptions: { day: 'numeric', month: 'short', year: 'numeric' } })
	return shown ? shown.text : ''
}

/**
 * Fill a preview template from the input values.
 *
 * Tokens are `{field}`, `{field|date}`, `{today|date}` and
 * `{today+field|date}` (today plus that many days). A token that resolves
 * to nothing empties the whole preview, so a half-filled sentence is never
 * shown: `{today+days|date}` says nothing until `days` is a positive whole
 * number.
 *
 * @param {string} template The template.
 * @param {object} values The input values.
 * @param {Date} [now] What counts as today.
 * @return {string} The filled text, or ''.
 */
export function fillInputTemplate(template, values, now = new Date()) {
	if (typeof template !== 'string' || template === '') {
		return ''
	}
	let empty = false
	const filled = template.replace(/\{([^{}|]+)(?:\|(date))?\}/g, (whole, expression, format) => {
		const name = expression.trim()
		let value
		if (name === 'today') {
			value = new Date(now.getTime())
		} else if (name.startsWith('today+')) {
			value = daysAfter((values || {})[name.slice(6).trim()], now)
		} else {
			value = (values || {})[name]
		}
		if (value === null || value === undefined || String(value).trim() === '') {
			empty = true
			return ''
		}
		const shown = format === 'date' ? dateText(value) : String(value)
		if (shown === '') {
			empty = true
		}
		return shown
	})
	return empty ? '' : filled
}

/**
 * The descriptors of the declared inputs, with the context applied.
 *
 * Next to what the schema says, an input may declare:
 * - `widget`: `text`, `textarea`, `number`, `date`, `select` or `template`.
 * - `optionsSource`: a dot path into `context` holding the rows to pick from,
 *   read through `optionValue` and `optionLabel`. With no rows the input is
 *   hidden and asks nothing.
 * - `other: { label, input }`: adds an "Other" entry; the input it names is
 *   only shown (and only asked) when this picker is hidden or Other is picked.
 * - `helperFrom: { input, key }`: the helper text is `key` of the row picked
 *   in that other input.
 * - `preview: { label, template, note, testid }`: a line under the input,
 *   filled by `fillInputTemplate` and shown only once it resolves.
 * - `default`: the starting value.
 * - Presentation: `labelOutside`, `id`, `note`, `wide`, `testid`, `rows`,
 *   `placeholder`.
 *
 * Every descriptor carries `hidden`; a hidden one is neither drawn nor asked.
 *
 * @param {unknown} declared The declared inputs.
 * @param {object} [options] Options.
 * @param {object|null} [options.schema] The object's JSON Schema.
 * @param {string} [options.register] Register the reference pickers fall back to.
 * @param {object} [options.context] What `optionsSource` reads.
 * @param {object} [options.values] The values so far.
 * @param {Date} [options.now] What counts as today, for previews.
 * @return {Array<object>} The descriptors.
 */
export function resolveInputFields(declared, { schema = null, register = '', context = {}, values = {}, now } = {}) {
	const inputs = normaliseInputs(declared)
	const resolved = fieldsFromSchema(schema, { include: inputs.map((input) => input.field), includeReadOnly: true })
	const fields = inputs.map((input) => ({
		...baseField(input, resolved, { schema, register, context }),
		input,
		hidden: false,
	}))

	for (const field of fields) {
		const other = field.input.other
		if (field.widget !== 'select') {
			continue
		}
		if (field.input.optionsSource && field.options.length === 0) {
			field.hidden = true
		}
		if (other) {
			field.options = [...field.options, { value: OTHER_OPTION_VALUE, label: other.label.trim() }]
			const target = fields.find((candidate) => candidate.key === other.input)
			if (target && !field.hidden && values[field.key] !== OTHER_OPTION_VALUE) {
				target.hidden = true
			}
		}
	}

	for (const field of fields) {
		const helperFrom = field.input.helperFrom
		if (helperFrom && typeof helperFrom === 'object') {
			const source = fields.find((candidate) => candidate.key === helperFrom.input)
			const picked = source && Array.isArray(source.rows) && !source.hidden
				? source.rows[source.options.findIndex((option) => option.value === String(values[source.key] ?? ''))]
				: null
			const helper = picked && typeof picked === 'object' ? picked[helperFrom.key] : null
			field.description = helper === null || helper === undefined ? field.description : String(helper)
		}
		const preview = field.input.preview
		field.previewText = preview && typeof preview === 'object'
			? fillInputTemplate(preview.template, values, now)
			: ''
	}

	return fields
}

/**
 * Whether a field holds a value: a checked switch for booleans, a non-blank
 * string otherwise.
 *
 * @param {object} field The descriptor.
 * @param {object} values The values.
 * @return {boolean}
 */
export function isInputFilled(field, values) {
	const value = (values || {})[field.key]
	if (field.widget === 'checkbox') {
		return value === true
	}
	return String(value ?? '').trim() !== ''
}

/**
 * Whether an object input's sub-field holds a value.
 *
 * @param {object} field The object descriptor.
 * @param {object} sub The sub-field descriptor.
 * @param {object} values The values.
 * @return {boolean}
 */
export function isSubInputFilled(field, sub, values) {
	const group = (values || {})[field.key]
	const value = group && typeof group === 'object' ? group[sub.key] : undefined
	return sub.widget === 'checkbox' ? value === true : String(value ?? '').trim() !== ''
}

/**
 * Whether every shown, required field is filled. "Other" counts as a pick.
 *
 * @param {Array<object>} fields The descriptors (`resolveInputFields`).
 * @param {object} values The values.
 * @return {boolean}
 */
export function inputFieldsComplete(fields, values) {
	return fields.every((field) => {
		if (field.hidden || field.widget === 'template') {
			return true
		}
		if (field.widget === 'object') {
			return field.subFields.every((sub) => !sub.required || isSubInputFilled(field, sub, values))
		}
		return !field.required || isInputFilled(field, values)
	})
}

/**
 * A picked value as it is sent: the "Other" entry becomes ''.
 *
 * @param {unknown} value The picked value.
 * @return {unknown}
 */
export function submittedValue(value) {
	return value === OTHER_OPTION_VALUE ? '' : value
}

/**
 * The values to start from: each input's `default`, else its schema default,
 * else false for a boolean and '' otherwise. An object input starts from the
 * record's present value, so the sub-fields it asks for show what is there.
 *
 * @param {unknown} declared The declared inputs.
 * @param {object|null} [schema] The object's JSON Schema.
 * @param {object|null} [currentObject] The record.
 * @return {object} The values.
 */
export function initialInputValues(declared, schema = null, currentObject = null) {
	const values = {}
	const properties = (schema && schema.properties) || {}
	for (const input of normaliseInputs(declared)) {
		const prop = properties[input.field] || {}
		if (prop.type === 'object' && prop.properties && typeof prop.properties === 'object') {
			const present = currentObject ? currentObject[input.field] : null
			values[input.field] = present && typeof present === 'object' ? { ...present } : {}
			continue
		}
		if (input.default !== undefined) {
			values[input.field] = input.default
			continue
		}
		values[input.field] = prop.default !== undefined
			? prop.default
			: (prop.type === 'boolean' ? false : '')
	}
	return values
}

/**
 * The text a chosen template puts into its `applyTo` input: the template's
 * `body`, else `presets.body`. It never writes over what was already typed,
 * because text lost to a template cannot be got back.
 *
 * @param {object} values The values.
 * @param {string} target The input the template fills.
 * @param {object|null} option The chosen template.
 * @return {object} The new values, or the same object when nothing changes.
 */
export function applyTemplateText(values, target, option) {
	const body = option ? (option.body || (option.presets && option.presets.body) || '') : ''
	if (!target || typeof body !== 'string' || body === '' || String((values || {})[target] ?? '').trim() !== '') {
		return values
	}
	return { ...values, [target]: body }
}

/**
 * Read a host's values against the declared inputs: whether every shown,
 * required input is filled, and the values to send for the inputs that are
 * asked now. A hidden input and a template are left out, a picked "Other"
 * is sent as '' and a number input as a number. An object input is sent as
 * it stands (CnTransitionInputDialog merges it over the record).
 *
 * @param {unknown} declared The declared inputs.
 * @param {object} values The values, keyed by field.
 * @param {object} [options] `{ schema, register, context, now }`, as for `resolveInputFields`.
 * @return {{complete: boolean, data: object}}
 * @spec openspec/changes/dq-abstract-forms/specs/transition-inputs/spec.md
 */
export function readTransitionInputs(declared, values, options = {}) {
	const current = values || {}
	const fields = resolveInputFields(declared, { ...options, values: current })
	const data = {}
	for (const field of fields) {
		if (field.hidden || field.widget === 'template') {
			continue
		}
		let value = submittedValue(current[field.key])
		if (field.widget === 'number' && String(value ?? '').trim() !== '' && !Number.isNaN(Number(value))) {
			value = Number(value)
		}
		data[field.key] = value
	}
	return { complete: inputFieldsComplete(fields, current), data }
}
