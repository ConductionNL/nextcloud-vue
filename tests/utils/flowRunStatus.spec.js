/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { flowRunCounters, flowRunSubjects } from '../../src/utils/flowRunStatus.js'

describe('flowRunSubjects', () => {
	it('reads the declared subjects with their roles', () => {
		const run = { subjectUuid: 'x', subjects: { case: { uuid: 'c1' }, decision: { uuid: 'd1' } } }

		expect(flowRunSubjects(run)).toEqual([{ role: 'case', uuid: 'c1' }, { role: 'decision', uuid: 'd1' }])
	})

	it('falls back to the object the trigger fired on, in either shape', () => {
		expect(flowRunSubjects({ subjects: {}, subjectUuid: 'x' })).toEqual([{ role: '', uuid: 'x' }])
		expect(flowRunSubjects({ subject: { uuid: 'y' } })).toEqual([{ role: '', uuid: 'y' }])
	})

	it('is empty for a run about nothing', () => {
		expect(flowRunSubjects({})).toEqual([])
		expect(flowRunSubjects(null)).toEqual([])
	})
})

describe('flowRunCounters', () => {
	const tiles = (runs) => Object.fromEntries(flowRunCounters(runs).map((tile) => [tile.id, tile]))

	it('counts by outcome and gives the finished share', () => {
		const result = tiles([
			{ status: 'completed' },
			{ status: 'completed' },
			{ status: 'completed' },
			{ status: 'failed' },
			{ status: 'dead_letter' },
			{ status: 'suspended' },
			{ status: 'awaiting_consent' },
			{ status: 'running' },
		])

		expect(result.runs.count).toBe(8)
		expect(result.finished).toMatchObject({ count: 3, note: '38%', variant: 'success' })
		expect(result.failed).toMatchObject({ count: 2, variant: 'error' })
		expect(result.waiting.count).toBe(2)
	})

	it('counts a subject once, and names the roles', () => {
		const result = tiles([
			{ status: 'completed', subjects: { case: { uuid: 'c1' } } },
			{ status: 'completed', subjects: { case: { uuid: 'c1' }, decision: { uuid: 'd1' } } },
			{ status: 'completed', subjectUuid: 'x' },
		])

		expect(result.subjects).toMatchObject({ count: 3, note: 'case, decision' })
	})

	it('says nothing about a share of no runs', () => {
		expect(tiles([]).finished).toMatchObject({ count: 0, note: '' })
	})
})
