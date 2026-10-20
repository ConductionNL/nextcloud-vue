/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The plan rows of OpenRegister's case layer as a tree, and the moves a
 * user may ask for on one item. The moves are advisory: OpenRegister decides.
 *
 * @module utils/planTree
 */

/** Plan item states after which nothing more can happen. */
export const TERMINAL_STATES = ['completed', 'terminated', 'disabled']

/**
 * The plan rows as a tree: stages with their items, each level by position.
 *
 * @param {Array<object>} items The plan rows (`id`, `parentItemId`, `position`).
 * @return {Array<object>} The roots, each with `children`.
 */
export function planTree(items) {
	const rows = Array.isArray(items) ? items : []
	const byId = new Map(rows.map((row) => [row.id, { ...row, children: [] }]))
	const roots = []
	for (const row of rows) {
		const node = byId.get(row.id)
		const parent = row.parentItemId === null || row.parentItemId === undefined ? undefined : byId.get(row.parentItemId)
		if (parent === undefined) {
			roots.push(node)
		} else {
			parent.children.push(node)
		}
	}
	const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0)
	for (const node of byId.values()) {
		node.children.sort(byPosition)
	}
	return roots.sort(byPosition)
}

/**
 * The target states a user may ask for. Advisory only: OpenRegister decides.
 *
 * @param {object} item The plan item.
 * @return {string[]} The targets.
 */
export function offeredTransitions(item) {
	if (!item || TERMINAL_STATES.includes(item.state)) {
		return []
	}
	if (item.type === 'milestone') {
		return item.state === 'available' ? ['completed', 'terminated'] : []
	}
	return item.state === 'active' ? ['completed', 'terminated'] : ['terminated']
}
