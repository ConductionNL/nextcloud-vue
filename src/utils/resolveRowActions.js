/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The built-in row action ids, in their default order.
 *
 * @type {ReadonlyArray<string>}
 */
export const BUILTIN_ROW_ACTION_IDS = Object.freeze(['view', 'edit', 'copy', 'delete'])

/**
 * The prefix that marks a row action entry as a placeholder for a built-in.
 *
 * @type {string}
 */
export const BUILTIN_PLACEHOLDER_PREFIX = 'builtin:'

/**
 * Whether an entry is one of the four built-in placeholders (`"builtin:view"`, `"builtin:edit"`, `"builtin:copy"`, `"builtin:delete"`).
 *
 * @param {object|string} entry A declared row action entry.
 * @return {boolean} True for a known placeholder string.
 */
export function isBuiltinPlaceholder(entry) {
	return typeof entry === 'string'
		&& entry.startsWith(BUILTIN_PLACEHOLDER_PREFIX)
		&& BUILTIN_ROW_ACTION_IDS.includes(entry.slice(BUILTIN_PLACEHOLDER_PREFIX.length))
}

/**
 * A short name for an entry in a warning message.
 *
 * @param {object} action An app action object.
 * @return {string} Its id, else its label, quoted.
 */
function describe(action) {
	const name = (typeof action.id === 'string' && action.id !== '') ? action.id : action.label
	return JSON.stringify(name === undefined ? '' : name)
}

/**
 * Resolve a page's declared row actions and its enabled built-ins into the one ordered list every row surface renders.
 *
 * - An object is an app action, whatever its `id`; a `builtin` key on it is dropped, since only real built-ins carry that marker.
 * - A placeholder (`"builtin:edit"`) puts that built-in at its position when it is enabled, and renders nothing when it is not: the toggle wins.
 * - A repeated placeholder keeps its first position.
 * - Any other entry is dropped.
 * - Enabled built-ins the entries do not place are appended in the order `builtins` gives them.
 *
 * Every dropped or questionable entry is reported in `warnings`; the caller decides whether to log them.
 *
 * @param {Array<object|string>} declared The declared entries: app action objects and placeholders.
 * @param {Array<{id: string}>} builtins The enabled built-in actions, in default order.
 * @param {object} [options] Options.
 * @param {(action: object) => object} [options.prepare] Maps an app action to the object rendered for it.
 * @return {{actions: Array<object>, warnings: Array<{code: string, message: string}>, deleteNotLast: boolean}} The ordered actions, the warnings, and whether the built-in Delete is enabled but not last.
 */
export function resolveRowActions(declared, builtins, { prepare = (action) => action } = {}) {
	const enabled = new Map()
	for (const builtin of (Array.isArray(builtins) ? builtins : [])) {
		if (builtin && typeof builtin.id === 'string') {
			enabled.set(builtin.id, builtin)
		}
	}
	const placed = new Set()
	const actions = []
	const warnings = []

	for (const entry of (Array.isArray(declared) ? declared : [])) {
		if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
			let action = entry
			if (Object.hasOwn(entry, 'builtin')) {
				const { builtin, ...rest } = entry
				action = rest
				warnings.push({
					code: 'builtin-key-ignored',
					message: `Action ${describe(entry)} sets "builtin", which only built-in actions carry; the key is ignored and the entry stays an app action.`,
				})
			}
			actions.push(prepare(action))
			continue
		}
		if (isBuiltinPlaceholder(entry)) {
			const id = entry.slice(BUILTIN_PLACEHOLDER_PREFIX.length)
			if (placed.has(id)) {
				warnings.push({
					code: 'repeated-placeholder',
					message: `"${entry}" is placed more than once; only its first position is used.`,
				})
				continue
			}
			placed.add(id)
			if (!enabled.has(id)) {
				warnings.push({
					code: 'disabled-placeholder',
					message: `"${entry}" is placed but that built-in action is turned off, so it renders nothing. Its show*Action toggle decides whether it renders.`,
				})
				continue
			}
			actions.push(enabled.get(id))
			continue
		}
		warnings.push({
			code: 'invalid-entry',
			message: `Ignoring action ${JSON.stringify(entry)}: actions must be objects with an id and a label, or one of ${BUILTIN_ROW_ACTION_IDS.map((id) => `"${BUILTIN_PLACEHOLDER_PREFIX}${id}"`).join(', ')}. To turn a built-in action on or off use the showViewAction / showEditAction / showCopyAction / showDeleteAction props.`,
		})
	}

	for (const builtin of enabled.values()) {
		if (!placed.has(builtin.id)) {
			actions.push(builtin)
		}
	}

	const deleteIndex = actions.findIndex((action) => action && action.builtin === true && action.id === 'delete')
	const deleteNotLast = deleteIndex !== -1 && deleteIndex !== actions.length - 1
	if (deleteNotLast) {
		warnings.push({
			code: 'delete-not-last',
			message: `"${BUILTIN_PLACEHOLDER_PREFIX}delete" is not the last row action; it renders before ${actions.slice(deleteIndex + 1).map((a) => (a.builtin === true ? `"${BUILTIN_PLACEHOLDER_PREFIX}${a.id}"` : describe(a))).join(', ')}. Delete is normally last.`,
		})
	}

	return { actions, warnings, deleteNotLast }
}
