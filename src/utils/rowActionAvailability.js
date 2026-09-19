/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Where a row carries the actions the server says this caller may run on it.
 * A dotted path, read off the row the list already fetched, so ninety rows
 * cost one request rather than ninety.
 *
 * @type {string}
 */
export const DEFAULT_ROW_ACTION_FIELD = '@self.actions'

/**
 * Read a dotted path off an object without throwing on a missing segment.
 *
 * @param {object} row The row.
 * @param {string} path A dotted path.
 * @return {(Array|object|string|number|boolean|undefined)} The value, or undefined.
 */
function atPath(row, path) {
	if (!row || typeof path !== 'string' || path === '') {
		return undefined
	}
	return path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), row)
}

/**
 * The id an action is known by on both sides: the page declares it and the
 * server answers about it. Falls back to the label so a page that never gave
 * its actions ids is not silently emptied.
 *
 * @param {object} action A declared action.
 * @return {string} The action id.
 */
export function actionIdOf(action) {
	if (!action || typeof action !== 'object') {
		return ''
	}
	if (typeof action.id === 'string' && action.id !== '') {
		return action.id
	}
	return typeof action.label === 'string' ? action.label : ''
}

/**
 * Read the availability block a row carries.
 *
 * Three shapes are accepted, because three are already in the wild: a list of
 * ids the caller may run, a map of id to boolean, and a map of id to
 * `{ allowed, reason }`. A row carrying none of them returns `known: false`,
 * which means "this server does not answer about actions", not "no action is
 * allowed". Refusing everything on silence would empty every menu on every
 * list that has not adopted this yet.
 *
 * @param {object} row The row.
 * @param {string} [field] The dotted path to the availability block.
 * @return {{known: boolean, allowed: Set<string>, reasons: Map<string, string>}}
 */
export function readRowAvailability(row, field = DEFAULT_ROW_ACTION_FIELD) {
	const block = atPath(row, field)
	const allowed = new Set()
	const reasons = new Map()

	if (Array.isArray(block)) {
		block.forEach((entry) => {
			if (typeof entry === 'string' && entry !== '') {
				allowed.add(entry)
				return
			}
			const id = actionIdOf(entry)
			if (id === '') {
				return
			}
			if (entry.allowed === false) {
				if (typeof entry.reason === 'string') {
					reasons.set(id, entry.reason)
				}
				return
			}
			allowed.add(id)
		})
		return { known: true, allowed, reasons }
	}

	if (block && typeof block === 'object') {
		Object.entries(block).forEach(([id, value]) => {
			if (value === true) {
				allowed.add(id)
				return
			}
			if (value && typeof value === 'object') {
				if (value.allowed !== false) {
					allowed.add(id)
				} else if (typeof value.reason === 'string') {
					reasons.set(id, value.reason)
				}
			}
		})
		return { known: true, allowed, reasons }
	}

	return { known: false, allowed, reasons }
}

/**
 * The refusal reason the server gave for an action on a row, if it gave one.
 *
 * @param {object} action A declared action.
 * @param {object} row The row.
 * @param {string} [field] The dotted path to the availability block.
 * @return {string} The reason, or ''.
 */
export function refusalReasonFor(action, row, field = DEFAULT_ROW_ACTION_FIELD) {
	const { reasons } = readRowAvailability(row, field)
	return reasons.get(actionIdOf(action)) || ''
}

/**
 * Narrow a page's declared row actions to the ones the server says this caller
 * may run on this row.
 *
 * Two declarations meet here and they decide different things:
 *
 * - The SERVER decides MEMBERSHIP, together with the page. A row's menu is the
 *   INTERSECTION of the two. An action the server allows but the page has
 *   stopped declaring stays out: the row cannot bring back a button the page
 *   removed. An action the page declares but the server refuses stays out too,
 *   with its reason kept for a caller that asks.
 * - The PAGE decides PRESENTATION: the order, label, icon and destructive
 *   styling of what is left are the page's, never the server's.
 *
 * A row that carries no availability at all is a server that does not answer
 * about actions, and the page's declaration stands unchanged.
 *
 * @param {Array<object>} actions The page's declared row actions, in order.
 * @param {object} row The row.
 * @param {string} [field] The dotted path to the availability block.
 * @return {Array<object>} The actions this row offers, in the page's order.
 */
export function availableRowActions(actions, row, field = DEFAULT_ROW_ACTION_FIELD) {
	const declared = Array.isArray(actions) ? actions : []
	const { known, allowed } = readRowAvailability(row, field)
	if (!known) {
		return declared
	}
	return declared.filter((action) => allowed.has(actionIdOf(action)))
}

/**
 * The actions the server allowed on a row that the page does not declare.
 * Nothing renders them: the list exists so a page can see what it is ignoring
 * without the menu growing a button nobody wrote.
 *
 * @param {Array<object>} actions The page's declared row actions.
 * @param {object} row The row.
 * @param {string} [field] The dotted path to the availability block.
 * @return {string[]} The undeclared action ids, sorted.
 */
export function undeclaredRowActions(actions, row, field = DEFAULT_ROW_ACTION_FIELD) {
	const { known, allowed } = readRowAvailability(row, field)
	if (!known) {
		return []
	}
	const declared = new Set((Array.isArray(actions) ? actions : []).map(actionIdOf))
	return [...allowed].filter((id) => !declared.has(id)).sort()
}
