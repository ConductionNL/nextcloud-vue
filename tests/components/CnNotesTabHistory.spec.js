/**
 * Tests for the note edit history on CnNotesTab and CnNoteHistoryDialog.
 *
 * A note is a Nextcloud comment, and an edit overwrites its message.
 * OpenRegister keeps the prior texts beside the comment and reports
 * `versionCount`, `editedBy` and `editedByDisplayName` on every note read.
 * These tests cover the two things the leaf owes that data:
 *
 *  - the marker: an edited note says so, and names who changed it;
 *  - the dialog: the history action reads the versions endpoint and lists
 *    the prior texts, and a failed read says so rather than rendering an
 *    empty list that would read as "never edited".
 */

import { mount } from '@vue/test-utils'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import CnNoteHistoryDialog from '../../src/dialogs/CnNoteHistoryDialog.vue'
import { searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
}))

const DEFAULT_PROPS = {
	objectId: 'obj-1',
	register: 'reg',
	schema: 'note',
}

/**
 * Flush pending promise callbacks a few times.
 *
 * @param {object} wrapper The mounted wrapper to settle.
 * @param {number} times How many tick rounds to run.
 * @return {Promise<void>}
 */
async function flush(wrapper, times = 4) {
	for (let i = 0; i < times; i++) {
		await wrapper.vm.$nextTick()
	}
}

describe('CnNotesTab edit history', () => {
	beforeEach(() => {
		global.OC = { currentUser: 'admin' }
		searchNextcloudUsers.mockReset()
		searchNextcloudUsers.mockResolvedValue([])
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	it('an edited note says so and names who changed it', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [{
					id: 1,
					message: 'Applicant called, will send documents',
					actorId: 'admin',
					versionCount: 1,
					editedBy: 'anna',
					editedByDisplayName: 'Anna Bakker',
				}],
			}),
		})
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)

		const marker = wrapper.find('[data-testid="cn-note-edited"]')
		expect(marker.exists()).toBe(true)
		expect(marker.text()).toContain('Anna Bakker')
		wrapper.unmount()
	})

	it('a note nobody edited carries no marker and no history action', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [{ id: 1, message: 'Applicant called', actorId: 'admin', versionCount: 0 }],
			}),
		})
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)

		expect(wrapper.find('[data-testid="cn-note-edited"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-note-history-action"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('the history action opens the dialog for that note', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [{ id: 7, message: 'Now', actorId: 'admin', versionCount: 2, editedBy: 'admin' }],
			}),
		})
		const wrapper = mount(CnNotesTab, { propsData: { ...DEFAULT_PROPS } })
		await flush(wrapper)

		await wrapper.find('[data-testid="cn-note-history-action"]').trigger('click')
		await flush(wrapper)

		expect(wrapper.vm.historyNoteId).toBe(7)
		expect(wrapper.findComponent(CnNoteHistoryDialog).exists()).toBe(true)
		wrapper.unmount()
	})
})

describe('CnNoteHistoryDialog', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('lists the prior texts newest first, naming author and editor', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({
				results: [
					{
						id: 2,
						message: 'Applicant called',
						author: 'anna',
						authorDisplayName: 'Anna Bakker',
						editedBy: 'anna',
						editedByDisplayName: 'Anna Bakker',
						editedAt: '2026-09-16T10:00:00+00:00',
					},
					{
						id: 1,
						message: 'Called',
						author: 'anna',
						authorDisplayName: 'Anna Bakker',
						editedBy: 'bram',
						editedByDisplayName: 'Bram Post',
						editedAt: '2026-09-15T10:00:00+00:00',
					},
				],
			}),
		})

		const wrapper = mount(CnNoteHistoryDialog, {
			propsData: { open: true, noteId: 7, ...DEFAULT_PROPS },
		})
		await flush(wrapper)

		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/objects/reg/note/obj-1/notes/7/versions')

		const rows = wrapper.findAll('[data-testid="cn-note-history-version"]')
		expect(rows).toHaveLength(2)
		expect(rows.at(0).text()).toContain('Applicant called')
		expect(rows.at(0).text()).toContain('Anna Bakker')
		expect(rows.at(1).text()).toContain('Bram Post')
		wrapper.unmount()
	})

	it('a failed read says so instead of claiming the note was never edited', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve({}),
		})

		const wrapper = mount(CnNoteHistoryDialog, {
			propsData: { open: true, noteId: 7, ...DEFAULT_PROPS },
		})
		await flush(wrapper)

		expect(wrapper.vm.failed).toBe(true)
		expect(wrapper.findAll('[data-testid="cn-note-history-version"]')).toHaveLength(0)
		wrapper.unmount()
	})
})
