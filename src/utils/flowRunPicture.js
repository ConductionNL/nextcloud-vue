/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { flowRunLogLines, flowRunSteps } from './flowRunLog.js'

/**
 * A finished run on the canvas, read from its log: what became of each step
 * and which lines it took (board OrFlowRun).
 */

/** The run statuses after which a step that did not run never will. */
const FINISHED_STATUSES = ['completed', 'stopped', 'failed', 'dead_letter']

/** The states from worst to best: a step logged twice shows its worst. */
const STATE_RANK = ['failed', 'warning', 'hold', 'done']

/**
 * @param {object} step A step of {@see flowRunSteps}.
 * @return {string} `done`, `warning`, `failed` or `hold`.
 */
function stepState(step) {
	if (step.level === 'error') {
		return 'failed'
	}
	if (step.level === 'warning') {
		return 'warning'
	}

	return step.entry?.status === 'suspended' ? 'hold' : 'done'
}

/**
 * @param {string|undefined} current The state so far.
 * @param {string} next The state of the next log entry.
 * @return {string} The worse of the two.
 */
function worstState(current, next) {
	return current === undefined || STATE_RANK.indexOf(next) < STATE_RANK.indexOf(current) ? next : current
}

/**
 * The line a step was reached by: from the step that ran last of those leading
 * to it.
 *
 * @param {string} nodeId The step.
 * @param {Array<string>} ran The steps run before it, oldest first.
 * @param {Array<object>} lines The canvas lines (`id`, `source`, `target`).
 * @return {object|undefined} The line.
 */
function lineInto(nodeId, ran, lines) {
	const ways = lines.filter((line) => line.target === nodeId)

	return ran.slice().reverse().map((id) => ways.find((line) => line.source === id)).find(Boolean)
}

/**
 * The ids of the lines a run took.
 *
 * @param {Array<object>} steps The run's steps in log order.
 * @param {Array<object>} lines The canvas lines.
 * @return {Array<string>} The line ids.
 */
function takenLines(steps, lines) {
	const ran = []
	const taken = new Set()
	steps.forEach((step) => {
		const line = lineInto(step.nodeId, ran, lines)
		if (line) {
			taken.add(line.id)
		}
		ran.push(step.nodeId)
	})

	return [...taken]
}

/**
 * The picture of a run over the flow's graph.
 *
 * @param {object} run The run, with `status` and `log`.
 * @param {Array<object>} nodes The canvas nodes.
 * @param {Array<object>} lines The canvas lines.
 * @return {{states: Record<string, string>, counts: Record<string, number>, taken: Array<string>, notTaken: Array<string>}}
 * The state and the number of log lines per step, and the lines taken and not.
 */
export function flowRunPicture(run, nodes, lines) {
	const steps = flowRunSteps(run)
	const states = {}
	steps.forEach((step) => {
		states[step.nodeId] = worstState(states[step.nodeId], stepState(step))
	})

	const counts = {}
	flowRunLogLines(run).forEach((line) => {
		counts[line.nodeId] = (counts[line.nodeId] || 0) + 1
	})

	const finished = FINISHED_STATUSES.includes(run?.status)
	if (finished) {
		nodes.filter((node) => states[node.id] === undefined).forEach((node) => {
			states[node.id] = 'skipped'
		})
	}

	const taken = takenLines(steps, lines)

	return {
		states,
		counts,
		taken,
		notTaken: finished ? lines.map((line) => line.id).filter((id) => !taken.includes(id)) : [],
	}
}
