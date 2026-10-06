/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { auditEvents, fieldEvents, parseMoment, relatedEvents, sortEvents, timelineEntryEvents } from '../../src/utils/timelineEvents.js'

const now = new Date('2026-10-06T12:00:00Z')

describe('timelineEvents', () => {
	it('reads a bare date as that calendar day, not the day before', () => {
		const m = parseMoment('2026-10-07')
		expect(m.dateOnly).toBe(true)
		expect(m.at.getDate()).toBe(7)
		expect(parseMoment('not a date')).toBeNull()
		expect(parseMoment(null)).toBeNull()
	})

	it('turns configured date fields into events, skipping empty ones, and marks the future upcoming', () => {
		const booking = { '@self': { created: '2026-09-01T09:00:00Z' }, depositClearedAt: '2026-09-03T10:00:00Z', confirmationSentAt: null, startsAt: '2026-11-01' }
		const events = fieldEvents(booking, [
			{ field: '@self.created', label: 'Booking created' },
			{ field: 'depositClearedAt', label: 'Deposit cleared' },
			{ field: 'confirmationSentAt', label: 'Confirmation mail sent' },
			{ field: 'startsAt', label: 'Starts' },
		], now)
		expect(events.map((e) => e.label)).toEqual(['Booking created', 'Deposit cleared', 'Starts'])
		expect(events.map((e) => e.upcoming)).toEqual([false, false, true])
	})

	it('turns related rows, audit entries and timeline entries into events', () => {
		expect(relatedEvents([{ '@self': { id: 'p1', created: '2026-09-02T00:00:00Z' }, title: 'Payment 1' }], { schema: 'payment', label: 'Payment received' }, now)[0])
			.toMatchObject({ id: 'related:payment:p1', label: 'Payment received', detail: 'Payment 1', source: 'related' })
		expect(auditEvents([{ id: 7, action: 'update', actorDisplayName: 'Ruben', created: '2026-09-05T00:00:00Z' }], (a, b) => `${a}/${b}`, now)[0])
			.toMatchObject({ id: 'audit:7', label: 'update/Ruben', source: 'audit' })
		expect(timelineEntryEvents([{ id: 3, author: 'Ana', message: 'Called back', created: '2026-09-04T00:00:00Z' }], 'Note', now)[0])
			.toMatchObject({ label: 'Note', detail: 'Ana: Called back', source: 'timeline' })
	})

	it('sorts oldest first by default and newest first on request', () => {
		const a = { at: new Date('2026-01-02') }
		const b = { at: new Date('2026-01-01') }
		expect(sortEvents([a, b])).toEqual([b, a])
		expect(sortEvents([b, a], 'desc')).toEqual([a, b])
	})
})
