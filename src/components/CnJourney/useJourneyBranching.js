/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Journey branching: every decision goes through the shared `visibleWhen`
 * evaluator. This module holds no condition grammar of its own.
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-2
 */

import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'

/**
 * Evaluate one condition against the answers so far, through the shared
 * evaluator (local, endpoint and source modes). An erroring condition is
 * false, and the error goes to `onError`.
 *
 * @param {object|null} condition The `visibleWhen` condition (null = true).
 * @param {object} answers The merged answers; `field` dot-paths read from here.
 * @param {(error: Error, condition: object) => void} [onError] Told why a condition could not be evaluated.
 * @return {Promise<boolean>} Whether the condition holds.
 */
export function evaluateJourneyCondition(condition, answers, onError) {
	return evaluateVisibleWhen(condition, { object: answers, onError })
}

/**
 * The target of the first branch rule that holds, or null for the default
 * (the next step in order).
 *
 * @param {Array<{when: object, goto: string}>} rules The step's branch rules, in order.
 * @param {object} answers The merged answers.
 * @param {(error: Error, condition: object) => void} [onError] Told why a rule could not be evaluated.
 * @return {Promise<string|null>} The step id to go to, or null.
 */
export async function pickBranchTarget(rules, answers, onError) {
	for (const rule of Array.isArray(rules) ? rules : []) {
		if (rule && typeof rule.goto === 'string' && await evaluateJourneyCondition(rule.when, answers, onError)) {
			return rule.goto
		}
	}
	return null
}
