/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A filter set on the board does not follow you to the table.
 *
 * Carrying a filter across is the kind of wrong that renders perfectly: a
 * table that says no results for a case somebody knows exists, or a board with
 * three empty columns that read as "no work here".
 */

const { hasOwnFilters, switchViewMode } = require('../../src/utils/filtersPerViewMode.js')

describe('switching mode', () => {
	it('remembers what the mode being left had', () => {
		const { held } = switchViewMode({
			fromMode: 'board',
			currentFilters: { status: ['open'] },
			toMode: 'table',
		})

		expect(held.board).toEqual({ status: ['open'] })
	})

	it('opens a mode nobody has visited clean', () => {
		// Inheriting would make the board's first impression depend on a
		// filter set somewhere else.
		const { filters } = switchViewMode({
			fromMode: 'table',
			currentFilters: { title: ['spoed'] },
			toMode: 'board',
		})

		expect(filters).toEqual({})
	})

	it('gives a mode back what it had', () => {
		const first = switchViewMode({
			fromMode: 'board',
			currentFilters: { status: ['open'] },
			toMode: 'table',
		})
		const back = switchViewMode({
			held: first.held,
			fromMode: 'table',
			currentFilters: { title: ['spoed'] },
			toMode: 'board',
		})

		expect(back.filters).toEqual({ status: ['open'] })
		// And the table kept its own, which is the half that makes the first
		// assertion mean something.
		expect(back.held.table).toEqual({ title: ['spoed'] })
	})

	it('copies rather than sharing, so a later edit does not rewrite history', () => {
		const current = { status: ['open'] }
		const { held } = switchViewMode({ fromMode: 'board', currentFilters: current, toMode: 'table' })

		current.status.push('done')

		expect(held.board.status).toEqual(['open', 'done'])
		// The object itself is not the same reference, which is what stops a
		// later reassignment of the whole filter set from leaking.
		expect(held.board).not.toBe(current)
	})
})

describe('hasOwnFilters', () => {
	it('tells a visited mode from an unvisited one', () => {
		const { held } = switchViewMode({ fromMode: 'board', currentFilters: {}, toMode: 'table' })

		// Visited with no filters is still visited: the surface can say "you
		// cleared this" rather than "you have not been here".
		expect(hasOwnFilters(held, 'board')).toBe(true)
		expect(hasOwnFilters(held, 'table')).toBe(false)
	})
})
