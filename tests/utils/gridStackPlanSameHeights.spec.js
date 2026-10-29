/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Layout items with `sameHeight: true` that start on one layout row take the
 * height of the tallest of them, as the boards draw a row of cards
 * (DqProcesanalyse KPI tiles and the two charts under them).
 *
 * @spec openspec/changes/dashboard-row-same-height/specs/dashboard-grid/spec.md
 */
import { planSameHeights } from '../../src/utils/gridStack.js'

describe('planSameHeights', () => {
	it('gives the shorter cards of a row the tallest height', () => {
		expect(planSameHeights([
			{ row: 8, height: 89 },
			{ row: 8, height: 110 },
			{ row: 8, height: 89 },
		])).toEqual([110, null, 110])
	})

	it('keeps rows apart and leaves a card alone on its row', () => {
		expect(planSameHeights([
			{ row: 8, height: 89 },
			{ row: 11, height: 231 },
			{ row: 8, height: 110 },
			{ row: 11, height: 300 },
			{ row: 17, height: 291 },
		])).toEqual([110, 300, null, null, null])
	})

	it('changes nothing when the cards are already level', () => {
		expect(planSameHeights([{ row: 0, height: 120 }, { row: 0, height: 120 }])).toEqual([null, null])
	})
})
