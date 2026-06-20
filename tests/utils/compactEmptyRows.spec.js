/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { compactEmptyRows } from '../../src/utils/grid.js'

describe('compactEmptyRows', () => {
	it('removes a fully-empty row band and shifts widgets below up', () => {
		// row 0-1: two KPIs; rows 2-3 empty; row 4-7: a chart
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 },
			{ id: 'b', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 2 },
			{ id: 'c', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 4 },
		]
		const { layout: out, changed } = compactEmptyRows(layout)
		expect(changed).toBe(true)
		expect(out.find((i) => i.id === 'c').gridY).toBe(2) // shifted up by the 2 empty rows
		expect(out.find((i) => i.id === 'a').gridY).toBe(0) // unchanged
		expect(out.find((i) => i.id === 'b').gridY).toBe(0)
	})

	it('removes a leading empty row at the top', () => {
		const layout = [{ id: 'a', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 2 }]
		const { layout: out, changed } = compactEmptyRows(layout)
		expect(changed).toBe(true)
		expect(out[0].gridY).toBe(0)
	})

	it('keeps intentional horizontal gaps within a row (only removes full empty rows)', () => {
		// row 0: one widget in cols 0-2 (cols 3-11 empty within the row) — row not empty
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 1 },
			{ id: 'b', gridX: 0, gridY: 1, gridWidth: 3, gridHeight: 1 },
		]
		const { changed } = compactEmptyRows(layout)
		expect(changed).toBe(false) // rows 0 and 1 both occupied; no empty band
	})

	it('no change when already compact', () => {
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
			{ id: 'b', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
		]
		expect(compactEmptyRows(layout).changed).toBe(false)
	})

	it('handles multiple empty bands', () => {
		const layout = [
			{ id: 'a', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 },
			{ id: 'b', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 1 }, // 1 empty above (rows 1-2 → 2 empty)
			{ id: 'c', gridX: 0, gridY: 8, gridWidth: 12, gridHeight: 1 },
		]
		const { layout: out } = compactEmptyRows(layout)
		expect(out.find((i) => i.id === 'b').gridY).toBe(1) // rows 1,2 empty → shift up 2
		expect(out.find((i) => i.id === 'c').gridY).toBe(2) // rows 1,2,4,5,6,7 empty (6) → 8-6=2
	})

	it('is a no-op on empty/invalid input', () => {
		expect(compactEmptyRows([]).changed).toBe(false)
		expect(compactEmptyRows(null).changed).toBe(false)
	})
})
