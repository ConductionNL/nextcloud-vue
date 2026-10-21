/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNotesCard `composer: 'button'`: the add form sits behind an "Add note"
 * button in the card's header (DqTaak "Notities"); the default keeps it open.
 *
 * @spec openspec/changes/notes-card-composer-button/specs/notes-card-composer-button/spec.md#requirement-a-notes-card-can-keep-its-composer-behind-a-header-button
 */
const { flushPromises, mount } = require('@vue/test-utils')
const CnNotesCard = require('../../src/components/CnNotesCard/CnNotesCard.vue').default
const { default: notesIntegration } = require('../../src/integrations/builtin/notes.js')

/**
 * Mount the card with the reads it makes on create answered empty.
 *
 * @param {object} props Component props.
 * @return {object} The wrapper.
 */
function mountCard(props = {}) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }))
	return mount(CnNotesCard, {
		propsData: { registerId: 'r', schemaId: 's', objectId: 'o', ...props },
	})
}

afterEach(() => {
	delete global.fetch
})

describe('CnNotesCard composer', () => {
	it('keeps the add form open by default, with no header button', async () => {
		const w = mountCard()
		await flushPromises()
		expect(w.find('.cn-notes-card__add-form').exists()).toBe(true)
		expect(w.find('[data-testid="cn-notes-card-open-composer"]').exists()).toBe(false)
		w.unmount()
	})

	it('puts the add form behind an "Add note" button in the header', async () => {
		const w = mountCard({ composer: 'button' })
		await flushPromises()
		expect(w.find('.cn-notes-card__add-form').exists()).toBe(false)
		const open = w.find('.cn-detail-card__header [data-testid="cn-notes-card-open-composer"]')
		expect(open.exists()).toBe(true)
		expect(open.text()).toBe('Add note')
		await open.trigger('click')
		expect(w.find('.cn-notes-card__add-form').exists()).toBe(true)
		w.unmount()
	})

	it('closes the add form again once the note is saved', async () => {
		const w = mountCard({ composer: 'button' })
		await flushPromises()
		await w.find('[data-testid="cn-notes-card-open-composer"]').trigger('click')
		w.vm.newNoteText = 'Called the applicant'
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }))
		await w.vm.submitNote()
		await flushPromises()
		expect(w.vm.composerOpen).toBe(false)
		expect(w.find('.cn-notes-card__add-form').exists()).toBe(false)
		w.unmount()
	})

	it('is reachable from the manifest through the notes integration', () => {
		const adapter = notesIntegration.widget
		expect(adapter.props.composer).toBeDefined()
	})
})
