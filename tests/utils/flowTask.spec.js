/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A flow task's number, lock, candidates and form, as the task widgets read
 * them. Nothing is invented: a task without a number shows its uuid and says
 * so, and a task whose lock the engine does not track is "not tracked".
 *
 * @spec openspec/changes/task-widget-on-the-record/specs/task-widget-on-the-record/spec.md#requirement-the-first-open-task-can-be-worked-on-in-place
 */
import { missingRequiredTaskField, taskCandidates, taskForm, taskIsOffered, taskLock, taskReference } from '../../src/utils/flowTask.js'

describe('a task shows its own number', () => {
	it('shows the number when the engine carries one', () => {
		expect(taskReference({ uuid: 'abc-123', number: 'TAAK-2026-0041' })).toEqual({ value: 'TAAK-2026-0041', isNumber: true })
	})

	it('shows the engine identifier when it carries none, and says it is not a number', () => {
		expect(taskReference({ uuid: 'abc-123' })).toEqual({ value: 'abc-123', isNumber: false })
	})

	it('invents nothing for a task with no number and no id', () => {
		expect(taskReference({ objectUuid: 'case-1' })).toEqual({ value: '', isNumber: false })
	})
})

describe('a task shows its own lock', () => {
	it('tells "not locked" apart from "no lock is tracked"', () => {
		expect(taskLock({ locked: false })).toBe(false)
		expect(taskLock({})).toBeNull()
	})

	it('reads a lock held by somebody as locked', () => {
		expect(taskLock({ lockedBy: 'lars' })).toBe(true)
	})
})

describe('a task that is waiting to be taken', () => {
	it('is offered when it has candidates and no assignee', () => {
		expect(taskIsOffered({ candidateGroups: ['vergunningen'] })).toBe(true)
		expect(taskIsOffered({ candidateGroups: ['vergunningen'], assignee: 'lars' })).toBe(false)
	})

	it('is not offered when nobody was asked', () => {
		expect(taskIsOffered({ candidateGroups: [], candidateUsers: [' '] })).toBe(false)
	})

	it('names groups and people together', () => {
		expect(taskCandidates({ candidateGroups: ['vergunningen'], candidateUsers: ['lars'] })).toEqual(['vergunningen', 'lars'])
	})
})

describe('the form a task carries', () => {
	const task = { form: { kind: 'fields', fields: [{ field: 'verslag', required: true }, { field: 'besluit', required: true }, { field: 'notitie', required: false }] } }

	it('is the engine answer, or nothing', () => {
		expect(taskForm(task)).toBe(task.form)
		expect(taskForm({ form: {} })).toBeNull()
		expect(taskForm({})).toBeNull()
	})

	it('names the first required field left empty', () => {
		expect(missingRequiredTaskField(task.form, { verslag: '  ' })).toBe('verslag')
		expect(missingRequiredTaskField(task.form, { verslag: 'ok' })).toBe('besluit')
		expect(missingRequiredTaskField(task.form, { verslag: 'ok', besluit: [] })).toBe('besluit')
	})

	it('treats zero and false as answers', () => {
		expect(missingRequiredTaskField(task.form, { verslag: 0, besluit: false })).toBe('')
	})
})
