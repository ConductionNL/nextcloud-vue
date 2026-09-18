/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Work laid out on a time scale, in lanes, with the overlaps left visible.
 *
 * 🔴 IT HIDES NOTHING. That is the requirement and it is the whole reason this
 * view exists: a planner opens it to find the week where three things land on
 * one person. A layout that stacked overlapping bars on top of each other, or
 * quietly dropped the second one, would answer "looks fine" to the one
 * question being asked. Overlapping bars are given their own row WITHIN the
 * lane, so the lane grows taller rather than losing a bar.
 *
 * 🔴 A ROW WITH NO USABLE DATES IS NOT DROPPED, IT IS UNPLANNED. Work with no
 * start or no end is exactly what a planner is looking for, and a time scale
 * has nowhere to put it. It goes to a visible unplanned lane instead of off
 * the view.
 *
 * 🔴 NOTHING HERE RESCHEDULES ANYTHING. The window is the reader's choice and
 * this function only reads. A date-axis view that wrote back on drag would be
 * moving statutory dates from a picture.
 *
 * Pure: no store, no fetch, no Vue.
 */

/** Rows that cannot be placed on the scale land here. */
export const UNPLANNED_LANE = '__unplanned__'

/**
 * Parse a value into a timestamp, or null when it is not a date.
 *
 * @param {string|number|Date|null|undefined} value - The stored value.
 * @return {?number} Milliseconds, or null.
 */
function instantOf(value) {
	if (value === undefined || value === null || value === '') {
		return null
	}
	const parsed = new Date(value).getTime()
	return Number.isNaN(parsed) ? null : parsed
}

/**
 * Lay rows out on a time scale.
 *
 * @param {object} options - The call.
 * @param {Array<object>} [options.rows] - The rows the list holds.
 * @param {string} options.startField - Where a row's start is.
 * @param {string} options.endField - Where its end is.
 * @param {string} [options.laneField] - What to put in a lane together.
 * @param {string} [options.unplannedLabel] - What to call the unplanned lane.
 *
 * @return {{lanes: Array<object>, unplanned: object, window: object}} The
 *   lanes, each `{ key, label, tracks }` where a track is a row of
 *   non-overlapping bars; the unplanned lane; and the window the bars span.
 */
export function buildDateAxisLanes({
	rows = [],
	startField = '',
	endField = '',
	laneField = '',
	unplannedLabel = 'Unplanned',
} = {}) {
	const placeable = []
	const unplaceable = []

	for (const row of rows) {
		const start = instantOf(row?.[startField])
		const end = instantOf(row?.[endField])
		// BOTH ends, and in order. A bar that ends before it starts is bad
		// data, and drawing it backwards would be a picture of something that
		// did not happen.
		if (start === null || end === null || end < start) {
			unplaceable.push(row)
			continue
		}
		placeable.push({ row, start, end })
	}

	const byLane = new Map()
	for (const bar of placeable) {
		const raw = laneField === '' ? '' : bar.row?.[laneField]
		const empty = raw === undefined || raw === null || String(raw).trim() === ''
		const key = laneField === '' ? '' : (empty ? UNPLANNED_LANE : String(raw))
		if (byLane.has(key) === false) {
			byLane.set(key, { key, label: key === UNPLANNED_LANE ? unplannedLabel : key, bars: [] })
		}
		byLane.get(key).bars.push(bar)
	}

	// Named lanes alphabetically, and the no-value lane LAST whatever it
	// sorts as. `__unplanned__` sorts before every letter, so leaving it to
	// localeCompare would open the view on the work nobody has taken, which
	// reads as though that were the normal state of it.
	const lanes = [...byLane.values()]
		.sort((left, right) => {
			if (left.key === UNPLANNED_LANE) {
				return 1
			}
			if (right.key === UNPLANNED_LANE) {
				return -1
			}
			return String(left.key).localeCompare(String(right.key))
		})
		.map((lane) => ({
			key: lane.key,
			label: lane.label,
			tracks: packIntoTracks(lane.bars),
		}))

	const instants = placeable.flatMap((bar) => [bar.start, bar.end])

	return {
		lanes,
		unplanned: { key: UNPLANNED_LANE, label: unplannedLabel, rows: unplaceable },
		window: instants.length === 0
			? { from: null, to: null }
			: { from: Math.min(...instants), to: Math.max(...instants) },
	}
}

/**
 * Bars into as few non-overlapping rows as they need.
 *
 * Earliest first, then each bar into the first track whose last bar has
 * already ended. Two bars that overlap end up on two tracks, which is how the
 * overlap becomes visible rather than hidden behind another bar.
 *
 * @param {Array<object>} bars - The bars in one lane.
 * @return {Array<Array<object>>} The tracks.
 */
function packIntoTracks(bars) {
	const ordered = [...bars].sort((left, right) => left.start - right.start || left.end - right.end)
	const tracks = []

	for (const bar of ordered) {
		const track = tracks.find((candidate) => candidate[candidate.length - 1].end <= bar.start)
		if (track) {
			track.push(bar)
			continue
		}
		tracks.push([bar])
	}

	return tracks
}
