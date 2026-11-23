/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A layout item with `clear: true` starts below every card that starts on an
 * earlier layout row, whatever column that card is in, as the boards draw a
 * row of cards under the tracks (DqMijnWerk "Zaken die u volgt" and "Mijn
 * archiefbeoordelingen" under My tasks and Recent activity; DqMijnTeam
 * "Zaken per status" and "Zaken per type" level under the taller of the two
 * cards above). A packing grid let each rise under the shorter column.
 *
 * @spec openspec/changes/dashboard-clear-row/specs/dashboard-grid/spec.md
 */
import { planClearRows } from '../../src/utils/gridStack.js'

const node = (id, x, y, w, h, row, clear = false) => ({ id, x, y, w, h, row, clear })

describe('planClearRows', () => {
	it('moves a clear item below the lowest card of the earlier rows, in any column', () => {
		const main = node('main', 0, 4, 8, 10, 4)
		const side = node('side', 8, 4, 4, 18, 4)
		const followed = node('followed', 0, 14, 6, 4, 16, true)
		const archive = node('archive', 6, 22, 6, 4, 16, true)
		const plan = planClearRows([main, side, followed, archive])
		expect(plan).toEqual([{ node: followed, y: 22 }])
	})

	it('levels a row of clear items under the taller card above both', () => {
		const queue = node('queue', 0, 2, 6, 12, 2)
		const stuck = node('stuck', 6, 2, 6, 10, 2)
		const status = node('status', 0, 14, 6, 6, 6, true)
		const type = node('type', 6, 12, 6, 6, 6, true)
		expect(planClearRows([queue, stuck, status, type])).toEqual([{ node: type, y: 14 }])
	})

	it('moves a clear item up when the cards above shrank', () => {
		const top = node('top', 0, 0, 12, 4, 0)
		const below = node('below', 0, 9, 12, 2, 6, true)
		expect(planClearRows([top, below])).toEqual([{ node: below, y: 4 }])
	})

	it('counts a clear item moved earlier for a later clear row', () => {
		const top = node('top', 0, 0, 12, 4, 0)
		const a = node('a', 0, 2, 12, 3, 2, true)
		const b = node('b', 0, 5, 12, 2, 5, true)
		expect(planClearRows([top, a, b])).toEqual([{ node: a, y: 4 }, { node: b, y: 7 }])
	})

	it('plans nothing without clear items or when they already sit right', () => {
		expect(planClearRows([node('a', 0, 0, 12, 4, 0), node('b', 0, 4, 12, 2, 2)])).toEqual([])
		expect(planClearRows([node('a', 0, 0, 12, 4, 0), node('b', 0, 4, 12, 2, 2, true)])).toEqual([])
	})
})
