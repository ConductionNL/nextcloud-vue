/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list's declared create action: whether it shows on this record, and what
 * the list says in its place when it does not.
 */
import { createActionState, listCreateAction } from '../../src/utils/listCreateAction.js'

const ACTION = {
	type: 'open-modal',
	target: 'SubRecordModal',
	label: 'Create sub-record',
	visibleWhen: { all: [{ field: 'endDate', op: 'empty' }, { field: 'parent', op: 'empty' }] },
	hiddenNote: [
		{ when: { field: 'parent', op: 'notEmpty' }, text: 'A sub-record cannot have sub-records.' },
		{ when: { field: 'endDate', op: 'notEmpty' }, text: 'This record is closed.' },
	],
}

describe('listCreateAction', () => {
	it('reads a declared action and ignores anything without a type', () => {
		expect(listCreateAction({ createAction: ACTION })).toBe(ACTION)
		expect(listCreateAction({ createAction: { label: 'x' } })).toBeNull()
		expect(listCreateAction({ createAction: [] })).toBeNull()
		expect(listCreateAction({})).toBeNull()
		expect(listCreateAction(null)).toBeNull()
	})
})

describe('createActionState', () => {
	it('leaves a list without a create action as it was', () => {
		expect(createActionState({}, { id: 1 })).toEqual({ action: null, visible: true, note: '' })
	})

	it('shows an action without a condition on any record', () => {
		const action = { type: 'handler', handler: 'x' }
		expect(createActionState({ createAction: action }, null)).toEqual({ action, visible: true, note: '' })
	})

	it('shows the action where its condition holds', () => {
		expect(createActionState({ createAction: ACTION }, { id: 1 }).visible).toBe(true)
	})

	it('withholds it, with no note, while the record is not known yet', () => {
		expect(createActionState({ createAction: ACTION }, null)).toEqual({ action: ACTION, visible: false, note: '' })
	})

	it('withholds it and gives the first note whose condition holds', () => {
		expect(createActionState({ createAction: ACTION }, { parent: 'p' }).note).toBe('A sub-record cannot have sub-records.')
		expect(createActionState({ createAction: ACTION }, { endDate: '2026-10-01' }).note).toBe('This record is closed.')
		expect(createActionState({ createAction: ACTION }, { parent: 'p', endDate: '2026-10-01' }).note).toBe('A sub-record cannot have sub-records.')
	})

	it('takes a plain string note as is', () => {
		const content = { createAction: { ...ACTION, hiddenNote: 'Not here.' } }
		expect(createActionState(content, { endDate: '2026-10-01' })).toEqual({ action: content.createAction, visible: false, note: 'Not here.' })
	})

	it('gives no note when none is declared or none holds', () => {
		const content = { createAction: { ...ACTION, hiddenNote: undefined } }
		expect(createActionState(content, { endDate: 'x' }).note).toBe('')
		const unmatched = { createAction: { ...ACTION, hiddenNote: [{ when: { field: 'kind', op: 'eq', value: 'z' }, text: 'never' }] } }
		expect(createActionState(unmatched, { endDate: 'x' }).note).toBe('')
	})
})
