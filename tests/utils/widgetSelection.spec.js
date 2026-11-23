/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The page's row selection that a following card reads (DqZaaktypeVelden:
 * the Keuzelijst card shows the options of the field selected in the Velden
 * table, or of the first field that has a choice list).
 *
 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md
 */
import { createWidgetSelection, followedRow } from '../../src/utils/widgetSelection.js'

const ROWS = [
	{ id: 'a', name: 'Bouwkosten', enumValues: [] },
	{ id: 'b', name: 'Soort bouwwerk', enumValues: ['Woning', 'Dakkapel'] },
	{ id: 'c', name: 'Gebruik', enumValues: ['Wonen'] },
]
const WHEN = { field: 'enumValues', op: 'notEmpty' }

describe('widget selection', () => {
	it('keeps the rows and the selected row a widget publishes', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		selection.select('fields', ROWS[2])
		expect(selection.entry('fields')).toEqual({ rows: ROWS, selected: ROWS[2] })
		expect(selection.entry('other')).toEqual({ rows: [], selected: null })
	})

	it('drops a selection whose row left the list', () => {
		const selection = createWidgetSelection()
		selection.publishRows('fields', ROWS)
		selection.select('fields', ROWS[2])
		selection.publishRows('fields', ROWS.slice(0, 2))
		expect(selection.entry('fields').selected).toBeNull()
	})

	it('follows the selected row when it matches', () => {
		expect(followedRow({ rows: ROWS, selected: ROWS[2] }, { when: WHEN })).toBe(ROWS[2])
	})

	it('falls back to the first matching row while nothing is selected', () => {
		expect(followedRow({ rows: ROWS, selected: null }, { when: WHEN })).toBe(ROWS[1])
		expect(followedRow({ rows: ROWS, selected: null }, {})).toBe(ROWS[0])
	})

	it('follows nothing when the selected row does not match, or there are no rows', () => {
		expect(followedRow({ rows: ROWS, selected: ROWS[0] }, { when: WHEN })).toBeNull()
		expect(followedRow({ rows: [], selected: null }, { when: WHEN })).toBeNull()
		expect(followedRow(null, { when: WHEN })).toBeNull()
	})
})
