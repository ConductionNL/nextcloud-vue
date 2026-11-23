/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak Notities: in the board look a note's moment reads as the boards
 * write it, "6 okt 11:10", without this year's year; the Nextcloud look keeps
 * its full date.
 *
 * @spec openspec/changes/board-r31-chip-ink-notes-date/specs/board-r31-chip-ink-notes-date/spec.md#requirement-a-board-note-writes-its-moment-as-the-boards-do
 */
import { mount } from '@vue/test-utils'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([]),
	searchNextcloudGroups: jest.fn().mockResolvedValue([]),
}))

const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })

/**
 * Mount the card in a look and let the notes load.
 *
 * @param {string} look The look.
 * @return {Promise<object>} The wrapper.
 */
async function mountIn(look) {
	const created = new Date(new Date().getFullYear(), 9, 6, 11, 10).toISOString()
	global.fetch = jest.fn().mockResolvedValue(ok({ results: [{ id: 'n1', author: 'pieter', actorDisplayName: 'Pieter Jansen', message: 'Commissie', created }] }))
	const w = mount(CnNotesCard, {
		props: { registerId: 'tasks', schemaId: 'task', objectId: 'T1' },
		global: { provide: { cnLook: look }, stubs: { CnDetailCard: { template: '<div><slot /></div>' }, CnUserActionMenu: { template: '<span><slot /></span>' } } },
	})
	for (let i = 0; i < 5; i++) {
		await w.vm.$nextTick()
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
	return w
}

describe('CnNotesCard: the note moment', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('reads without this year in the board look', async () => {
		const w = await mountIn('board')
		const time = w.find('.cn-notes-card__time').text()
		expect(time).toContain('6')
		expect(time).toContain('11:10')
		expect(time).not.toContain(String(new Date().getFullYear()))
	})

	it('keeps the year in the Nextcloud look', async () => {
		const w = await mountIn('nextcloud')
		expect(w.find('.cn-notes-card__time').text()).toContain(String(new Date().getFullYear()))
	})
})
