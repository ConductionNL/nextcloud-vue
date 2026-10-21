/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An object action's inputs, declared as a JSON Schema object, turned into the
 * declared-input list `CnTransitionInputFields` draws. The input schema itself
 * is the schema the fields resolve against, so `title`, `description`,
 * `type`, `format`, `maxLength` and the `x-openregister-*` pickers work in an
 * action dialog as they do in a form.
 *
 * @module utils/objectActionInputs
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-inputs-are-asked-in-a-dialog-built-from-their-json-schema
 */

import { humaniseKey } from './humaniseKey.js'
import { resolveLocalised } from './notificationRuleLabel.js'
import { readPath } from './readPath.js'

/**
 * The properties of an input schema, or an empty map.
 *
 * @param {object|null} schema The input schema.
 * @return {object}
 */
function propertiesOf(schema) {
	const properties = schema && typeof schema === 'object' ? schema.properties : null
	return properties && typeof properties === 'object' && !Array.isArray(properties) ? properties : {}
}

/**
 * The choices a property declares: `enum` labelled by `x-enum-labels` (or
 * `enumLabels`), or `oneOf` / `anyOf` entries with `const` and `title`.
 * Null when it declares none.
 *
 * @param {object} prop The property schema.
 * @param {string} language The reader's language.
 * @return {Array<{value: string, label: string}>|null}
 */
function choicesOf(prop, language) {
	if (Array.isArray(prop.enum) && prop.enum.length > 0) {
		const labels = prop['x-enum-labels'] || prop.enumLabels || {}
		return prop.enum
			.filter((value) => typeof value === 'string' || typeof value === 'number')
			.map((value) => ({ value: String(value), label: resolveLocalised(labels[value], language) || String(value) }))
	}
	const variants = Array.isArray(prop.oneOf) ? prop.oneOf : (Array.isArray(prop.anyOf) ? prop.anyOf : null)
	if (variants && variants.every((variant) => variant && Object.hasOwn(variant, 'const'))) {
		return variants.map((variant) => ({
			value: String(variant.const),
			label: resolveLocalised(variant.title, language) || String(variant.const),
		}))
	}
	return null
}

/**
 * The declared inputs `CnTransitionInputFields` reads, one per property in
 * declaration order. A property marked `readOnly` or `x-hidden` is not asked.
 *
 * @param {object|null} schema The action's `inputs` (JSON Schema object).
 * @param {object} [options] Options.
 * @param {string} [options.language] The reader's language, for per-locale titles.
 * @return {Array<object>} `[{ field, required, label, description?, options?, widget? }]`.
 */
export function objectActionInputs(schema, { language = 'en' } = {}) {
	const required = Array.isArray(schema?.required) ? schema.required : []
	return Object.entries(propertiesOf(schema))
		.filter(([, prop]) => prop && typeof prop === 'object' && prop.readOnly !== true && prop['x-hidden'] !== true)
		.map(([field, prop]) => {
			const input = {
				field,
				required: required.includes(field),
				label: resolveLocalised(prop.title, language) || humaniseKey(field) || field,
			}
			const description = resolveLocalised(prop.description, language)
			if (description !== '') {
				input.description = description
			}
			const choices = choicesOf(prop, language)
			if (choices) {
				input.options = choices
			} else if (prop.writeOnly === true) {
				input.widget = 'password'
			} else if (prop.format === 'date') {
				input.widget = 'date'
			}
			return input
		})
}

/**
 * Today as `YYYY-MM-DD` in the reader's time zone.
 *
 * @param {Date} now What counts as now.
 * @return {string}
 */
function localDate(now) {
	const pad = (value) => String(value).padStart(2, '0')
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * One property's default as the dialog shows it. `@now` is today (a date) or
 * this moment (anything else), `@user` the person, `@object.<path>` the
 * object's value. Anything else is the literal default.
 *
 * @param {object} prop The property schema.
 * @param {object} context What the default reads.
 * @param {object|null} context.object The object.
 * @param {string} context.user The person's user id.
 * @param {Date} context.now What counts as now.
 * @return {unknown} The value, or undefined when there is no default.
 */
function resolvedDefault(prop, { object, user, now }) {
	const value = prop.default
	if (typeof value !== 'string') {
		return value
	}
	if (value === '@now') {
		return prop.format === 'date' ? localDate(now) : now.toISOString()
	}
	if (value === '@user') {
		return user || undefined
	}
	if (value.startsWith('@object.')) {
		const found = object ? readPath(object, value.slice(8)) : undefined
		return found === null ? undefined : found
	}
	return value
}

/**
 * The values a dialog starts from: each property's default, resolved, else
 * false for a boolean and '' otherwise. An `@object` or `@user` default that
 * cannot be resolved here starts empty, and an empty optional input is not
 * sent, so the server resolves it.
 *
 * @param {object|null} schema The action's `inputs`.
 * @param {object} [context] What the defaults read.
 * @param {object|null} [context.object] The object the action runs on.
 * @param {string} [context.user] The person's user id.
 * @param {Date} [context.now] What counts as now.
 * @return {object} The values, keyed by input.
 */
export function objectActionDefaults(schema, { object = null, user = '', now = new Date() } = {}) {
	const values = {}
	for (const [field, prop] of Object.entries(propertiesOf(schema))) {
		if (!prop || typeof prop !== 'object' || prop.readOnly === true || prop['x-hidden'] === true) {
			continue
		}
		const value = resolvedDefault(prop, { object, user, now })
		if (value !== undefined) {
			values[field] = value
		} else {
			values[field] = prop.type === 'boolean' ? false : ''
		}
	}
	return values
}
