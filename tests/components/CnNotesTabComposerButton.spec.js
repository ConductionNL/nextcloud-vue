/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `composer: 'button'` on the notes tab: the add form waits behind an
 * "Add note" button (DqZaakEmail "Notities"), as it does on CnNotesCard. The
 * notes integration forwards `composer` to the tab as well as to the card.
 *
 * @spec openspec/changes/notes-tab-composer-button/specs/notes-tab-composer-button/spec.md#requirement-the-notes-tab-can-keep-its-composer-behind-a-button
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import { notesIntegration } from '../../src/integrations/builtin/notes.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ results: [] }),
	})
})

describe('CnNotesTab composer button', () => {
	it('keeps the composer open without the option', () => {
		const wrapper = mount(CnNotesTab, { propsData: DEFAULT_PROPS })

		expect(wrapper.find('[data-testid="cn-notes-open-composer"]').exists()).toBe(false)
		expect(wrapper.find('.cn-sidebar-tab__composer').exists()).toBe(true)
	})

	it('shows only the button until it is pressed, then the composer', async () => {
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS, composer: 'button' } })

		const button = wrapper.find('[data-testid="cn-notes-open-composer"]')
		expect(button.exists()).toBe(true)
		expect(button.attributes('aria-expanded')).toBe('false')
		expect(wrapper.find('.cn-sidebar-tab__composer').exists()).toBe(false)

		await button.trigger('click')

		expect(wrapper.find('.cn-sidebar-tab__composer').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-notes-open-composer"]').attributes('aria-expanded')).toBe('true')
	})

	it('closes the composer again once the note is saved', async () => {
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS, composer: 'button' } })
		await wrapper.find('[data-testid="cn-notes-open-composer"]').trigger('click')
		wrapper.vm.newNoteText = 'Hoorzitting gepland'

		await wrapper.vm.addNote()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-sidebar-tab__composer').exists()).toBe(false)
	})

	it('opens the composer for a reply or an edit', async () => {
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS, composer: 'button' } })

		wrapper.vm.startEdit({ id: 'n1', message: 'Old text' })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-sidebar-tab__composer').exists()).toBe(true)
	})
})

describe('notes integration', () => {
	it('forwards composer to the notes tab it draws for mentions and note actions', () => {
		const wrapper = mount(notesIntegration.widget, {
			propsData: { ...DEFAULT_PROPS, mentionUrl: '/apps/app/api/mention', composer: 'button' },
		})

		expect(wrapper.findComponent(CnNotesTab).props('composer')).toBe('button')
	})
})

describe('look-board-detail.css', () => {
	it('draws the notes tab "Add note" button at the board control height', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
		expect(css).toMatch(/\.cn-look-board \.cn-sidebar-tab__composer-toggle \.button-vue:where\(:not\(\.cn-look-nextcloud \*\)\) \{\s*--button-size: var\(--cn-board-control-height\);\s*\}/)
	})
})
