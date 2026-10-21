/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The default operators of a condition per field type. The values travel to
 * the app's endpoint unchanged; the labels are the reader's.
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The comparison operators of a number.
 *
 * @return {Array<{value: string, label: string}>}
 */
function numberOperators() {
	return [
		{ value: 'equals', label: t('nextcloud-vue', 'Equals') },
		{ value: 'notEquals', label: t('nextcloud-vue', 'Not equals') },
		{ value: 'greaterThan', label: t('nextcloud-vue', 'Greater than') },
		{ value: 'greaterThanOrEqual', label: t('nextcloud-vue', 'Greater than or equal') },
		{ value: 'lessThan', label: t('nextcloud-vue', 'Less than') },
		{ value: 'lessThanOrEqual', label: t('nextcloud-vue', 'Less than or equal') },
	]
}

/**
 * The default operators per field type.
 *
 * @return {Record<string, Array<{value: string, label: string}>>}
 */
export function defaultOperators() {
	return {
		string: [
			{ value: 'equals', label: t('nextcloud-vue', 'Equals') },
			{ value: 'notEquals', label: t('nextcloud-vue', 'Not equals') },
			{ value: 'contains', label: t('nextcloud-vue', 'Contains') },
		],
		integer: numberOperators(),
		number: numberOperators(),
		boolean: [
			{ value: 'equals', label: t('nextcloud-vue', 'Is') },
			{ value: 'notEquals', label: t('nextcloud-vue', 'Is not') },
		],
		array: [{ value: 'contains', label: t('nextcloud-vue', 'Contains') }],
	}
}

/**
 * The extra operators of a date field.
 *
 * @return {Array<{value: string, label: string}>}
 */
export function dateOperators() {
	return [
		{ value: 'before', label: t('nextcloud-vue', 'Before') },
		{ value: 'after', label: t('nextcloud-vue', 'After') },
	]
}

/**
 * The operators of a field type: the app's own for that type when it names
 * them, else the defaults, else the text operators.
 *
 * @param {string} type The field type.
 * @param {object|null} [overrides] Operators per type from the app.
 * @return {Array<{value: string, label: string}>}
 */
export function operatorsFor(type, overrides) {
	if (overrides && Array.isArray(overrides[type])) {
		return overrides[type].map((o) => ({ ...o }))
	}
	const defaults = defaultOperators()
	return (defaults[type] || defaults.string).map((o) => ({ ...o }))
}
