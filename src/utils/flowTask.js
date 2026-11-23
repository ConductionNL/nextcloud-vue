/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Readings of an OpenRegister flow task row (`/api/flow-tasks`) that the task
 * widgets share: who it is offered to, its number, its lock and its form.
 */

/**
 * The groups and people a task is offered to.
 *
 * @param {object|null} task The task row.
 * @return {string[]} The candidate names, groups first.
 */
export function taskCandidates(task) {
	const groups = Array.isArray(task?.candidateGroups) ? task.candidateGroups : []
	const users = Array.isArray(task?.candidateUsers) ? task.candidateUsers : []
	return [...groups, ...users].map((name) => String(name ?? '').trim()).filter((name) => name !== '')
}

/**
 * Whether a task is offered to candidates and nobody holds it yet.
 *
 * @param {object|null} task The task row.
 * @return {boolean}
 */
export function taskIsOffered(task) {
	if (!task || typeof task !== 'object' || String(task.assignee ?? '').trim() !== '') {
		return false
	}
	return taskCandidates(task).length > 0
}

/**
 * How a task is referred to: its number when the engine gave it one, else its uuid.
 *
 * @param {object|null} task The task row.
 * @return {{value: string, isNumber: boolean}} What to show, and whether it is a number.
 */
export function taskReference(task) {
	const number = String(task?.number ?? task?.taskNumber ?? '').trim()
	if (number !== '') {
		return { value: number, isNumber: true }
	}
	return { value: String(task?.uuid ?? task?.id ?? '').trim(), isNumber: false }
}

/**
 * Whether a task is locked: true or false when the row says, null when the
 * engine tracks no lock on it.
 *
 * @param {object|null} task The task row.
 * @return {boolean|null}
 */
export function taskLock(task) {
	const lock = task?.locked ?? task?.lockedBy ?? task?.lock ?? null
	if (lock === null || lock === undefined || lock === '') {
		return null
	}
	return typeof lock === 'boolean' ? lock : true
}

/**
 * The form a task carries (`{kind, state, error, fields}`), or null.
 *
 * @param {object|null} task The task row.
 * @return {object|null}
 */
export function taskForm(task) {
	const form = task?.form
	return form && typeof form === 'object' && form.kind ? form : null
}

/**
 * The first required field of a form these values leave empty, or ''. `0`
 * and `false` are answers.
 *
 * @param {object|null} form The task's form.
 * @param {object} values The answers, keyed by field.
 * @return {string} The field, or ''.
 */
export function missingRequiredTaskField(form, values = {}) {
	const fields = Array.isArray(form?.fields) ? form.fields : []
	for (const field of fields) {
		const name = String(field?.field ?? '').trim()
		if (field?.required !== true || name === '') {
			continue
		}
		const value = values?.[name]
		if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)) {
			return name
		}
	}
	return ''
}
