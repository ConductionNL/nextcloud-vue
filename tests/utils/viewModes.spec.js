/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The columns-of-cards view mode is called `kanban`; `board`, its former
 * name, is read as `kanban` so released manifests keep working.
 */
import {
	KANBAN_VIEW_MODE,
	normalizeViewMode,
	normalizeViewModeKeys,
	normalizeViewModes,
	VIEW_MODE_ALIASES,
} from '../../src/utils/viewModes.js'

describe('normalizeViewMode', () => {
	it('reads the deprecated board as kanban', () => {
		expect(KANBAN_VIEW_MODE).toBe('kanban')
		expect(VIEW_MODE_ALIASES).toEqual({ board: 'kanban' })
		expect(normalizeViewMode('board')).toBe('kanban')
	})

	it('leaves kanban and every other mode as it is', () => {
		for (const mode of ['kanban', 'table', 'cards', 'list', 'map', 'dateAxis', 'calendar']) {
			expect(normalizeViewMode(mode)).toBe(mode)
		}
	})

	it('leaves a value that is no mode alone', () => {
		expect(normalizeViewMode(undefined)).toBeUndefined()
		expect(normalizeViewMode(null)).toBeNull()
		expect(normalizeViewMode('')).toBe('')
		expect(normalizeViewMode('toString')).toBe('toString')
	})
})

describe('normalizeViewModes', () => {
	it('renames board in place and keeps the order', () => {
		expect(normalizeViewModes(['table', 'board', 'map'])).toEqual(['table', 'kanban', 'map'])
	})

	it('drops a board that duplicates a kanban', () => {
		expect(normalizeViewModes(['kanban', 'table', 'board'])).toEqual(['kanban', 'table'])
	})

	it('returns a value that is no array unchanged', () => {
		expect(normalizeViewModes(null)).toBeNull()
		expect(normalizeViewModes(undefined)).toBeUndefined()
	})
})

describe('normalizeViewModeKeys', () => {
	it('renames a board key to kanban', () => {
		const link = { href: '#/cases/kanban' }
		expect(normalizeViewModeKeys({ board: link, map: { href: '/map' } })).toEqual({ kanban: link, map: { href: '/map' } })
	})

	it('lets a kanban key win over a board key', () => {
		expect(normalizeViewModeKeys({ board: { href: '#/old' }, kanban: { href: '#/new' } })).toEqual({ kanban: { href: '#/new' } })
	})

	it('returns a value that is no object unchanged', () => {
		expect(normalizeViewModeKeys(null)).toBeNull()
		const list = ['board']
		expect(normalizeViewModeKeys(list)).toBe(list)
	})
})
