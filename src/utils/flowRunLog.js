/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Reading a flow run's log as outcomes and lines.
 *
 * The engine writes ONE entry per step: `transition`, `type`, `status`
 * (`completed`, `failed`, `stopped`, `suspended`, `pinned`), `durationMs`,
 * `error` or `reason`, and a free `report` map. A step may also carry
 * `startedAt` and `report.lines` (`[{at, level, message}]`); when it does,
 * those are shown as they are. When it does not, the start of a step is the
 * run's start plus the durations before it, and the step reads as one line.
 */

/**
 * The outcome levels a run view distinguishes, as label and pill colour.
 *
 * @return {Record<string, {label: string, variant: string}>} By level.
 */
export function flowOutcomeLevels() {
	return {
		success: { label: t('nextcloud-vue', 'Succeeded'), variant: 'success' },
		warning: { label: t('nextcloud-vue', 'Warning'), variant: 'warning' },
		error: { label: t('nextcloud-vue', 'Failed'), variant: 'error' },
		info: { label: t('nextcloud-vue', 'Info'), variant: 'info' },
		skipped: { label: t('nextcloud-vue', 'Not run'), variant: 'default' },
	}
}

/**
 * The outcome level of one step entry.
 *
 * A failed step on a run that went on anyway (its `onError` policy said
 * continue) is a warning: the run did not stop on it.
 *
 * @param {object} entry The step's log entry.
 * @param {object} [run] The run, to tell a fatal failure from a continued one.
 * @return {string} `success`, `warning`, `error` or `info`.
 */
export function flowStepLevel(entry, run = null) {
	const status = String(entry?.status || '')
	if (status === 'completed') {
		return 'success'
	}
	if (status === 'failed') {
		return run && run.status === 'completed' ? 'warning' : 'error'
	}
	if (status === 'stopped') {
		return 'warning'
	}
	return 'info'
}

/**
 * The plain text a step entry says about itself.
 *
 * @param {object} entry The step's log entry.
 * @return {string} The message.
 */
export function flowStepMessage(entry) {
	if (entry?.error) {
		return String(entry.error)
	}
	if (entry?.reason) {
		return String(entry.reason)
	}
	const status = String(entry?.status || '')
	if (status === 'pinned') {
		return t('nextcloud-vue', 'Used the pinned output, the step itself did not run.')
	}
	if (status === 'suspended') {
		return t('nextcloud-vue', 'Waiting before going on.')
	}
	const itemsIn = Number(entry?.itemsIn)
	const itemsOut = Number(entry?.itemsOut)
	if (Number.isFinite(itemsIn) && Number.isFinite(itemsOut)) {
		return t('nextcloud-vue', '{in} in, {out} out.', { in: itemsIn, out: itemsOut })
	}
	return t('nextcloud-vue', 'Step done.')
}

/**
 * A moment as a Date, or null.
 *
 * @param {unknown} value An ISO string, a timestamp or a Date.
 * @return {Date|null} The date.
 */
function asDate(value) {
	if (!value) {
		return null
	}
	const date = value instanceof Date ? value : new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

/**
 * The run's steps in log order, each with its level, start and duration.
 *
 * @param {object} run The run, with `log` and `created`.
 * @return {Array<{index: number, nodeId: string, type: string, level: string, startedAt: Date|null, durationMs: number, message: string, entry: object}>} The steps.
 */
export function flowRunSteps(run) {
	const log = Array.isArray(run?.log) ? run.log : []
	let clock = asDate(run?.created)
	return log.map((entry, index) => {
		const startedAt = asDate(entry?.startedAt) || clock
		const durationMs = Number(entry?.durationMs) || 0
		if (startedAt) {
			clock = new Date(startedAt.getTime() + durationMs)
		}
		return {
			index: index + 1,
			nodeId: String(entry?.transition || ''),
			type: String(entry?.type || ''),
			level: flowStepLevel(entry, run),
			startedAt,
			durationMs,
			message: flowStepMessage(entry),
			entry,
		}
	})
}

/**
 * The log lines of a run, or of one of its steps.
 *
 * A step that wrote its own lines (`report.lines`) shows those; any other
 * step reads as one line built from its entry.
 *
 * @param {object} run The run.
 * @param {string|null} [nodeId] Only this step's lines.
 * @return {Array<{key: string, nodeId: string, level: string, at: Date|null, message: string}>} The lines, in log order.
 */
export function flowRunLogLines(run, nodeId = null) {
	const lines = []
	flowRunSteps(run).forEach((step) => {
		if (nodeId !== null && step.nodeId !== nodeId) {
			return
		}
		const own = Array.isArray(step.entry?.report?.lines) ? step.entry.report.lines : []
		if (own.length > 0) {
			own.forEach((line, index) => {
				lines.push({
					key: `${step.index}-${index}`,
					nodeId: step.nodeId,
					level: ['success', 'warning', 'error', 'info'].includes(line?.level) ? line.level : 'info',
					at: asDate(line?.at) || step.startedAt,
					message: String(line?.message || ''),
				})
			})
			return
		}
		lines.push({ key: `${step.index}`, nodeId: step.nodeId, level: step.level, at: step.startedAt, message: step.message })
	})
	return lines
}

/**
 * How long a run took, in milliseconds: the span from start to last update
 * for a finished run, else the sum of its step durations.
 *
 * @param {object} run The run.
 * @return {number|null} The duration, or null when unknown.
 */
export function flowRunDurationMs(run) {
	const start = asDate(run?.created)
	const end = asDate(run?.updated)
	if (start && end && end >= start) {
		return end.getTime() - start.getTime()
	}
	const steps = flowRunSteps(run)
	return steps.length > 0 ? steps.reduce((sum, step) => sum + step.durationMs, 0) : null
}

/**
 * A duration as people read it: "96 ms", "0.9 s", "2 min 5 s".
 *
 * @param {number|null} ms The duration.
 * @return {string} The text, or '' when unknown.
 */
export function formatFlowDuration(ms) {
	if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) {
		return ''
	}
	const value = Number(ms)
	if (value < 1000) {
		return t('nextcloud-vue', '{ms} ms', { ms: Math.round(value) })
	}
	if (value < 60000) {
		return t('nextcloud-vue', '{s} s', { s: (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) })
	}
	const minutes = Math.floor(value / 60000)
	const seconds = Math.round((value % 60000) / 1000)
	return t('nextcloud-vue', '{m} min {s} s', { m: minutes, s: seconds })
}

/**
 * A run's name as people say it: the minute it started ("2026-10-07-0841"),
 * else the start of its uuid.
 *
 * @param {object} run The run.
 * @return {string} The name.
 */
export function flowRunName(run) {
	const created = asDate(run?.created)
	if (created) {
		const pad = (value) => String(value).padStart(2, '0')
		return `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}-${pad(created.getHours())}${pad(created.getMinutes())}`
	}
	return String(run?.uuid || '').slice(0, 8)
}
