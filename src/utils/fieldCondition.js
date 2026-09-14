/**
 * @copyright Copyright (c) 2026 Conduction B.V. <info@conduction.nl>
 * @license EUPL-1.2
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * Evaluate a per-field `condition` (a.k.a. `visibleWhen`) descriptor against
 * the current form-data object.
 *
 * Supported predicates (the `condition` object on a field):
 *
 * | Shape                                | Passes when …                                  |
 * |--------------------------------------|------------------------------------------------|
 * | `{ field, equals: <scalar> }`        | `formData[field] === equals`                   |
 * | `{ field, notEquals: <scalar> }`     | `formData[field] !== notEquals`                |
 * | `{ field, in: [<scalar>, …] }`       | `in` array contains `formData[field]`          |
 * | `{ field, notIn: [<scalar>, …] }`    | `notIn` array does NOT contain `formData[field]` |
 * | `{ field, truthy: true }`            | `Boolean(formData[field]) === true`            |
 * | `{ field, falsy: true }`             | `Boolean(formData[field]) === false`           |
 *
 * Defensive defaults:
 * - No `condition` on the field → return `true` (visible by default).
 * - `condition` is not a plain object → log warning + return `true`.
 * - `condition.field` is missing or not a string → log warning + return `true`.
 * - Unknown predicate (none of equals/notEquals/in/notIn/truthy/falsy is
 *   present) → log warning + return `true`. Keeping the field visible is
 *   safer than silently hiding a user-facing input.
 *
 * Only the first recognised predicate is evaluated; mixing multiple
 * predicates on a single condition is unsupported (use multiple fields or
 * compose conditions at the call site).
 *
 * @param {object} field A resolved CnFormDialog field descriptor (may carry `condition` / `visibleWhen`).
 * @param {object} formData The current form-data keyed by field key.
 * @return {boolean} `true` when the field should be visible.
 */
export function shouldShow(field, formData) {
	if (!field || typeof field !== 'object') {
		return true
	}

	// Accept either `condition` (preferred) or `visibleWhen` (alias from the issue).
	const condition = field.condition || field.visibleWhen
	if (condition === undefined || condition === null) {
		return true
	}

	if (typeof condition !== 'object' || Array.isArray(condition)) {
		// eslint-disable-next-line no-console -- manifest-authoring mistake surfaced to the developer console
		console.warn(`CnFormDialog: field "${field.key}" condition must be an object, got ${typeof condition}`)
		return true
	}

	if (typeof condition.field !== 'string' || condition.field.length === 0) {
		// eslint-disable-next-line no-console -- manifest-authoring mistake surfaced to the developer console
		console.warn(`CnFormDialog: field "${field.key}" condition is missing a "field" reference`)
		return true
	}

	const data = formData && typeof formData === 'object' ? formData : {}
	const value = data[condition.field]

	if (Object.hasOwn(condition, 'equals')) {
		return value === condition.equals
	}
	if (Object.hasOwn(condition, 'notEquals')) {
		return value !== condition.notEquals
	}
	if (Object.hasOwn(condition, 'in')) {
		return Array.isArray(condition.in) && condition.in.includes(value)
	}
	if (Object.hasOwn(condition, 'notIn')) {
		return Array.isArray(condition.notIn) && !condition.notIn.includes(value)
	}
	if (Object.hasOwn(condition, 'truthy')) {
		return Boolean(value) === Boolean(condition.truthy)
	}
	if (Object.hasOwn(condition, 'falsy')) {
		return Boolean(value) === !condition.falsy
	}

	// eslint-disable-next-line no-console -- manifest-authoring mistake surfaced to the developer console
	console.warn(`CnFormDialog: field "${field.key}" condition has no recognised predicate (equals/notEquals/in/notIn/truthy/falsy); keeping field visible`)
	return true
}
