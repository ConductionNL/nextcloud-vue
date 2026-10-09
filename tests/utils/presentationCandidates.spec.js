/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/view-presentation-picker/tasks.md#task-1
 */
import { isPresentationComplete, presentationCandidates, presentationErrorPath } from '../../src/utils/presentationCandidates.js'

const SCHEMA = {
	'x-openregister-lifecycle': { field: 'phase' },
	properties: {
		status: { type: 'string', title: 'Status', enum: ['new', 'open', 'done'] },
		phase: { type: 'string', title: 'Phase' },
		client: { type: 'string', title: 'Client', $ref: 'client' },
		tags: { type: 'array', $ref: 'tag' },
		title: { type: 'string' },
		amount: { type: 'number' },
		due: { type: 'string', format: 'date' },
		closed: { type: 'string', format: 'date-time' },
		meta: { type: 'object' },
	},
}

describe('presentationCandidates', () => {
	const c = presentationCandidates(SCHEMA)

	it('offers an enum string, the lifecycle state and a single relation as group fields', () => {
		expect(c.group.map((g) => g.key)).toEqual(['status', 'phase', 'client'])
		expect(c.group[0].values).toEqual(['new', 'open', 'done'])
		expect(c.group[1].values).toBeNull()
	})

	it('offers scalars as card fields, never an object or an array', () => {
		expect(c.card.map((x) => x.key)).toEqual(['status', 'phase', 'client', 'title', 'amount', 'due', 'closed'])
	})

	it('offers date and date-time properties as date fields', () => {
		expect(c.date.map((x) => x.key)).toEqual(['due', 'closed'])
	})

	it('says why a type is unavailable when its role has no candidate', () => {
		const empty = presentationCandidates({ properties: { title: { type: 'string' } } })
		expect(empty.reasons.calendar).toBe('This schema has no date field')
		expect(empty.reasons.kanban).not.toBe('')
		expect(c.reasons).toEqual({ kanban: '', calendar: '' })
		expect(presentationCandidates(null).group).toEqual([])
	})
})

describe('isPresentationComplete / presentationErrorPath', () => {
	it('requires a group field for a board and a date field for a calendar', () => {
		expect(isPresentationComplete({ viewType: 'table' })).toBe(true)
		expect(isPresentationComplete({ viewType: 'kanban', kanban: {} })).toBe(false)
		expect(isPresentationComplete({ viewType: 'kanban', kanban: { groupByField: 'status' } })).toBe(true)
		expect(isPresentationComplete({ viewType: 'calendar', calendar: { endDateField: 'due' } })).toBe(false)
		expect(isPresentationComplete({ viewType: 'calendar', calendar: { dateField: 'due' } })).toBe(true)
	})

	it('finds the literal path a refusal names, endDateField before dateField', () => {
		expect(presentationErrorPath('presentation.kanban.groupByField: not a property')).toBe('kanban.groupByField')
		expect(presentationErrorPath('calendar.endDateField is not a date')).toBe('calendar.endDateField')
		expect(presentationErrorPath('calendar.dateField missing')).toBe('calendar.dateField')
		expect(presentationErrorPath('something else')).toBe('')
	})
})
