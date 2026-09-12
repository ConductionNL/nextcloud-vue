/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * stagesModel: stage ordering and the body a `field` move saves, without a
 * DOM.
 *
 * What is ALLOWED is no longer decided here. It comes from OpenRegister's
 * `/available-actions`, covered in useLifecycleTransitions.spec.js.
 */
import {
	normalizeStages,
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
