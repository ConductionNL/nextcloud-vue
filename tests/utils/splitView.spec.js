/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The split view's three decisions: which layout, how wide the pane, and
 * what the rows look like after a save in the pane.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import {
	applyRowPatches,
	DEFAULT_SPLIT_BREAKPOINT,
	DEFAULT_SPLIT_PANE_WIDTH,
	normaliseBreakpoint,
	normalisePaneWidth,
	rowIdOf,
	splitLayoutFor,
} from '../../src/components/CnIndexPage/splitView.js'

describe('splitLayoutFor', () => {
	it('is the plain list when the page declares no split view', () => {
		expect(splitLayoutFor({ enabled: false, splitId: '42', viewportWidth: 1600 })).toBe('list')
	})

	it('is the plain list when the address names no record', () => {
		expect(splitLayoutFor({ enabled: true, splitId: null, viewportWidth: 1600 })).toBe('list')
	})

	it('is the split when a record is open on a wide screen', () => {
		expect(splitLayoutFor({ enabled: true, splitId: '42', viewportWidth: 1600, breakpoint: 900 })).toBe('split')
	})

	it('is the full detail page at the same address on a narrow screen', () => {
		expect(splitLayoutFor({ enabled: true, splitId: '42', viewportWidth: 420, breakpoint: 900 })).toBe('detail')
	})

	it('answers a link to a record with that record, never with the list', () => {
		// The narrow fallback is the whole point of the breakpoint. Falling
		// back to 'list' would answer a colleague's link with a list.
		const narrow = splitLayoutFor({ enabled: true, splitId: '42', viewportWidth: 320, breakpoint: 1024 })
		expect(narrow).not.toBe('list')
	})

	it('counts an unmeasured viewport as wide rather than guessing narrow', () => {
		expect(splitLayoutFor({ enabled: true, splitId: '42', viewportWidth: 0 })).toBe('split')
		expect(splitLayoutFor({ enabled: true, splitId: '42', viewportWidth: undefined })).toBe('split')
	})

	it('splits exactly at the breakpoint, not one pixel under it', () => {
		expect(splitLayoutFor({ enabled: true, splitId: '1', viewportWidth: 900, breakpoint: 900 })).toBe('split')
		expect(splitLayoutFor({ enabled: true, splitId: '1', viewportWidth: 899, breakpoint: 900 })).toBe('detail')
	})

	it('answers an empty call with the list rather than throwing', () => {
		expect(splitLayoutFor()).toBe('list')
	})
})

describe('normaliseBreakpoint', () => {
	it('keeps a declared width inside the range the schema allows', () => {
		expect(normaliseBreakpoint(900)).toBe(900)
	})

	it.each([[undefined], [null], ['wide'], [10], [99999], [NaN]])('falls back on %p', (value) => {
		expect(normaliseBreakpoint(value)).toBe(DEFAULT_SPLIT_BREAKPOINT)
	})
})

describe('normalisePaneWidth', () => {
	it.each([['38%'], ['520px'], ['24rem'], [' 40% ']])('accepts %p as a CSS length', (value) => {
		expect(normalisePaneWidth(value)).toBe(value.trim())
	})

	it.each([[undefined], [42], ['half'], ['expression(evil)'], ['']])('falls back on %p rather than writing a style the browser drops', (value) => {
		expect(normalisePaneWidth(value)).toBe(DEFAULT_SPLIT_PANE_WIDTH)
	})
})

describe('rowIdOf', () => {
	it.each([
		[{ id: 7 }, '7'],
		[{ '@self': { id: 'abc' } }, 'abc'],
		[{ '@self': { uuid: 'u-1' } }, 'u-1'],
		[{ uuid: 'u-2' }, 'u-2'],
	])('reads %p as %p', (row, expected) => {
		expect(rowIdOf(row)).toBe(expected)
	})

	it('honours a configured row key', () => {
		expect(rowIdOf({ reference: 'ZAAK-1', id: 9 }, 'reference')).toBe('ZAAK-1')
	})

	it.each([[null], [{}], [{ id: '' }], ['not a row']])('answers %p with null', (row) => {
		expect(rowIdOf(row)).toBeNull()
	})
})

describe('applyRowPatches', () => {
	const rows = [{ id: '1', status: 'open' }, { id: '2', status: 'open' }]

	it('replaces the saved row in place and leaves the others alone', () => {
		const next = applyRowPatches(rows, { 2: { status: 'closed' } })

		expect(next).toEqual([{ id: '1', status: 'open' }, { id: '2', status: 'closed' }])
		expect(next[0]).toBe(rows[0])
	})

	it('keeps the row order, so nothing moves under the reader', () => {
		expect(applyRowPatches(rows, { 1: { status: 'closed' } }).map((r) => r.id)).toEqual(['1', '2'])
	})

	it('ignores a patch for a record this page of the list does not hold', () => {
		expect(applyRowPatches(rows, { 99: { status: 'closed' } })).toEqual(rows)
	})

	it('returns the very same array when nothing matched, so no computed downstream re-runs', () => {
		expect(applyRowPatches(rows, { 99: {} })).toBe(rows)
		expect(applyRowPatches(rows, {})).toBe(rows)
	})

	it('merges rather than replaces, so a partial save keeps the fields it did not send', () => {
		const full = [{ id: '1', status: 'open', title: 'Keep me' }]

		expect(applyRowPatches(full, { 1: { status: 'closed' } })[0]).toEqual({ id: '1', status: 'closed', title: 'Keep me' })
	})

	it.each([[null], [undefined], [[]]])('answers %p with an empty list', (input) => {
		expect(applyRowPatches(input, { 1: {} })).toEqual([])
	})
})
