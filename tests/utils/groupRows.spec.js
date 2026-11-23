/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Grouping a list by one field, with a count per group.
 *
 * The counts are the part that can be wrong while looking right: a page count
 * shown as though it were the total is a number somebody will quote in a
 * meeting.
 */

const { UNGROUPED_KEY, groupRows } = require('../../src/utils/groupRows.js')

const ROWS = [
	{ id: 1, status: 'open', assignee: 'alice' },
	{ id: 2, status: 'open', assignee: 'bob' },
	{ id: 3, status: 'closed', assignee: 'alice' },
	{ id: 4, status: 'open', assignee: null },
	{ id: 5, status: '', assignee: '   ' },
]

describe('grouping', () => {
	it('groups by the field, biggest first', () => {
		const { groups } = groupRows({ rows: ROWS, field: 'status' })

		expect(groups.map((group) => [group.key, group.count])).toEqual([
			['open', 3],
			['closed', 1],
			[UNGROUPED_KEY, 1],
		])
	})

	it('keeps rows with no value as their own group, last', () => {
		// The rows somebody opens a grouped list to find. Leading with them
		// would read as though "no assignee" were how work is organised.
		const { groups } = groupRows({ rows: ROWS, field: 'assignee' })

		expect(groups[groups.length - 1].key).toBe(UNGROUPED_KEY)
		expect(groups[groups.length - 1].count).toBe(2)
		expect(groups[groups.length - 1].value).toBeNull()
	})

	it('says when the counts are of a page rather than of the query', () => {
		// "Open (12)" on page one of nine is a count of this page. Both
		// numbers are legitimate; showing one as the other is not.
		expect(groupRows({ rows: ROWS, field: 'status', paged: true }).partial).toBe(true)
		expect(groupRows({ rows: ROWS, field: 'status' }).partial).toBe(false)
	})

	it('groups nothing when no field is named', () => {
		expect(groupRows({ rows: ROWS }).groups).toEqual([])
	})

	it('keeps every row, so a group total equals the list total', () => {
		// The assertion that catches a grouping which quietly drops a shape it
		// did not expect.
		const { groups } = groupRows({ rows: ROWS, field: 'status' })
		const grouped = groups.reduce((sum, group) => sum + group.count, 0)

		expect(grouped).toBe(ROWS.length)
	})
})
