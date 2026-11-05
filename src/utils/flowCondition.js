/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Readable text for the JSONLogic that routes a flow.
 *
 * The engine evaluates a condition on one of a node's `exits`, and an edge
 * names its exit in `fromExit`; `condition` on the edge itself is read as well
 * because documents carry it. The JSONLogic stays where it is: this module only
 * says it in words.
 */

/**
 * @param {unknown} value A candidate condition.
 * @return {boolean} Whether it is a non-empty JSONLogic object.
 */
function isLogic(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
}

/**
 * @param {unknown} operand A `{ var }` operand or a plain value.
 * @return {string|null} The field it reads, without the item's `json.` prefix, or null.
 */
function fieldOf(operand) {
	if (operand === null || typeof operand !== 'object' || !('var' in operand)) {
		return null
	}
	const path = Array.isArray(operand.var) ? operand.var[0] : operand.var

	return String(path ?? '').replace(/^json\./, '')
}

/**
 * @param {unknown} value A literal operand.
 * @return {string} It as text.
 */
function literal(value) {
	return Array.isArray(value) ? value.map(literal).join(', ') : String(value ?? '')
}

const comparisons = {
	'==': (parts) => t('nextcloud-vue', '{field} is {value}', parts),
	'===': (parts) => t('nextcloud-vue', '{field} is {value}', parts),
	'!=': (parts) => t('nextcloud-vue', '{field} is not {value}', parts),
	'!==': (parts) => t('nextcloud-vue', '{field} is not {value}', parts),
	'>': (parts) => t('nextcloud-vue', '{field} is more than {value}', parts),
	'>=': (parts) => t('nextcloud-vue', '{field} is at least {value}', parts),
	'<': (parts) => t('nextcloud-vue', '{field} is less than {value}', parts),
	'<=': (parts) => t('nextcloud-vue', '{field} is at most {value}', parts),
	in: (parts) => t('nextcloud-vue', '{field} is one of {value}', parts),
}

const presence = {
	'!!': (field) => t('nextcloud-vue', '{field} is filled in', { field }),
	'!': (field) => t('nextcloud-vue', '{field} is empty', { field }),
}

/**
 * @param {string} op A comparison operator.
 * @param {Array} args Its operands.
 * @return {string|null} The sentence, or null when neither side is a plain field and value.
 */
function compare(op, args) {
	const field = fieldOf(args[0])
	if (field === null || fieldOf(args[1]) !== null) {
		return null
	}

	return comparisons[op]({ field, value: literal(args[1]) })
}

/**
 * @param {string} op `and` or `or`.
 * @param {Array} args The joined conditions.
 * @return {string|null} The sentence, or null when one part has no words.
 */
function join(op, args) {
	const parts = args.map((part) => {
		const text = sentence(part)
		const nested = isLogic(part) && ('and' in part || 'or' in part) && args.length > 1
		return text !== null && nested ? `(${text})` : text
	})
	if (parts.length === 0 || parts.includes(null)) {
		return null
	}

	return parts.join(op === 'and' ? ` ${t('nextcloud-vue', 'and')} ` : ` ${t('nextcloud-vue', 'or')} `)
}

/**
 * @param {unknown} logic A JSONLogic expression.
 * @return {string|null} It in words, or null when it has none.
 */
function sentence(logic) {
	if (!isLogic(logic)) {
		return null
	}
	const [op] = Object.keys(logic)
	const args = [].concat(logic[op])
	if (op === 'and' || op === 'or') {
		return join(op, args)
	}
	if (comparisons[op]) {
		return compare(op, args)
	}
	const field = presence[op] ? fieldOf(args[0]) : null

	return field === null ? null : presence[op](field)
}

/**
 * A JSONLogic condition in words.
 *
 * @param {object|null} logic The condition.
 * @return {string} The sentence, a fixed line when it cannot be put in words, or '' without a condition.
 */
export function flowConditionText(logic) {
	if (!isLogic(logic)) {
		return ''
	}

	return sentence(logic) ?? t('nextcloud-vue', 'A custom condition')
}

/**
 * @param {object} edge The stored edge.
 * @param {object|null} source The node the edge leaves.
 * @return {object|null} The exit the edge leaves through, if the node declares it.
 */
function exitOf(edge, source) {
	const exits = Array.isArray(source?.exits) ? source.exits : []

	return exits.find((exit) => exit && exit.id === edge?.fromExit) || null
}

/**
 * The JSONLogic that decides whether a line is taken.
 *
 * @param {object} edge The stored edge.
 * @param {object|null} source The node the edge leaves.
 * @return {object|null} The condition, or null.
 */
export function flowEdgeCondition(edge, source) {
	if (isLogic(edge?.condition)) {
		return edge.condition
	}
	const exit = exitOf(edge, source)

	return isLogic(exit?.condition) ? exit.condition : null
}

/**
 * When a line is taken, in words: its condition, or "Otherwise" on the exit
 * without a condition beside exits that have one.
 *
 * @param {object} edge The stored edge.
 * @param {object|null} source The node the edge leaves.
 * @return {string} The text, or '' for a line that is simply followed.
 */
export function flowEdgeConditionText(edge, source) {
	const logic = flowEdgeCondition(edge, source)
	if (logic !== null) {
		return flowConditionText(logic)
	}
	const branches = exitOf(edge, source) !== null && source.exits.some((exit) => isLogic(exit?.condition))

	return branches ? t('nextcloud-vue', 'Otherwise') : ''
}
