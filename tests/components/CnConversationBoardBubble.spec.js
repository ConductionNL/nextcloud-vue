/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bubble as DqZaakContact draws it: who wrote each message, read per side
 * (the handler who logged an outgoing one, by display name; the requester
 * on the record for an incoming one), the direction in words before the
 * time ("Incoming · 3 Oct, 14:10"), a muted note under the text, and a line
 * under the card title.
 *
 * @spec openspec/changes/conversation-board-bubble/specs/conversation-source/spec.md#requirement-a-message-names-its-author-per-side-its-direction-and-a-note
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn(async (uid) => ({ label: { pieter: 'Pieter Jansen' }[uid] || uid })),
}))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))

import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'
import { clearUserDisplayNames } from '../../src/utils/userDisplayName.js'

const ROWS = [
	{ id: 'm1', direction: 'inbound', channel: 'phone', employee: 'pieter', at: '2026-10-03T14:10:00', summary: 'How do I ask for the documents?', note: 'Summarised by Pieter Jansen' },
	{ id: 'm2', direction: 'outbound', channel: 'portal', employee: 'pieter', at: '2026-10-03T14:32:00', summary: 'Your request was received.' },
]

const CONTENT = {
	title: 'Conversation with the resident',
	subtitle: 'Oldest first, with the channel of each message',
	source: { register: 'zaken', schema: 'contactmoment', filter: { case: '@objectId' } },
	directionField: 'direction',
	outValue: 'outbound',
	channelField: 'channel',
	timestampField: 'at',
	bodyField: 'summary',
	noteField: 'note',
	usAuthorField: 'employee',
	usAuthorFormat: 'user',
	themAuthorField: '@object.requesterName',
	showDirection: true,
}

/**
 * @param {object} content The widget content.
 * @return {object} The widget.
 */
function mountWidget(content) {
	return mount(CnConversationWidget, {
		props: { content, objectId: 'case-1', objectData: { id: 'case-1', requesterName: 'Sanne de Vries' } },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
	})
}

beforeEach(() => {
	clearUserDisplayNames()
	global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: ROWS }) }))
})

afterEach(() => {
	delete global.fetch
})

const items = (w) => w.findAll('[data-testid="cn-conversation-message"]')

describe('the conversation bubble on the board', () => {
	it('names the requester on an incoming message and the handler, by name, on an outgoing one', async () => {
		const w = mountWidget(CONTENT)
		await flushPromises()
		await flushPromises()
		expect(items(w).map((li) => li.find('.cn-conversation-thread__author').text())).toEqual(['Sanne de Vries', 'Pieter Jansen'])
		expect(items(w).map((li) => li.find('.cn-conversation-thread__avatar').text())).toEqual(['SV', 'PJ'])
	})

	it('says the direction before the time', async () => {
		const w = mountWidget(CONTENT)
		await flushPromises()
		const direction = items(w).map((li) => li.find('[data-testid="cn-conversation-direction"]').text())
		expect(direction).toEqual(['Incoming', 'Outgoing'])
	})

	it('shows the note under the text, and no note line where there is none', async () => {
		const w = mountWidget(CONTENT)
		await flushPromises()
		expect(items(w)[0].find('[data-testid="cn-conversation-note"]').text()).toBe('Summarised by Pieter Jansen')
		expect(items(w)[1].find('[data-testid="cn-conversation-note"]').exists()).toBe(false)
	})

	it('draws the subtitle under the title', async () => {
		const w = mountWidget(CONTENT)
		await flushPromises()
		expect(w.find('[data-testid="cn-conversation-subtitle"]').text()).toBe('Oldest first, with the channel of each message')
	})

	it('keeps the direction for screen readers only without showDirection', async () => {
		const { showDirection, ...plain } = CONTENT
		const w = mountWidget(plain)
		await flushPromises()
		expect(items(w)[0].find('[data-testid="cn-conversation-direction"]').exists()).toBe(false)
		expect(items(w)[0].find('.hidden-visually').text()).toBe('Received message')
	})
})
