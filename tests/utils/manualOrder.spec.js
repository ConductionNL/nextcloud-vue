/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row order a person chose, held against the person and the list.
 *
 * The property that matters most is what this module never does: touch a
 * record. An order written onto the records makes two people ordering one
 * shared list fight over every row, and puts a field that means nothing
 * outside this screen into every export of them.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import {
	applyManualOrder,
	dropInOrder,
	manualOrderKey,
	moveInOrder,
	visibleIdsOf,
} from '../../src/components/CnIndexPage/manualOrder.js'

const ROWS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

describe('applyManualOrder', () => {
	it('puts the rows in the order this person chose', () => {
		expect(applyManualOrder(ROWS, ['c', 'a', 'd', 'b']).map((r) => r.id)).toEqual(['c', 'a', 'd', 'b'])
	})

	it('never writes anything onto a record', () => {
		const ordered = applyManualOrder(ROWS, ['c', 'a'])

		expect(ordered.every((row) => Object.keys(row).join() === 'id')).toBe(true)
		expect(ordered[0]).toBe(ROWS[2])
	})

	it('puts a row the order does not name at the end, so a new record still shows', () => {
		expect(applyManualOrder(ROWS, ['c', 'a']).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd'])
	})

	it('keeps the loaded order among the rows it does not name', () => {
		expect(applyManualOrder(ROWS, ['d']).map((r) => r.id)).toEqual(['d', 'a', 'b', 'c'])
	})

	it('ignores an id the list no longer holds', () => {
		expect(applyManualOrder(ROWS, ['gone', 'c']).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd'])
	})

	it('returns the very same array when the order names none of the rows', () => {
		expect(applyManualOrder(ROWS, ['x', 'y'])).toBe(ROWS)
		expect(applyManualOrder(ROWS, [])).toBe(ROWS)
	})

	it('ignores a duplicate id rather than ranking the row twice', () => {
		expect(applyManualOrder(ROWS, ['c', 'c', 'a']).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd'])
	})

	it.each([[null], [undefined], [[]]])('answers %p with an empty list', (rows) => {
		expect(applyManualOrder(rows, ['a'])).toEqual([])
	})
})

describe('moveInOrder — the keyboard half of the drag', () => {
	const ids = ['a', 'b', 'c', 'd']

	it('moves a row up one place', () => {
		expect(moveInOrder(ids, 'c', -1)).toEqual(['a', 'c', 'b', 'd'])
	})

	it('moves a row down one place', () => {
		expect(moveInOrder(ids, 'b', 1)).toEqual(['a', 'c', 'b', 'd'])
	})

	it('does nothing past the top, rather than wrapping a row to the bottom', () => {
		expect(moveInOrder(ids, 'a', -1)).toEqual(ids)
	})

	it('does nothing past the bottom', () => {
		expect(moveInOrder(ids, 'd', 1)).toEqual(ids)
	})

	it('moves one place whatever the size of the step, so a held key cannot fling a row', () => {
		expect(moveInOrder(ids, 'a', 5)).toEqual(['b', 'a', 'c', 'd'])
	})

	it.each([['gone', 1], ['a', 0], ['a', NaN]])('does nothing for (%p, %p)', (id, delta) => {
		expect(moveInOrder(ids, id, delta)).toEqual(ids)
	})
})

describe('dropInOrder', () => {
	const ids = ['a', 'b', 'c', 'd']

	it('places a dragged row at the index it was dropped at', () => {
		expect(dropInOrder(ids, 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
	})

	it('does nothing when the row was dropped where it already was', () => {
		expect(dropInOrder(ids, 'a', 0)).toEqual(ids)
	})

	it.each([[-1], [4], [1.5], ['two']])('does nothing for an index of %p', (index) => {
		expect(dropInOrder(ids, 'a', index)).toEqual(ids)
	})

	it('agrees with moveInOrder, so a drag and a keypress mean the same thing', () => {
		expect(dropInOrder(ids, 'b', 2)).toEqual(moveInOrder(ids, 'b', 1))
	})
})

describe('manualOrderKey', () => {
	it('names the list, so one list cannot read another list order', () => {
		expect(manualOrderKey('Cases')).not.toBe(manualOrderKey('Queue'))
	})

	it('is safe to put in a URL path segment', () => {
		expect(manualOrderKey('a/b c?d')).toBe('cn_manual_order_a_b_c_d')
	})

	it('has a default, so a list with no id still holds an order', () => {
		expect(manualOrderKey('')).toBe('cn_manual_order_default')
	})
})

describe('visibleIdsOf', () => {
	it('reads the ids in the order they are on screen', () => {
		expect(visibleIdsOf(ROWS)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('drops a row with no id rather than putting null in the order', () => {
		expect(visibleIdsOf([{ id: 'a' }, {}, { id: 'b' }])).toEqual(['a', 'b'])
	})

	it('honours a configured row key', () => {
		expect(visibleIdsOf([{ reference: 'ZAAK-1' }], 'reference')).toEqual(['ZAAK-1'])
	})
})
