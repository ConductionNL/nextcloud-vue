/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	placeNewWidget,
	getDashboardColumnOpts,
	DEFAULT_GRID_BREAKPOINTS,
} from '../../src/utils/dashboardPlacement.js'

describe('placeNewWidget', () => {
	it('places the first widget at the top-left with defaults', () => {
		const r = placeNewWidget({}, [])
		expect(r).toMatchObject({ x: 0, y: 0, w: 4, h: 4, pushed: [] })
	})

	it('honours an explicit size', () => {
		const r = placeNewWidget({ w: 6, h: 2 }, [])
		expect(r).toMatchObject({ x: 0, y: 0, w: 6, h: 2 })
	})

	it('finds the next free slot to the right (no collision)', () => {
		const layout = [{ id: 'a', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 4 }]
		const r = placeNewWidget({ w: 4, h: 4 }, layout, { columns: 12 })
		expect(r).toMatchObject({ x: 4, y: 0, pushed: [] })
	})

	it('pushes overlapping widgets down when the only slot is off-screen', () => {
		// Fill the visible viewport so the scan finds nothing within viewportRows.
		const layout = []
		for (let y = 0; y < 8; y++) {
			layout.push({ id: `r${y}`, gridX: 0, gridY: y, gridWidth: 12, gridHeight: 1 })
		}
		const r = placeNewWidget({ w: 12, h: 2 }, layout, { columns: 12, viewportRows: 8 })
		expect(r).toMatchObject({ x: 0, y: 0, w: 12, h: 2 })
		// the items overlapping the new (0,0,12,2) rect get pushed to gridY = h (2)
		expect(r.pushed.length).toBeGreaterThan(0)
		expect(r.pushed.every(p => p.gridY === 2)).toBe(true)
	})

	it('tolerates a non-array layout', () => {
		expect(placeNewWidget({}, null)).toMatchObject({ x: 0, y: 0 })
	})
})

describe('getDashboardColumnOpts', () => {
	it('returns the default breakpoints + moveScale layout', () => {
		const opts = getDashboardColumnOpts()
		expect(opts.layout).toBe('moveScale')
		expect(opts.breakpointForWindow).toBe(true)
		expect(opts.breakpoints).toEqual(DEFAULT_GRID_BREAKPOINTS.map(b => ({ ...b })))
	})

	it('returns a fresh copy (mutation-safe)', () => {
		const opts = getDashboardColumnOpts()
		opts.breakpoints[0].c = 99
		expect(DEFAULT_GRID_BREAKPOINTS[0].c).toBe(12)
	})

	it('accepts a custom breakpoint table + layout', () => {
		const bp = [{ w: 1000, c: 10 }, { w: 500, c: 1 }]
		const opts = getDashboardColumnOpts(bp, 'list')
		expect(opts.layout).toBe('list')
		expect(opts.breakpoints).toEqual(bp)
	})
})
