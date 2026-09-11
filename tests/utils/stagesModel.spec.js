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
	stageSavePayload,
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
		expect(moves.get('s2')).toEqual({ moveId: 's2', allowed: true, reason: '', comment: 'required', result: 'optional', resultOptions: [{ id: 'r', label: 'R' }] })
		expect(moves.get('s3')).toMatchObject({ allowed: false, reason: 'Missing a document' })
	})

	// THE GUARD MUST FAIL CLOSED ON EVERY SHAPE OF FALSE. A JSON round trip, a
	// database column or a form post produces '0', 'false' and 0 where the
	// schema said boolean, and each one used to read as "not refused": the
	// stage rendered enabled and a click POSTed a move the server had closed,
	// with the refusal reason discarded because it is only read when blocked.
	it.each([
		[false],
		[0],
		['0'],
		['false'],
	])('blocks on %p', (value) => {
		const moves = buildAvailability([{ stage: 's', allowed: value, reason: 'Not yours to make' }])
		expect(moves.get('s').allowed).toBe(false)
		expect(moves.get('s').reason).toBe('Not yours to make')
	})

	// ABSENT MEANS ALLOWED, deliberately: an endpoint that lists only the
	// reachable stages says nothing about the flag, and must keep working.
	it.each([
		[undefined],
		[null],
		[true],
		['true'],
		[1],
		['1'],
	])('allows %p', (value) => {
		const moves = buildAvailability([{ stage: 's', allowed: value }])
		expect(moves.get('s').allowed).toBe(true)
	})

	it('does not read a stage id or a label as a refusal', () => {
		// '' and 'no' are neither in the true list nor the false list. Only the
		// four decided shapes block, so a stray value never silently closes a
		// stage the server left open.
		expect(buildAvailability([{ stage: 's', allowed: '' }]).get('s').allowed).toBe(true)
		expect(buildAvailability([{ stage: 's', allowed: 'no' }]).get('s').allowed).toBe(true)
	})

	// `result` carries the SAME three-state mode as `comment`. Collapsed to a
	// boolean, 'optional' forced a result nobody asked for and 'required' was
	// indistinguishable from it.
	it.each([
		['required', 'required'],
		['optional', 'optional'],
		[true, 'optional'],
		[false, ''],
		[undefined, ''],
	])('reads requiresResult %p as %p', (value, mode) => {
		const moves = buildAvailability([{ stage: 's', requiresResult: value }])
		expect(moves.get('s').result).toBe(mode)
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

describe('stageSavePayload', () => {
	// A `field` transition is a PUT, and the registry default, so this is the
	// out-of-the-box write path.
	const record = {
		'@self': { id: 'c-1', register: 'dossiq', schema: 'case' },
		id: 'c-1',
		title: 'A case',
		status: 'st-new',
		assignee: null,
		attachments: [],
		address: {},
		open: false,
		count: 0,
		note: '',
	}

	it('sets the stage and the id', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-work')
		expect(payload.status).toBe('st-work')
		expect(payload.id).toBe('c-1')
	})

	it('keeps the record’s own properties, because a PUT replaces the object', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-work')
		expect(payload.title).toBe('A case')
	})

	// OpenRegister REFUSES {}, [] and null on an object property, and says so by
	// rejecting the whole write. Sending the record straight back meant a case
	// carrying one empty object property could not change its stage at all.
	it('omits the shapes OpenRegister refuses', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-work')
		expect(payload).not.toHaveProperty('assignee')
		expect(payload).not.toHaveProperty('attachments')
		expect(payload).not.toHaveProperty('address')
	})

	it('keeps falsey values that are not empty', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-work')
		expect(payload.open).toBe(false)
		expect(payload.count).toBe(0)
		expect(payload.note).toBe('')
	})

	it('never sends the @self envelope, which is the server’s, not a property', () => {
		expect(stageSavePayload(record, 'c-1', 'status', 'st-work')).not.toHaveProperty('@self')
	})

	it('carries the comment and the result under the configured keys', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-done', { toelichting: 'Done', resultaat: 'r-1' })
		expect(payload.toelichting).toBe('Done')
		expect(payload.resultaat).toBe('r-1')
	})

	it('lets the stage and the id win over anything the extras carry', () => {
		const payload = stageSavePayload(record, 'c-1', 'status', 'st-done', { status: 'nonsense', id: 'other' })
		expect(payload.status).toBe('st-done')
		expect(payload.id).toBe('c-1')
	})
})
