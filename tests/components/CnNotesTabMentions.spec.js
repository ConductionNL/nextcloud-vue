/**
 * Tests for CnNotesTab's `@mention` support.
 *
 * Covers:
 *  - the composer wiring: typing `@query` triggers the autocomplete lookup
 *    and opens the dropdown, keyboard (ArrowDown+Enter) and mouse selection
 *    insert the serialized token, Escape closes without inserting;
 *  - chip rendering of stored mentions: resolved display name for known
 *    users, raw id + `--unknown` modifier for unresolvable users, plain text
 *    around chips intact;
 *  - the `mention` event: payload shape on create and edit, and the
 *    no-mention → no-event case.
 *
 * The NcRichContenteditable stub (tests/__mocks__/nextcloud-vue.js) mirrors
 * the real component's `auto-complete(search, callback)` contract and token
 * insertion format, so these tests exercise CnNotesTab's own responsibility:
 * supplying suggestions, storing tokens, parsing them back out, and emitting.
 */

import { mount } from '@vue/test-utils'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import { searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

/** Flush pending promise callbacks a few times. */
async function flush(wrapper, times = 4) {
	for (let i = 0; i < times; i++) {
		await wrapper.vm.$nextTick()
	}
}

/**
 * Type text into the composer stub's textarea (fires input, which triggers
 * the stub's autocomplete lookup when the text ends in `@query`).
 *
 * @param {object} wrapper The mounted wrapper.
 * @param {string} text The full composer text to set.
 */
async function typeInComposer(wrapper, text) {
	const textarea = wrapper.find('.rich-contenteditable__input')
	textarea.element.value = text
	await textarea.trigger('input')
}

function mockNotesFetch(notes = []) {
	return jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve({ results: notes }),
	})
}

describe('CnNotesTab mentions', () => {
	beforeEach(() => {
		global.fetch = mockNotesFetch()
		global.OC = { currentUser: 'admin' }
		searchNextcloudUsers.mockReset()
		searchNextcloudUsers.mockResolvedValue([])
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	describe('composer autocomplete', () => {
		it('typing @query invokes the user lookup and opens the dropdown', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
				{ id: 'piet', label: 'Piet Post', subline: '' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			await typeInComposer(wrapper, 'hi @ja')
			await flush(wrapper)

			expect(searchNextcloudUsers).toHaveBeenCalledWith('ja')
			const items = wrapper.findAll('.tribute-item')
			expect(items).toHaveLength(2)
			expect(items.at(0).text()).toBe('Jan de Vries')
			expect(items.at(1).text()).toBe('Piet Post')
			wrapper.destroy()
		})

		it('ArrowDown + Enter inserts the selected mention token', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
				{ id: 'piet', label: 'Piet Post', subline: '' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			await typeInComposer(wrapper, 'hi @p')
			await flush(wrapper)

			const textarea = wrapper.find('.rich-contenteditable__input')
			await textarea.trigger('keydown', { key: 'ArrowDown' })
			await textarea.trigger('keydown', { key: 'Enter' })
			await flush(wrapper)

			expect(wrapper.vm.newNoteText).toBe('hi @piet ')
			expect(wrapper.find('.tribute-container').exists()).toBe(false)
			wrapper.destroy()
		})

		it('clicking a suggestion inserts its mention token', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			await typeInComposer(wrapper, '@ja')
			await flush(wrapper)

			await wrapper.find('.tribute-item').trigger('click')
			await flush(wrapper)

			expect(wrapper.vm.newNoteText).toBe('@jan.doe ')
			expect(wrapper.find('.tribute-container').exists()).toBe(false)
			wrapper.destroy()
		})

		it('Escape closes the dropdown without changing the text', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			await typeInComposer(wrapper, 'hi @ja')
			await flush(wrapper)
			expect(wrapper.find('.tribute-container').exists()).toBe(true)

			await wrapper.find('.rich-contenteditable__input').trigger('keydown', { key: 'Escape' })
			await flush(wrapper)

			expect(wrapper.find('.tribute-container').exists()).toBe(false)
			expect(wrapper.vm.newNoteText).toBe('hi @ja')
			wrapper.destroy()
		})
	})

	describe('mention chip rendering', () => {
		it('renders a known-user mention as a chip with the resolved display name', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
			])
			global.fetch = mockNotesFetch([
				{ id: 'n1', message: 'please review @jan.doe', author: 'admin' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper, 6)

			const chip = wrapper.find('.cn-notes-tab__mention')
			expect(chip.exists()).toBe(true)
			expect(chip.text()).toBe('Jan de Vries')
			expect(chip.classes()).not.toContain('cn-notes-tab__mention--unknown')
			expect(wrapper.text()).toContain('please review')
			wrapper.destroy()
		})

		it('renders an unresolvable mention as a muted chip with the raw id', async () => {
			searchNextcloudUsers.mockResolvedValue([])
			global.fetch = mockNotesFetch([
				{ id: 'n1', message: 'cc @ghost-user for this', author: 'admin' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper, 6)

			const chip = wrapper.find('.cn-notes-tab__mention')
			expect(chip.exists()).toBe(true)
			expect(chip.text()).toBe('ghost-user')
			expect(chip.classes()).toContain('cn-notes-tab__mention--unknown')
			// Surrounding plain text still renders.
			expect(wrapper.text()).toContain('cc')
			expect(wrapper.text()).toContain('for this')
			wrapper.destroy()
		})

		it('renders a plain note without any chips', async () => {
			global.fetch = mockNotesFetch([
				{ id: 'n1', message: 'no mentions here, mail a@b.com', author: 'admin' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper, 6)

			expect(wrapper.find('.cn-notes-tab__mention').exists()).toBe(false)
			expect(wrapper.text()).toContain('no mentions here, mail a@b.com')
			wrapper.destroy()
		})

		it('resolves each mentioned id at most once across notes', async () => {
			searchNextcloudUsers.mockResolvedValue([
				{ id: 'jan.doe', label: 'Jan de Vries', subline: '' },
			])
			global.fetch = mockNotesFetch([
				{ id: 'n1', message: 'a @jan.doe', author: 'admin' },
				{ id: 'n2', message: 'b @jan.doe again', author: 'admin' },
			])
			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper, 6)

			const lookups = searchNextcloudUsers.mock.calls.filter(([query]) => query === 'jan.doe')
			expect(lookups).toHaveLength(1)
			expect(wrapper.findAll('.cn-notes-tab__mention')).toHaveLength(2)
			wrapper.destroy()
		})
	})

	describe('mention event on save', () => {
		it('emits `mention` with the payload shape after creating a note with mentions', async () => {
			global.fetch = jest.fn()
				// initial notes fetch on mount
				.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
				// POST create
				.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'note-1' }) })
				// refetch after create
				.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			wrapper.vm.newNoteText = 'please review @jan.doe and @piet'
			await wrapper.vm.addNote()
			await flush(wrapper)

			const emitted = wrapper.emitted('mention')
			expect(emitted).toHaveLength(1)
			expect(emitted[0][0]).toEqual({
				objectId: 'obj-1',
				register: 'reg',
				schema: 'note',
				noteId: 'note-1',
				mentionedUserIds: ['jan.doe', 'piet'],
			})
			wrapper.destroy()
		})

		it('does not emit `mention` when the saved note has no mentions', async () => {
			global.fetch = jest.fn()
				.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
				.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'note-1' }) })
				.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper)

			wrapper.vm.newNoteText = 'just a plain note'
			await wrapper.vm.addNote()
			await flush(wrapper)

			expect(wrapper.emitted('mention')).toBeUndefined()
			wrapper.destroy()
		})

		it('emits `mention` with the edited note id after saving an edit', async () => {
			global.fetch = jest.fn()
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: () => Promise.resolve({ results: [{ id: 'note-2', message: 'old text', author: 'admin' }] }),
				})
				// PUT update
				.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'note-2' }) })
				// refetch after edit
				.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })

			const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
			await flush(wrapper, 6)

			wrapper.vm.startEdit({ id: 'note-2', message: 'old text' })
			wrapper.vm.newNoteText = 'old text plus @piet'
			await wrapper.vm.saveEdit()
			await flush(wrapper)

			const emitted = wrapper.emitted('mention')
			expect(emitted).toHaveLength(1)
			expect(emitted[0][0]).toEqual({
				objectId: 'obj-1',
				register: 'reg',
				schema: 'note',
				noteId: 'note-2',
				mentionedUserIds: ['piet'],
			})
			wrapper.destroy()
		})
	})
})
