/**
 * Tests for the row action entry helpers CnRowActions and CnContextMenu share (row-action-builtin-placement).
 */

import { isRowActionVisible, rowActionKey, rowActionPayload, rowActionTestId, slugifyActionLabel } from '../../src/utils/rowActionItem.js'

const BUILTIN_EDIT = { id: 'edit', builtin: true, label: 'Bewerken' }
const APP_EDIT = { id: 'edit', label: 'Open editor' }

describe('rowActionItem', () => {
	it('keys a built-in by id and an app action by label', () => {
		expect(rowActionKey(BUILTIN_EDIT)).toBe('builtin:edit')
		expect(rowActionKey(APP_EDIT)).toBe('Open editor')
	})

	it('gives a built-in an id testid in every locale, and an app action its label slug', () => {
		expect(rowActionTestId(BUILTIN_EDIT)).toBe('cn-action-item-edit')
		expect(rowActionTestId(APP_EDIT)).toBe('cn-action-item-open-editor')
		expect(rowActionTestId({ label: 'View' })).toBe('cn-action-item-view')
	})

	it('builds the action payload with the label, the id and the builtin marker', () => {
		const row = { id: 1 }
		expect(rowActionPayload(BUILTIN_EDIT, row)).toEqual({ action: 'Bewerken', row, id: 'edit', builtin: true })
		expect(rowActionPayload(APP_EDIT, row)).toEqual({ action: 'Open editor', row, id: 'edit' })
		expect(rowActionPayload({ label: 'Plain' }, row)).toEqual({ action: 'Plain', row })
	})

	it('does not treat a builtin marker without an id as a built-in', () => {
		expect(rowActionKey({ builtin: true, label: 'Odd' })).toBe('Odd')
		expect(rowActionPayload({ builtin: true, label: 'Odd' }, null)).toEqual({ action: 'Odd', row: null })
	})

	it('slugifies a label', () => {
		expect(slugifyActionLabel('File list!')).toBe('file-list')
		expect(slugifyActionLabel(undefined)).toBe('')
	})

	it('applies visible and a local visibleWhen', () => {
		const row = { status: 'open' }
		expect(isRowActionVisible({ label: 'A' }, row)).toBe(true)
		expect(isRowActionVisible({ label: 'A', visible: false }, row)).toBe(false)
		expect(isRowActionVisible({ label: 'A', visible: (r) => r.status === 'open' }, row)).toBe(true)
		expect(isRowActionVisible({ label: 'A', visibleWhen: { field: 'status', op: 'eq', value: 'closed' } }, row)).toBe(false)
		expect(isRowActionVisible({ label: 'A', visibleWhen: { endpoint: '/x', field: 'y', op: 'eq', value: 1 } }, row)).toBe(true)
	})
})
