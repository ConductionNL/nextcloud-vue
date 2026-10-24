/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The operators a condition can use on a field of a given type, and a
 * condition written as the words of a rule ("Bouwkosten groter is dan
 * € 100.000"). Shared by CnConditionListEditor and the apps that list rules.
 *
 * @module components/CnConditionListEditor/conditionOperators
 */

import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'

/**
 * Every operator, in the order the editor offers them.
 *
 * `present` needs no value: the field is filled in.
 *
 * @type {ReadonlyArray<string>}
 */
export const CONDITION_OPERATORS = Object.freeze(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'])

const OPERATORS_BY_TYPE = Object.freeze({
	number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'],
	integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'],
	date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'],
	boolean: ['eq'],
	presence: ['present'],
})

const DEFAULT_OPERATORS = Object.freeze(['eq', 'neq', 'present'])

/**
 * The operators that fit a field type.
 *
 * Numbers and dates compare; yes/no is only "is"; a `presence` field (a
 * document, a relation) can only be filled in; text and choices say is, is not
 * or is filled in.
 *
 * @param {string} type The field type.
 * @return {string[]} The operator ids.
 */
export function operatorsForType(type) {
	return [...(OPERATORS_BY_TYPE[type] || DEFAULT_OPERATORS)]
}

/**
 * The label of an operator in the editor's operator choice.
 *
 * @param {string} operator The operator id.
 * @return {string} The translated label.
 */
export function operatorLabel(operator) {
	switch (operator) {
		case 'eq': return t('nextcloud-vue', 'is')
		case 'neq': return t('nextcloud-vue', 'is not')
		case 'gt': return t('nextcloud-vue', 'greater than')
		case 'gte': return t('nextcloud-vue', 'at least')
		case 'lt': return t('nextcloud-vue', 'less than')
		case 'lte': return t('nextcloud-vue', 'at most')
		case 'present': return t('nextcloud-vue', 'is filled in')
		default: return String(operator || '')
	}
}

/**
 * Whether an operator needs a value.
 *
 * @param {string} operator The operator id.
 * @return {boolean} False for `present`.
 */
export function operatorTakesValue(operator) {
	return operator !== 'present'
}

/**
 * A condition's value as a reader sees it, formatted by its field.
 *
 * @param {unknown} value The stored value.
 * @param {object|undefined} field The field (`type`, `format`, `options`).
 * @return {string} The formatted value.
 */
export function formatConditionValue(value, field) {
	const type = field?.type
	if (type === 'boolean') {
		const yes = value === true || value === 'true' || value === 1 || value === '1'
		return yes ? t('nextcloud-vue', 'yes') : t('nextcloud-vue', 'no')
	}
	if (Array.isArray(field?.options)) {
		const option = field.options.find((o) => String(o?.id ?? o?.value ?? o) === String(value))
		if (option && typeof option === 'object') {
			return String(option.label ?? option.id ?? value)
		}
	}
	if ((type === 'number' || type === 'integer') && value !== '' && value !== null && !Number.isNaN(Number(value))) {
		const options = field?.format === 'currency'
			? { style: 'currency', currency: field.currency || 'EUR', maximumFractionDigits: 0 }
			: {}
		return new Intl.NumberFormat(getCanonicalLocale() || undefined, options).format(Number(value))
	}
	return String(value ?? '')
}

/**
 * A condition as the clause of a rule, after "Als" / "If".
 *
 * @param {{field: string, operator: string, value?: unknown}} condition The condition.
 * @param {Array<{id: string, label?: string, type?: string}>} fields The fields the condition may name.
 * @return {string} The translated clause, for example "Bouwkosten groter is dan € 100.000".
 */
export function conditionSentence(condition, fields = []) {
	const field = (fields || []).find((f) => f?.id === condition?.field)
	const vars = {
		field: field?.label || condition?.field || '',
		value: formatConditionValue(condition?.value, field),
	}
	switch (condition?.operator) {
		case 'neq': return t('nextcloud-vue', '{field} is not {value}', vars)
		case 'gt': return t('nextcloud-vue', '{field} is greater than {value}', vars)
		case 'gte': return t('nextcloud-vue', '{field} is at least {value}', vars)
		case 'lt': return t('nextcloud-vue', '{field} is less than {value}', vars)
		case 'lte': return t('nextcloud-vue', '{field} is at most {value}', vars)
		case 'present': return t('nextcloud-vue', '{field} is filled in', vars)
		default: return t('nextcloud-vue', '{field} is {value}', vars)
	}
}
