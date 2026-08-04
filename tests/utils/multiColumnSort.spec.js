/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the CnDataTable click / shift-click multi-column sort
 * state-transition machine.
 */

import { nextSortState, MAX_SORT_KEYS } from '../../src/utils/multiColumnSort.js'

describe('nextSortState — plain click (single-sort, backward compatible)', () => {
	it('unsorted -> plain click becomes the sole ascending key', () => {
		expect(nextSortState([], 'name')).toEqual([{ key: 'name', order: 'asc' }])
	})

	it('sole active key ascending -> plain click cycles to descending', () => {
		const state = [{ key: 'name', order: 'asc' }]
		expect(nextSortState(state, 'name')).toEqual([{ key: 'name', order: 'desc' }])
	})

	it('sole active key descending -> plain click clears the sort', () => {
		const state = [{ key: 'name', order: 'desc' }]
		expect(nextSortState(state, 'name')).toEqual([])
	})

	it('plain click on a different column replaces a single-key sort', () => {
		const state = [{ key: 'name', order: 'asc' }]
		expect(nextSortState(state, 'createdAt')).toEqual([{ key: 'createdAt', order: 'asc' }])
	})

	it('plain click on a column collapses an active multi-sort to that column alone', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }]
		expect(nextSortState(state, 'status')).toEqual([{ key: 'status', order: 'asc' }])
	})

	it('plain click on the current primary key of a multi-sort still collapses (does not just cycle)', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }]
		expect(nextSortState(state, 'name')).toEqual([{ key: 'name', order: 'asc' }])
	})

	it('append defaults to false when options omitted', () => {
		expect(nextSortState([], 'name')).toEqual(nextSortState([], 'name', {}))
	})
})

describe('nextSortState — shift+click append', () => {
	it('unsorted -> shift+click appends a sole ascending key (same as plain click)', () => {
		expect(nextSortState([], 'name', { append: true })).toEqual([{ key: 'name', order: 'asc' }])
	})

	it('appends a second key without disturbing the first', () => {
		const state = [{ key: 'name', order: 'asc' }]
		expect(nextSortState(state, 'createdAt', { append: true })).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('appends a third key preserving prior order and directions', () => {
		const state = [{ key: 'name', order: 'desc' }, { key: 'createdAt', order: 'asc' }]
		expect(nextSortState(state, 'status', { append: true })).toEqual([
			{ key: 'name', order: 'desc' },
			{ key: 'createdAt', order: 'asc' },
			{ key: 'status', order: 'asc' },
		])
	})

	it('caps at MAX_SORT_KEYS: a 4th shift+click on a new column is a no-op', () => {
		const state = [
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'asc' },
			{ key: 'status', order: 'asc' },
		]
		expect(state.length).toBe(MAX_SORT_KEYS)
		const next = nextSortState(state, 'owner', { append: true })
		expect(next).toEqual(state)
	})
})

describe('nextSortState — shift+click cycles an already-active key', () => {
	it('cycles a secondary key asc -> desc, leaving the primary untouched', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'asc' }]
		expect(nextSortState(state, 'createdAt', { append: true })).toEqual([
			{ key: 'name', order: 'asc' },
			{ key: 'createdAt', order: 'desc' },
		])
	})

	it('cycles a secondary key desc -> removed, leaving the primary untouched', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }]
		expect(nextSortState(state, 'createdAt', { append: true })).toEqual([
			{ key: 'name', order: 'asc' },
		])
	})

	it('full cycle of a secondary key: asc -> desc -> removed', () => {
		let state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'asc' }]
		state = nextSortState(state, 'createdAt', { append: true })
		expect(state).toEqual([{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'desc' }])
		state = nextSortState(state, 'createdAt', { append: true })
		expect(state).toEqual([{ key: 'name', order: 'asc' }])
	})

	it('removing the primary key (desc -> removed) promotes the next key to primary', () => {
		const state = [{ key: 'name', order: 'desc' }, { key: 'createdAt', order: 'asc' }]
		expect(nextSortState(state, 'name', { append: true })).toEqual([
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('cycling the primary key asc -> desc keeps it primary', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'asc' }]
		expect(nextSortState(state, 'name', { append: true })).toEqual([
			{ key: 'name', order: 'desc' },
			{ key: 'createdAt', order: 'asc' },
		])
	})

	it('shift+click on the sole active key cycles it the same as plain click', () => {
		let state = [{ key: 'name', order: 'asc' }]
		state = nextSortState(state, 'name', { append: true })
		expect(state).toEqual([{ key: 'name', order: 'desc' }])
		state = nextSortState(state, 'name', { append: true })
		expect(state).toEqual([])
	})
})

describe('nextSortState — does not mutate its input', () => {
	it('leaves the original array and its entries untouched', () => {
		const state = [{ key: 'name', order: 'asc' }, { key: 'createdAt', order: 'asc' }]
		const snapshot = JSON.parse(JSON.stringify(state))
		nextSortState(state, 'createdAt', { append: true })
		nextSortState(state, 'other', { append: true })
		nextSortState(state, 'name')
		expect(state).toEqual(snapshot)
	})
})
