/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The journey's step model: two levels (group and sub-step), a closed set of
 * step types, no more.
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-1
 */

/** The step types a journey can declare. A host cannot add to this. */
export const JOURNEY_STEP_TYPES = Object.freeze(['form', 'review'])

/**
 * Problems with the journey's shape: a third nesting level, or an unknown
 * step type. The renderer reports these instead of rendering around them.
 *
 * @param {{steps?: Array<object>}} journey The journey.
 * @return {Array<{stepId: string, message: string}>} One entry per problem.
 */
export function journeyShapeErrors(journey) {
	const errors = []
	for (const step of Array.isArray(journey && journey.steps) ? journey.steps : []) {
		const subs = Array.isArray(step.steps) ? step.steps : []
		for (const sub of subs) {
			if (Array.isArray(sub.steps) && sub.steps.length > 0) {
				errors.push({ stepId: String(sub.id), message: 'A step can be nested one level deep at most.' })
			}
			if (!JOURNEY_STEP_TYPES.includes(sub.type)) {
				errors.push({ stepId: String(sub.id), message: `Unknown step type "${sub.type}".` })
			}
		}
		if (subs.length === 0 && !JOURNEY_STEP_TYPES.includes(step.type)) {
			errors.push({ stepId: String(step.id), message: `Unknown step type "${step.type}".` })
		}
	}
	return errors
}

/**
 * The steps that can be visited, in order: sub-steps of a group, or the
 * step itself when it is not a group.
 *
 * @param {Array<object>} steps The journey steps.
 * @return {Array<object>} Leaf steps, each with `groupId` when nested.
 */
export function journeyLeaves(steps) {
	const leaves = []
	for (const step of Array.isArray(steps) ? steps : []) {
		if (Array.isArray(step.steps) && step.steps.length > 0) {
			step.steps.forEach((sub) => leaves.push({ ...sub, groupId: step.id }))
		} else {
			leaves.push(step)
		}
	}
	return leaves
}
