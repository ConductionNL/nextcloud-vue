/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `noteRows: 'authored'` on the notes tab: a note led by its author's initials,
 * its text in bold and "author · time" under it (DqZaakEmail "Notities").
 *
 * @spec openspec/changes/notes-tab-authored-rows/specs/notes-tab-authored-rows/spec.md#requirement-the-notes-tab-can-draw-a-note-as-an-authored-row
 */

import { flushPromises, mount } from '@vue/test-utils'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import { notesIntegration } from '../../src/integrations/builtin/notes.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([]),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

const NOTES = [
	{ id: 1, message: 'Stukken uit 2025 staan in het dossier', actorId: 'pieter', actorDisplayName: 'Pieter Jansen', creationDateTime: '2026-10-06T15:52:00Z', versionCount: 0 },
	{ id: 2, message: 'Graag even meekijken', actorId: 'lars', actorDisplayName: 'Lars de Koning', creationDateTime: '2026-10-06T09:31:00Z', versionCount: 0 },
]

beforeEach(() => {
	global.OC = { currentUser: 'pieter' }
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ results: NOTES }),
	})
})

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The mounted tab with its notes loaded.
 */
async function mountTab(props = {}) {
	const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS, ...props } })
	await flushPromises()
	return wrapper
}

describe('CnNotesTab authored rows', () => {
	it('keeps the comment icon and the author as the name without the option', async () => {
		const wrapper = await mountTab()

		expect(wrapper.find('.cn-notes-tab__avatar').exists()).toBe(false)
		expect(wrapper.find('.stub.NcListItem').attributes('name')).toBe('Pieter Jansen')
	})

	it('leads each note with its author\'s initials, the own note on the primary tint', async () => {
		const wrapper = await mountTab({ noteRows: 'authored' })

		const tiles = wrapper.findAll('.cn-notes-tab__avatar')
		expect(tiles.map((tile) => tile.text())).toEqual(['PJ', 'LK'])
		expect(tiles[0].attributes('aria-hidden')).toBe('true')
		expect(tiles[0].classes()).toContain('cn-notes-tab__avatar--own')
		expect(tiles[1].classes()).not.toContain('cn-notes-tab__avatar--own')
	})

	it('shows the text as the bold first line and "author · time" under it', async () => {
		const wrapper = await mountTab({ noteRows: 'authored' })

		const row = wrapper.findAll('.stub.NcListItem')[0]
		const time = wrapper.vm.formatDate(NOTES[0].creationDateTime)
		expect(row.find('.cn-notes-tab__text').text()).toBe('Stukken uit 2025 staan in het dossier')
		expect(row.find('.cn-notes-tab__meta').text()).toBe(`Pieter Jansen · ${time}`)
		// The time stands in the meta line only, not again at the row's end.
		expect(row.text().split(time).length - 1).toBe(1)
	})

	it('keeps the row actions', async () => {
		const plain = await mountTab()
		const authored = await mountTab({ noteRows: 'authored' })

		const count = (wrapper) => wrapper.findAll('.stub.NcListItem .stub.NcActionButton').length
		expect(count(plain)).toBeGreaterThan(0)
		expect(count(authored)).toBe(count(plain))
	})
})

describe('notes integration', () => {
	it('forwards noteRows to the notes tab', () => {
		const wrapper = mount(notesIntegration.widget, {
			propsData: { ...DEFAULT_PROPS, mentionUrl: '/apps/app/api/mention', noteRows: 'authored' },
		})

		expect(wrapper.findComponent(CnNotesTab).props('noteRows')).toBe('authored')
	})
})
