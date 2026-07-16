/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for the shared responsive grid engine helper.
 */

import { cnGridCellStyle, hasGridRow, GRID_COLUMNS, GRID_COLUMNS_MD } from '../../src/utils/grid.js'

describe('cnGridCellStyle', () => {
	it('emits column start + span vars (1-based)', () => {
		const style = cnGridCellStyle({ gridX: 2, gridWidth: 4 })
		expect(style['--cn-grid-cs']).toBe(3)
		expect(style['--cn-grid-cspan']).toBe(4)
	})

	it('clamps the medium-breakpoint span to 6', () => {
		expect(cnGridCellStyle({ gridWidth: 12 })['--cn-grid-cspan-md']).toBe(6)
		expect(cnGridCellStyle({ gridWidth: 3 })['--cn-grid-cspan-md']).toBe(3)
	})

	it('defaults the span to the full column count', () => {
		expect(cnGridCellStyle({}, 12)['--cn-grid-cspan']).toBe(12)
		expect(cnGridCellStyle({}, 1)['--cn-grid-cspan']).toBe(1)
	})

	it('only emits row vars when an explicit height is given', () => {
		const noRow = cnGridCellStyle({ gridX: 0, gridWidth: 6 })
		expect(noRow['--cn-grid-rs']).toBeUndefined()
		const withRow = cnGridCellStyle({ gridX: 0, gridWidth: 6, gridY: 1, gridHeight: 3 })
		expect(withRow['--cn-grid-rs']).toBe(2)
		expect(withRow['--cn-grid-rspan']).toBe(3)
	})
})

describe('hasGridRow', () => {
	it('is true only with both gridY and gridHeight', () => {
		expect(hasGridRow({ gridY: 0, gridHeight: 2 })).toBe(true)
		expect(hasGridRow({ gridY: 0 })).toBe(false)
		expect(hasGridRow({ gridHeight: 2 })).toBe(false)
		expect(hasGridRow({})).toBe(false)
	})
})

describe('grid constants', () => {
	it('expose the 12 → 6 collapse', () => {
		expect(GRID_COLUMNS).toBe(12)
		expect(GRID_COLUMNS_MD).toBe(6)
	})
})
