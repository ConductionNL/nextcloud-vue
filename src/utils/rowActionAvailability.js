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
 * The OpenRegister permission verb that also permits each built-in row action.
 * OpenRegister's `@self.actions` lists verbs (`read`, `update`, `delete`, ...),
 * not built-in ids. Copy needs the source readable; OpenRegister checks the
 * schema-level `create` when the copy is saved.
 *
 * @type {Readonly<Record<string, string>>}
 */
const BUILTIN_ACTION_VERBS = Object.freeze({
	view: 'read',
	edit: 'update',
	copy: 'read',
	delete: 'delete',
})

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
 * The permission verb that also permits a built-in row action. Only an action
 * marked `builtin: true` has one; an app action that happens to use the id
 * `edit` matches by its id alone.
 *
 * @param {object} action A declared action.
 * @return {string} The verb, or ''.
 */
function governingVerbOf(action) {
	if (!action || action.builtin !== true) {
		return ''
	}
	const id = actionIdOf(action)
	return Object.hasOwn(BUILTIN_ACTION_VERBS, id) ? BUILTIN_ACTION_VERBS[id] : ''
}

/**
 * Whether the block allows an action: by its own id, or, for a built-in, by its
 * governing verb.
 *
 * @param {object} action A declared action.
 * @param {Set<string>} allowed The ids and verbs the block allows.
 * @return {boolean} True when allowed.
 */
function isAllowedBy(action, allowed) {
	const verb = governingVerbOf(action)
	return allowed.has(actionIdOf(action)) || (verb !== '' && allowed.has(verb))
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
 * A built-in answers to its own id and to its governing verb. Allowed by
 * either, it has no reason. Refused, the reason on its own id wins over the
 * reason on the verb, being the more specific answer.
 *
 * @param {object} action A declared action.
 * @param {object} row The row.
 * @param {string} [field] The dotted path to the availability block.
 * @return {string} The reason, or ''.
 */
export function refusalReasonFor(action, row, field = DEFAULT_ROW_ACTION_FIELD) {
	const { allowed, reasons } = readRowAvailability(row, field)
	const id = actionIdOf(action)
	const verb = governingVerbOf(action)
	if (verb === '') {
		return reasons.get(id) || ''
	}
	if (isAllowedBy(action, allowed)) {
		return ''
	}
	return reasons.get(id) || reasons.get(verb) || ''
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
 * An action matches the block by its id. A built-in (`builtin: true`) also
 * matches by the OpenRegister verb that governs it: `read` for View and Copy,
 * `update` for Edit, `delete` for Delete.
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
	return declared.filter((action) => isAllowedBy(action, allowed))
}

/**
 * The actions the server allowed on a row that the page does not declare.
 * Nothing renders them: the list exists so a page can see what it is ignoring
 * without the menu growing a button nobody wrote. A verb that governs a
 * declared built-in counts as declared.
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
	const declared = new Set()
	for (const action of (Array.isArray(actions) ? actions : [])) {
		declared.add(actionIdOf(action))
		const verb = governingVerbOf(action)
		if (verb !== '') {
			declared.add(verb)
		}
	}
	return [...allowed].filter((id) => !declared.has(id)).sort()
}

/**
 * Drop the built-in View from a row's menu when the row itself opens the
 * record's detail page: viewing is what a click on the row already does, so
 * the menu offers Edit instead and not a second way to view.
 *
 * Only the built-in View goes (`builtin: true`, id `view`). An action the page
 * declared itself ("Open case", a link to somewhere else) is the page's
 * decision and stays. A row with no detail page keeps View.
 *
 * @param {Array<object>} actions The row's actions, in order.
 * @param {boolean} rowOpensDetail Whether a click on THIS row navigates to its detail page.
 * @return {Array<object>} The actions without the built-in View, or the same list.
 */
export function withoutViewWhenRowOpensDetail(actions, rowOpensDetail) {
	if (!rowOpensDetail || !Array.isArray(actions)) {
		return actions
	}
	return actions.filter((action) => !(action && action.builtin === true && action.id === 'view'))
}
