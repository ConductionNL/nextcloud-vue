/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest wires the notes tab without a wrapper component: mentions go to
 * the app's notification endpoint, and a note action calls its endpoint and
 * says what became of the note. Ported from dossiq's CaseNotesTab specs.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-notes-can-notify-and-act-without-a-wrapper
 */
var mockShowSuccess = jest.fn()
var mockShowError = jest.fn()
var mockShowWarning = jest.fn()

jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: (...a) => mockShowSuccess(...a),
	showError: (...a) => mockShowError(...a),
	showWarning: (...a) => mockShowWarning(...a),
}))
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn().mockResolvedValue([]),
	searchNextcloudGroups: jest.fn().mockResolvedValue([]),
}))

import { mount } from '@vue/test-utils'
import CnNotesTab from '../../src/components/CnObjectSidebar/CnNotesTab.vue'
import { notesIntegration } from '../../src/integrations/builtin/notes.js'

const PROPS = { objectId: 'obj-1', register: 'reg', schema: 'item' }
const NOTE = { id: 4, message: 'Applicant called', actorId: 'admin', versionCount: 0 }
const PUSH = { id: 'push', label: 'Send to the neighbouring register', endpoint: '/apps/x/api/items/{objectId}/notes/push', messages: { sent: 'Sent' } }

async function flush(wrapper, times = 6) {
	for (let i = 0; i < times; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
	}
}

const answer = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 422, json: () => Promise.resolve(body) })

beforeEach(() => {
	global.OC = { currentUser: 'admin' }
	mockShowSuccess.mockReset()
	mockShowError.mockReset()
	mockShowWarning.mockReset()
})

afterEach(() => {
	delete global.fetch
	delete global.OC
})

describe('CnNotesTab endpoints', () => {
	it('posts the mention payload to mentionUrl after a note with a mention is saved', async () => {
		global.fetch = jest.fn()
			.mockReturnValueOnce(answer({ results: [] }))
			.mockReturnValueOnce(answer({ id: 'note-1' }))
			.mockImplementation(() => answer({ results: [] }))
		const wrapper = mount(CnNotesTab, { props: { ...PROPS, mentionUrl: '/apps/x/api/notes/mention' } })
		await flush(wrapper)
		wrapper.vm.newNoteText = 'please review @jan.doe'
		await wrapper.vm.addNote()
		await flush(wrapper)
		const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/apps/x/api/notes/mention'))
		expect(call).toBeTruthy()
		expect(call[1].method).toBe('POST')
		expect(JSON.parse(call[1].body)).toEqual({ objectId: 'obj-1', register: 'reg', schema: 'item', noteId: 'note-1', mentionedUserIds: ['jan.doe'] })
		expect(wrapper.emitted('mention')).toHaveLength(1)
		wrapper.unmount()
	})

	it('posts the note to the action endpoint and says it was sent', async () => {
		global.fetch = jest.fn()
			.mockReturnValueOnce(answer({ results: [NOTE] }))
			.mockImplementation(() => answer({ outcome: 'sent', reason: '' }))
		const wrapper = mount(CnNotesTab, { props: { ...PROPS, noteActions: [PUSH] } })
		await flush(wrapper)
		await wrapper.find('[data-testid="cn-note-action-push"]').trigger('click')
		await flush(wrapper)
		const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/notes/push'))
		expect(String(call[0])).toContain('/apps/x/api/items/obj-1/notes/push')
		expect(JSON.parse(call[1].body)).toEqual({ note: NOTE })
		expect(mockShowSuccess).toHaveBeenCalledWith('Sent')
		expect(wrapper.emitted('note-action')).toHaveLength(1)
		wrapper.unmount()
	})

	it('shows the server\'s reason when the note stays here or the send failed', async () => {
		global.fetch = jest.fn()
			.mockReturnValueOnce(answer({ results: [NOTE] }))
			.mockReturnValueOnce(answer({ outcome: 'not-sent', reason: 'Internal notes stay here.' }))
			.mockReturnValueOnce(answer({ reason: 'The register refused.' }, false))
		const wrapper = mount(CnNotesTab, { props: { ...PROPS, noteActions: [PUSH] } })
		await flush(wrapper)
		await wrapper.find('[data-testid="cn-note-action-push"]').trigger('click')
		await flush(wrapper)
		expect(mockShowWarning).toHaveBeenCalledWith('Internal notes stay here.')
		await wrapper.find('[data-testid="cn-note-action-push"]').trigger('click')
		await flush(wrapper)
		expect(mockShowError).toHaveBeenCalledWith('The register refused.')
		wrapper.unmount()
	})
})

describe('the notes integration widget', () => {
	it('renders the full notes tab when a manifest wires mentions or actions', () => {
		global.fetch = jest.fn(() => answer({ results: [] }))
		const wrapper = mount(notesIntegration.widget, { props: { ...PROPS, mentionUrl: '/apps/x/api/notes/mention' } })
		expect(wrapper.findComponent(CnNotesTab).exists()).toBe(true)
		wrapper.unmount()
	})

	it('keeps the card without them', () => {
		global.fetch = jest.fn(() => answer({ results: [] }))
		const wrapper = mount(notesIntegration.widget, { props: { ...PROPS } })
		expect(wrapper.findComponent(CnNotesTab).exists()).toBe(false)
		wrapper.unmount()
	})
})
