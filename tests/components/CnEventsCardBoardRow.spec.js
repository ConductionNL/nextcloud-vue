/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak Afspraken: an appointment row reads "21 okt, 14:00 tot 15:00 ·
 * Stadskantoor, zaal 2.04 · Fatima El-Amrani" with "Uitgenodigd" at its end.
 *
 * @spec openspec/changes/events-card-board-row/specs/events-card/spec.md#requirement-an-appointment-row-names-who-is-invited-and-where-they-stand
 */
import { mount } from '@vue/test-utils'
import CnEventsCard from '../../src/components/CnEventsCard/CnEventsCard.vue'

async function flush(w, n = 5) {
	for (let i = 0; i < n; i++) {
		await w.vm.$nextTick()
		await new Promise((r) => setTimeout(r, 0))
	}
}

describe('CnEventsCard board row', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('writes the day and the hours, the place and the invitee, and where the invitee stands', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [
			{ id: 'e1', summary: 'Hoorzitting bezwaar parkeerboete', dtstart: '2026-10-21T14:00:00', dtend: '2026-10-21T15:00:00', location: 'Stadskantoor, zaal 2.04', attendees: [{ name: 'Fatima El-Amrani', status: 'invited' }] },
		] }) })
		const w = mount(CnEventsCard, {
			props: { objectId: 'task-1', content: { source: { kind: 'flow-task' } } },
			global: { stubs: { NcLoadingIcon: true, CnCalendarEventCreate: true, CnCalendarEventPicker: true } },
		})
		await flush(w)
		const when = w.find('.cn-events-card__when').text()
		expect(when).toContain('14:00')
		expect(when).toContain('15:00')
		expect(when).not.toContain('2026')
		expect(w.find('.cn-events-card__who').text()).toBe('Fatima El-Amrani')
		expect(w.find('.cn-events-card__status').text()).toBe('Invited')
	})
})
