/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak: an appointment row carries the day it starts on and a note row its
 * author's initials, as a tile before the text.
 *
 * @spec openspec/changes/board-task-cards-rows/specs/task-cards/spec.md#requirement-board-appointment-and-note-rows-carry-a-tile-and-a-meta-line
 */
import { mount } from '@vue/test-utils'
import CnEventsCard from '../../src/components/CnEventsCard/CnEventsCard.vue'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([]),
	searchNextcloudGroups: jest.fn().mockResolvedValue([]),
}))

async function flush(w, n = 5) {
	for (let i = 0; i < n; i++) {
		await w.vm.$nextTick()
		await new Promise((r) => setTimeout(r, 0))
	}
}
const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('task card rows', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('puts the start day before an appointment, and no tile when it has no start', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: [
			{ id: 'e1', summary: 'Hoorzitting', dtstart: '2026-10-21T14:00:00', dtend: '2026-10-21T15:00:00', location: 'zaal 2.04' },
			{ id: 'e2', summary: 'Zonder tijd' },
		] }))
		const w = mount(CnEventsCard, {
			props: { objectId: 'task-1', content: { source: { kind: 'flow-task' } } },
			global: { stubs: { NcLoadingIcon: true, CnCalendarEventCreate: true, CnCalendarEventPicker: true } },
		})
		await flush(w)
		const rows = w.findAll('.cn-events-card__event')
		expect(rows[0].find('.cn-events-card__day').text()).toBe('21')
		expect(rows[0].find('.cn-events-card__text .cn-events-card__where').text()).toBe('zaal 2.04')
		expect(rows[1].find('.cn-events-card__day').exists()).toBe(false)
	})

	it('puts the author\'s initials before a note', async () => {
		global.fetch = jest.fn().mockResolvedValue(ok({ results: [
			{ id: 'n1', author: 'pjansen', actorDisplayName: 'Pieter Jansen', message: 'Gebeld', created: '2026-10-06T11:10:00Z' },
		] }))
		const w = mount(CnNotesCard, {
			props: { registerId: 'tasks', schemaId: 'task', objectId: 'T1' },
			global: { stubs: { CnDetailCard: { template: '<div><slot /></div>' }, CnUserActionMenu: { template: '<span><slot /></span>' } } },
		})
		await flush(w)
		expect(w.find('.cn-notes-card__note .cn-notes-card__initials').text()).toBe('PJ')
	})
})
