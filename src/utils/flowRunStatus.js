/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * The run statuses a flow list distinguishes, as label and pill colour.
 *
 * The engine's own vocabulary (`FlowRun::STATUS_*`). A status the engine
 * adds later falls through to its raw value with the neutral colour rather
 * than disappearing.
 *
 * @return {Record<string, {label: string, variant: string}>} By engine status.
 */
export function flowRunStatuses() {
	return {
		completed: { label: t('nextcloud-vue', 'Finished'), variant: 'success' },
		failed: { label: t('nextcloud-vue', 'Failed'), variant: 'error' },
		dead_letter: { label: t('nextcloud-vue', 'Failed'), variant: 'error' },
		stopped: { label: t('nextcloud-vue', 'Stopped early'), variant: 'warning' },
		queued: { label: t('nextcloud-vue', 'Queued'), variant: 'info' },
		running: { label: t('nextcloud-vue', 'Running'), variant: 'info' },
		suspended: { label: t('nextcloud-vue', 'Waiting'), variant: 'info' },
		awaiting_consent: { label: t('nextcloud-vue', 'Awaiting consent'), variant: 'warning' },
	}
}

/**
 * The engine statuses a "with errors" filter counts as an error.
 */
export const FLOW_RUN_ERROR_STATUSES = ['failed', 'dead_letter']

/**
 * The engine statuses a run waits in for a person or a time.
 */
const FLOW_RUN_WAITING_STATUSES = ['suspended', 'awaiting_consent']

/**
 * The objects a run works with, each under its role.
 *
 * `subjects` is what the run declared; a run that declared none still has the
 * object its trigger fired on.
 *
 * @param {object} run A run.
 * @return {Array<{role: string, uuid: string}>} The subjects.
 */
export function flowRunSubjects(run) {
	const declared = Object.entries(run?.subjects || {}).map(([role, subject]) => ({ role, uuid: String(subject?.uuid ?? '') }))
	if (declared.length > 0) {
		return declared
	}
	const uuid = run?.subjectUuid ?? run?.subject?.uuid

	return uuid ? [{ role: '', uuid: String(uuid) }] : []
}

/**
 * The tile over the distinct subjects of some runs.
 *
 * @param {Array<object>} runs The runs.
 * @return {object} The tile: how many objects, and under which roles.
 */
function subjectsCounter(runs) {
	const subjects = runs.flatMap(flowRunSubjects)
	const roles = [...new Set(subjects.map((subject) => subject.role).filter(Boolean))]

	return {
		id: 'subjects',
		label: t('nextcloud-vue', 'Subjects'),
		count: new Set(subjects.map((subject) => subject.uuid)).size,
		note: roles.join(', '),
		variant: 'default',
	}
}

/**
 * The counters above a run history (board OrFlowRuns).
 *
 * @param {Array<object>} runs The runs in the list.
 * @return {Array<{id: string, label: string, count: number, note: string, variant: string}>} The tiles.
 */
export function flowRunCounters(runs) {
	const counted = (statuses) => runs.filter((run) => statuses.includes(run.status)).length
	const finished = counted(['completed'])
	const share = runs.length > 0 ? `${Math.round((finished / runs.length) * 100)}%` : ''

	return [
		{ id: 'runs', label: t('nextcloud-vue', 'Runs'), count: runs.length, note: '', variant: 'default' },
		{ id: 'finished', label: t('nextcloud-vue', 'Finished'), count: finished, note: share, variant: 'success' },
		{ id: 'failed', label: t('nextcloud-vue', 'Failed'), count: counted(FLOW_RUN_ERROR_STATUSES), note: '', variant: 'error' },
		{ id: 'waiting', label: t('nextcloud-vue', 'Waiting'), count: counted(FLOW_RUN_WAITING_STATUSES), note: '', variant: 'warning' },
		subjectsCounter(runs),
	]
}
