/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * stagesModel: stage ordering, the availability mapping and the refusal
 * reason, without a DOM.
 */
import {
	buildAvailability,
	inputMode,
	normalizeOptions,
	normalizeStages,
	refusalReason,
} from '../../src/components/CnStagesWidget/stagesModel.js'

describe('normalizeStages', () => {
	it('orders by the order field, unnumbered rows last, ties by id', () => {
		const stages = normalizeStages([
			{ id: 'z', name: 'Unplaced' },
			{ id: 'c', name: 'Third', order: '3' },
			{ id: 'b', name: 'Tie B', order: 1 },
			{ id: 'a', name: 'Tie A', order: 1 },
		], { orderField: 'order' })

		expect(stages.map((s) => s.id)).toEqual(['a', 'b', 'c', 'z'])
	})

	it('keeps the arrival order without an order field', () => {
		const stages = normalizeStages([{ id: 'b', name: 'B' }, { id: 'a', name: 'A' }])
		expect(stages.map((s) => s.id)).toEqual(['b', 'a'])
	})

	it('reads labels, descriptions and the closing flag through the mapping', () => {
		const [stage] = normalizeStages(
			[{ uuid: 'u-1', title: { nl: 'Afgehandeld', en: 'Closed' }, info: 'The end', final: '1' }],
			{ labelField: 'title', descriptionField: 'info', finalField: 'final' },
		)
		expect(stage).toEqual({ id: 'u-1', label: 'Afgehandeld', subtitle: 'The end', final: true })
	})

	it('drops rows without an id', () => {
		expect(normalizeStages([{ name: 'No id' }, null, 'x'])).toEqual([])
	})
})

describe('normalizeOptions', () => {
	it('maps result rows to id and label', () => {
		expect(normalizeOptions([{ id: 'r1', name: 'Granted' }, { id: 'r2' }])).toEqual([
			{ id: 'r1', label: 'Granted' },
			{ id: 'r2', label: 'r2' },
		])
	})
})

describe('inputMode', () => {
	it.each([
		['required', 'required'],
		['optional', 'optional'],
		[true, 'optional'],
		['true', 'optional'],
		[false, ''],
		[undefined, ''],
	])('reads %p as %p', (value, mode) => {
		expect(inputMode(value)).toBe(mode)
	})
})

describe('buildAvailability', () => {
	it('uses the plain default field names', () => {
		const moves = buildAvailability([
			{ stage: 's2', allowed: true, requiresComment: 'required', requiresResult: true, resultOptions: [{ id: 'r', name: 'R' }] },
			{ stage: 's3', allowed: false, reason: 'Missing a document' },
		])
		expect(moves.get('s2')).toEqual({ moveId: 's2', allowed: true, reason: '', comment: 'required', result: true, resultOptions: [{ id: 'r', label: 'R' }] })
		expect(moves.get('s3')).toMatchObject({ allowed: false, reason: 'Missing a document' })
	})

	it('blocks only on an explicit false', () => {
		const moves = buildAvailability([{ stage: 's2' }, { stage: 's3', allowed: 0 }])
		expect(moves.get('s2').allowed).toBe(true)
		expect(moves.get('s3').allowed).toBe(true)
	})

	it('maps a dossiq-shaped answer through the configured fields', () => {
		const moves = buildAvailability([
			{ id: 'tr-1', toStatus: 'st-2', guardsPassed: false, failedGuards: [{ type: 'role', failureMessage: 'Only a coordinator may close.' }] },
		], { stageField: 'toStatus', moveField: 'id', allowedField: 'guardsPassed', reasonField: 'failedGuards.0.failureMessage' })

		expect(moves.get('st-2')).toMatchObject({ moveId: 'tr-1', allowed: false, reason: 'Only a coordinator may close.' })
	})

	it('lets the first open route to a stage win over a blocked one', () => {
		const moves = buildAvailability([
			{ stage: 's', move: 'blocked', allowed: false },
			{ stage: 's', move: 'open' },
			{ stage: 's', move: 'later' },
		], { moveField: 'move' })
		expect(moves.get('s').moveId).toBe('open')
	})

	it('ignores entries without a stage', () => {
		expect(buildAvailability([{ allowed: true }, null]).size).toBe(0)
		expect(buildAvailability(null).size).toBe(0)
	})
})

describe('refusalReason', () => {
	it('prefers the configured field, then message, then error', () => {
		expect(refusalReason({ error: 'E', message: 'M', guards: [{ text: 'G' }] }, 'guards.0.text')).toBe('G')
		expect(refusalReason({ error: 'E', message: 'M' })).toBe('M')
		expect(refusalReason({ error: 'E' })).toBe('E')
	})

	it('returns nothing for a body that says nothing', () => {
		expect(refusalReason(undefined)).toBe('')
		expect(refusalReason({ code: 409 })).toBe('')
	})
})
