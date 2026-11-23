/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Read the write of a journey that repeats over a list answer.
 *
 * @spec openspec/changes/journey-repeating-item-review/tasks.md#task-2
 */

/**
 * Find the write that repeats over a list answer: a write whose `forEach`
 * names the answer and that declares `targetBy` and `targets`. Writes without
 * `forEach` never match, so a plain write is not read as a repeating one.
 *
 * @param {Array<{writes?: Array<object>}>} steps     The journey's steps in order.
 * @param {string}                          answerKey The list answer's key.
 * @return {{targetBy: string, targets: object}|null} The repeating write, or null.
 */
export function findRepeatingWrite(steps, answerKey) {
	for (const step of Array.isArray(steps) ? steps : []) {
		for (const write of (step && Array.isArray(step.writes)) ? step.writes : []) {
			if (write && write.forEach === answerKey
				&& typeof write.targetBy === 'string' && write.targetBy !== ''
				&& write.targets && typeof write.targets === 'object') {
				return { targetBy: write.targetBy, targets: write.targets }
			}
		}
	}
	return null
}

/**
 * What each item of a list answer will be filed as.
 *
 * @param {object[]}                                 items The list answer.
 * @param {{targetBy: string, targets: object}|null} write The repeating write.
 * @return {Array<{value: *, typeValue: (string|null), fileable: boolean}>} One entry per item; empty without a write.
 */
export function journeyItemTargets(items, write) {
	if (!write || !Array.isArray(items)) {
		return []
	}
	return items.map((item) => {
		const value = item ? item[write.targetBy] : undefined
		const target = (value !== undefined && value !== null && Object.hasOwn(write.targets, String(value)))
			? write.targets[String(value)]
			: null
		const typeValue = target && target.typeValue !== undefined && target.typeValue !== null ? String(target.typeValue) : null
		return { value, typeValue, fileable: typeValue !== null }
	})
}
