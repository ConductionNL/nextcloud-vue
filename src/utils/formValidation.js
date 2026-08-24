/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * formValidation — pure per-field validation helper for manifest-driven
 * `type: "form"` pages (manifest-form-logic).
 *
 * Implements the `fields[].validation` semantics documented in
 * `openspec/changes/manifest-form-logic/specs/manifest-form-logic/spec.md`
 * (REQ-MFL-8): a closed `{ required, min, max, pattern, message }` shape
 * with per-`field.type` semantics —
 *
 *  | field.type       | `required` passes when      | `min`/`max` bound | `pattern` |
 *  |------------------|------------------------------|--------------------|-----------|
 *  | string, password | non-empty after trim         | string LENGTH      | tested against the value |
 *  | number           | value is a finite number     | numeric VALUE      | not applicable |
 *  | boolean          | value is `true`               | not applicable     | not applicable |
 *  | enum             | a value is selected           | not applicable     | not applicable |
 *  | json             | value is non-null             | not applicable     | not applicable |
 *
 * `validation.message` — when set — replaces the built-in default message
 * for WHICHEVER rule fails, and is run through the caller-supplied
 * `translate` argument (mirrors how `CnFormPage` resolves `field.label`
 * via its `translate` prop). Built-in default messages are translated via
 * the library's own `t('nextcloud-vue', …)` English msgids, independent of
 * the caller's `translate` function.
 *
 * Pure and side-effect free: no component imports, no DOM access — usable
 * directly from Buildiq's `form-editor-logic` preview and from Jest.
 *
 * @module utils/formValidation
 */
import { translate as ncTranslate } from '@nextcloud/l10n'

/**
 * Whether `required` passes for the given field type + value.
 *
 * @param {string} type `field.type`.
 * @param {*} value Current value.
 * @return {boolean} True when the required constraint is satisfied.
 */
function passesRequired(type, value) {
	if (type === 'string' || type === 'password') {
		return typeof value === 'string' && value.trim().length > 0
	}
	if (type === 'number') {
		return typeof value === 'number' && Number.isFinite(value)
	}
	if (type === 'boolean') {
		return value === true
	}
	if (type === 'enum') {
		return value !== null && value !== undefined && value !== ''
	}
	if (type === 'json') {
		return value !== null && value !== undefined
	}
	// Unknown type — fall back to a generic non-empty check.
	return value !== null && value !== undefined && value !== ''
}

/**
 * Whether the value counts as "no input yet" for the purposes of skipping
 * min/max/pattern checks on an OPTIONAL (non-required) field. A field the
 * user has not touched shouldn't fail a length/pattern rule it never had
 * the chance to satisfy; `required` (checked first) is what enforces
 * presence.
 *
 * @param {string} type `field.type`.
 * @param {*} value Current value.
 * @return {boolean}
 */
function isEmptyValue(type, value) {
	if (type === 'number') return value === null || value === undefined || value === ''
	return value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)
}

/**
 * Validate a single field's current value against its `validation` shape.
 *
 * @param {object} field The formField shape (`{ key, type, validation? }`).
 * @param {*} value The current field value.
 * @param {Function} [translate] Optional single-arg translator applied to
 *   `validation.message` (mirrors how `field.label` is resolved by the
 *   page's `translate` prop). Defaults to identity.
 * @return {string|null} The failure message, or `null` when the value is valid.
 */
export function validateFieldValue(field, value, translate) {
	if (!field || typeof field !== 'object') return null
	const validation = field.validation
	if (!validation || typeof validation !== 'object') return null

	const type = field.type
	const tr = typeof translate === 'function' ? translate : (key) => key
	const customMessage = typeof validation.message === 'string' && validation.message.length > 0
		? tr(validation.message)
		: null

	// 1. required
	if (validation.required && !passesRequired(type, value)) {
		return customMessage || ncTranslate('nextcloud-vue', 'This field is required')
	}

	// 2. min / max — string/password bound LENGTH, number bounds VALUE.
	//    Skipped entirely on an empty, non-required value (nothing to bound).
	const boundsApplicable = type === 'string' || type === 'password' || type === 'number'
	if (boundsApplicable && !isEmptyValue(type, value)) {
		const hasMin = typeof validation.min === 'number'
		const hasMax = typeof validation.max === 'number'
		if (hasMin || hasMax) {
			const measured = type === 'number' ? Number(value) : String(value).length
			const belowMin = hasMin && measured < validation.min
			const aboveMax = hasMax && measured > validation.max
			if (belowMin || aboveMax) {
				if (customMessage) return customMessage
				if (type === 'number') {
					if (hasMin && hasMax) return ncTranslate('nextcloud-vue', 'Must be between {min} and {max}', { min: validation.min, max: validation.max })
					if (belowMin) return ncTranslate('nextcloud-vue', 'Must be at least {min}', { min: validation.min })
					return ncTranslate('nextcloud-vue', 'Must be at most {max}', { max: validation.max })
				}
				if (hasMin && hasMax) return ncTranslate('nextcloud-vue', 'Must be between {min} and {max} characters', { min: validation.min, max: validation.max })
				if (belowMin) return ncTranslate('nextcloud-vue', 'Must be at least {min} characters', { min: validation.min })
				return ncTranslate('nextcloud-vue', 'Must be at most {max} characters', { max: validation.max })
			}
		}
	}

	// 3. pattern — string/password only.
	if ((type === 'string' || type === 'password') && typeof validation.pattern === 'string' && !isEmptyValue(type, value)) {
		let matches = true
		try {
			matches = new RegExp(validation.pattern).test(String(value))
		} catch (e) {
			// An uncompilable pattern is a schema-authoring error caught by
			// validateManifestV2() post-schema — never block the end user here.
			matches = true
		}
		if (!matches) {
			return customMessage || ncTranslate('nextcloud-vue', 'Invalid format')
		}
	}

	return null
}

export default validateFieldValue
