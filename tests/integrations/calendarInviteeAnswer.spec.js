/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An appointment without a status shows where its invitees stand
 * (DqZaakTaken Afspraken "Uitgenodigd"; r31 drew no pill).
 *
 * @spec openspec/changes/calendar-invitee-answer/specs/calendar-integration/spec.md
 */
import { eventAttendeeNames, eventStatusLabel, eventStatusVariant, inviteeAnswer } from '../../src/integrations/builtin/calendar/eventStatus.js'

const invited = { attendees: [{ name: 'Sanne de Vries', email: 'sanne@demo.example', partstat: 'needs-action' }] }

describe('calendar invitee answer', () => {
	it('reads an invitee still to answer as invited', () => {
		expect(inviteeAnswer(invited)).toBe('needs-action')
		expect(eventStatusLabel(invited)).toBe('Invited')
		expect(eventStatusVariant(invited)).toBe('info')
		expect(eventAttendeeNames(invited)).toEqual(['Sanne de Vries'])
	})

	it('puts a decline first and calls all accepted accepted', () => {
		expect(inviteeAnswer({ attendees: [{ partstat: 'accepted' }, { partstat: 'declined' }] })).toBe('declined')
		expect(eventStatusLabel({ attendees: [{ partstat: 'accepted' }, { partstat: 'accepted' }] })).toBe('Accepted')
	})

	it('keeps the event status first and says nothing without answers', () => {
		expect(eventStatusLabel({ status: 'CONFIRMED', ...invited })).toBe('Confirmed')
		expect(eventStatusLabel({ attendees: ['sanne@demo.example'] })).toBe('')
		expect(eventStatusLabel({})).toBe('')
	})
})
