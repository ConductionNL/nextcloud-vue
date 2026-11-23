/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Work laid out on a time scale, in lanes, with the overlaps left visible.
 *
 * The view exists to find the week where three things land on one person, so
 * every case here is a way to answer "looks fine" to that question: an overlap
 * drawn on top of another bar, or a row with no dates quietly off the view.
 */

const { UNPLANNED_LANE, buildDateAxisLanes } = require('../../src/utils/dateAxisLanes.js')

function call(rows, extra = {}) {
	return buildDateAxisLanes({ rows, startField: 'from', endField: 'to', ...extra })
}

describe('overlaps stay visible', () => {
	it('puts two overlapping bars on two tracks', () => {
		// Stacking them would answer "looks fine" to the one question the view
		// is opened to ask.
		const { lanes } = call([
			{ id: 1, from: '2026-01-01', to: '2026-01-10', who: 'alice' },
			{ id: 2, from: '2026-01-05', to: '2026-01-15', who: 'alice' },
		], { laneField: 'who' })

		expect(lanes[0].tracks).toHaveLength(2)
	})

	it('keeps two bars that do not overlap on one track', () => {
		// The control: a layout that gave every bar its own track would pass
		// the test above and make every lane as tall as it has work.
		const { lanes } = call([
			{ id: 1, from: '2026-01-01', to: '2026-01-05', who: 'alice' },
			{ id: 2, from: '2026-01-06', to: '2026-01-10', who: 'alice' },
		], { laneField: 'who' })

		expect(lanes[0].tracks).toHaveLength(1)
		expect(lanes[0].tracks[0]).toHaveLength(2)
	})
})

describe('rows that cannot be placed', () => {
	it('go to a visible unplanned lane, not off the view', () => {
		// Work with no dates is exactly what a planner is looking for.
		const { unplanned, lanes } = call([
			{ id: 1, from: '2026-01-01', to: '2026-01-05' },
			{ id: 2, from: '2026-01-01' },
			{ id: 3 },
		])

		expect(unplanned.rows.map((row) => row.id)).toEqual([2, 3])
		expect(lanes[0].tracks[0]).toHaveLength(1)
	})

	it('treats a bar that ends before it starts as unplanned', () => {
		// Bad data. Drawing it backwards would be a picture of something that
		// did not happen.
		const { unplanned } = call([{ id: 1, from: '2026-02-01', to: '2026-01-01' }])

		expect(unplanned.rows.map((row) => row.id)).toEqual([1])
	})

	it('treats an unparseable date as unplanned rather than as epoch zero', () => {
		const { unplanned } = call([{ id: 1, from: 'volgende week', to: '2026-01-05' }])

		expect(unplanned.rows.map((row) => row.id)).toEqual([1])
	})
})

describe('lanes', () => {
	it('are one per value of the lane field, with no value named', () => {
		const { lanes } = call([
			{ id: 1, from: '2026-01-01', to: '2026-01-02', who: 'bob' },
			{ id: 2, from: '2026-01-01', to: '2026-01-02', who: 'alice' },
			{ id: 3, from: '2026-01-01', to: '2026-01-02' },
		], { laneField: 'who', unplannedLabel: 'Niemand' })

		expect(lanes.map((lane) => lane.key)).toEqual(['alice', 'bob', UNPLANNED_LANE])
		expect(lanes[2].label).toBe('Niemand')
	})

	it('are one unnamed lane when no lane field is given', () => {
		const { lanes } = call([{ id: 1, from: '2026-01-01', to: '2026-01-02' }])

		expect(lanes).toHaveLength(1)
		expect(lanes[0].key).toBe('')
	})
})

describe('the window', () => {
	it('spans the earliest start to the latest end', () => {
		const { window } = call([
			{ id: 1, from: '2026-01-05', to: '2026-01-10' },
			{ id: 2, from: '2026-01-01', to: '2026-01-03' },
		])

		expect(new Date(window.from).toISOString().slice(0, 10)).toBe('2026-01-01')
		expect(new Date(window.to).toISOString().slice(0, 10)).toBe('2026-01-10')
	})

	it('is empty when nothing can be placed, rather than 1970', () => {
		// A window defaulting to epoch would draw every unplanned board as
		// fifty-six years wide.
		expect(call([{ id: 1 }]).window).toEqual({ from: null, to: null })
	})
})
