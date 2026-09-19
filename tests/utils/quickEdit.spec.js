/**
 * Tests for the quick edit's field permissions, patch and conflict
 * (working-list-row-actions, task 2).
 */

import { conflictingFields, quickEditPatch, writableQuickEditFields } from '../../src/utils/quickEdit.js'

const FIELDS = ['afdeling', 'behandelaar', 'prioriteit']

describe('writableQuickEditFields', () => {
	it('leaves every named field editable when the record says nothing', () => {
		expect(writableQuickEditFields({ id: 1 }, FIELDS)).toEqual(FIELDS)
	})

	it('narrows to what the record says this caller may write', () => {
		const row = { id: 1, '@self': { writableFields: ['afdeling', 'prioriteit'] } }
		expect(writableQuickEditFields(row, FIELDS)).toEqual(['afdeling', 'prioriteit'])
	})

	it('believes an empty list: a refusal is not a silence', () => {
		expect(writableQuickEditFields({ id: 1, '@self': { writableFields: [] } }, FIELDS)).toEqual([])
	})

	it('a record cannot open a form on a field the page did not name', () => {
		const row = { id: 1, '@self': { writableFields: ['afdeling', 'salaris'] } }
		expect(writableQuickEditFields(row, FIELDS)).toEqual(['afdeling'])
	})

	it('reads any path the page names', () => {
		const row = { id: 1, permissions: { write: ['behandelaar'] } }
		expect(writableQuickEditFields(row, FIELDS, 'permissions.write')).toEqual(['behandelaar'])
	})
})

describe('quickEditPatch', () => {
	const row = { id: 1, afdeling: 'Vergunningen', behandelaar: 'jansen', prioriteit: 'low' }

	it('writes only what changed', () => {
		expect(quickEditPatch(row, { ...row, afdeling: 'Handhaving' }, FIELDS)).toEqual({ afdeling: 'Handhaving' })
	})

	it('writes nothing when nothing changed', () => {
		expect(quickEditPatch(row, { ...row }, FIELDS)).toEqual({})
	})

	it('never writes a field this caller may not write', () => {
		const guarded = { ...row, '@self': { writableFields: ['afdeling'] } }
		expect(quickEditPatch(guarded, { afdeling: 'Handhaving', behandelaar: 'de-vries' }, FIELDS))
			.toEqual({ afdeling: 'Handhaving' })
	})

	it('never writes a field the page did not name', () => {
		expect(quickEditPatch(row, { ...row, salaris: 99 }, FIELDS)).toEqual({})
	})

	it('compares by value, so an unchanged array is not rewritten', () => {
		const withList = { id: 1, tags: ['a', 'b'] }
		expect(quickEditPatch(withList, { tags: ['a', 'b'] }, ['tags'])).toEqual({})
		expect(quickEditPatch(withList, { tags: ['a'] }, ['tags'])).toEqual({ tags: ['a'] })
	})
})

describe('conflictingFields', () => {
	const opened = { id: 1, afdeling: 'Vergunningen', behandelaar: 'jansen' }

	it('says nothing when the server still holds what the form opened on', () => {
		expect(conflictingFields(opened, { ...opened }, { afdeling: 'Handhaving' })).toEqual([])
	})

	it('names a field a colleague moved under this edit, with both values', () => {
		const server = { ...opened, afdeling: 'Bezwaar' }
		expect(conflictingFields(opened, server, { afdeling: 'Handhaving' })).toEqual([
			{ field: 'afdeling', label: 'afdeling', mine: 'Handhaving', theirs: 'Bezwaar' },
		])
	})

	it('ignores a field this person is not writing', () => {
		// Stopping the save because a colleague changed something nobody here
		// touched teaches people to click through the warning.
		const server = { ...opened, behandelaar: 'de-vries' }
		expect(conflictingFields(opened, server, { afdeling: 'Handhaving' })).toEqual([])
	})
})
