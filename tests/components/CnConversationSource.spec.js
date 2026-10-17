/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * conversation-source: the `conversation` widget reads its messages from a
 * register list filtered on the record (a case's "conversation with the
 * resident"), maps direction, channel, sender, time and body, shows them
 * oldest first with a loading and an empty state, and a reply can run an app
 * action instead of posting to an endpoint. Each message names its direction
 * for a screen reader.
 *
 * @spec openspec/changes/conversation-source/specs/conversation-source/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationThread from '../../src/components/CnConversationThread/CnConversationThread.vue'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn() } }))

const ROWS = [
	{ id: 'm2', direction: 'out', medium: 'email', from: 'Pieter Jansen', sentAt: '2026-10-04T11:02:00', body: 'Construction starts in March.' },
	{ id: 'm1', direction: 'in', medium: 'berichtenbox', from: 'Sanne de Vries', sentAt: '2026-10-04T10:52:00', body: 'I would like to see all documents.' },
	{ id: 'm3', direction: 'in', medium: 'phone', from: 'Sanne de Vries', sentAt: '2026-10-05T09:00:00', body: 'Called about the planning.' },
]

const CONTENT = {
	title: 'Conversation with the resident',
	source: { register: 'zaken', schema: 'message', filter: { case: '@objectId' } },
	directionField: 'direction',
	outValue: 'out',
	channelField: 'medium',
	channelMap: { email: 'E-mail', berichtenbox: 'Message box', phone: 'Phone note' },
	senderField: 'from',
	timestampField: 'sentAt',
	bodyField: 'body',
}

/**
 * @param {object} content Widget content.
 * @param {object} [provide] Extra provides.
 * @param {string} [objectId] The record id.
 * @return {object} Wrapper.
 */
function mountWidget(content, provide = {}, objectId = 'case-1') {
	return mount(CnConversationWidget, {
		props: { content, objectId, objectData: { id: objectId } },
		global: { provide: { cnTranslate: (key) => key, ...provide }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
	})
}

describe('CnConversationWidget: messages from a list', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('reads the list filtered on the record and shows the messages oldest first with their parts', async () => {
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: ROWS }) }))
		const w = mountWidget(CONTENT)
		expect(w.find('[data-testid="cn-conversation-loading"]').exists()).toBe(true)
		await flushPromises()
		expect(global.fetch.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/message')
		expect(global.fetch.mock.calls[0][0]).toContain('case=case-1')
		const items = w.findAll('[data-testid="cn-conversation-message"]')
		expect(items.map((li) => li.find('.cn-conversation-thread__text').text())).toEqual(['I would like to see all documents.', 'Construction starts in March.', 'Called about the planning.'])
		expect(items.map((li) => li.attributes('data-side'))).toEqual(['them', 'us', 'them'])
		expect(items.map((li) => li.find('[data-testid="cn-conversation-channel"]').text())).toEqual(['Message box', 'E-mail', 'Phone note'])
		expect(items[1].find('.cn-conversation-thread__author').text()).toBe('Pieter Jansen')
		expect(items[0].find('.hidden-visually').text()).toBe('Received message')
		expect(items[1].find('.hidden-visually').text()).toBe('Sent message')
		expect(w.find('[data-testid="cn-conversation-loading"]').exists()).toBe(false)
	})

	it('sends no request while the record id is unknown, and says the thread is empty', async () => {
		global.fetch = jest.fn()
		const w = mountWidget(CONTENT, {}, '')
		await flushPromises()
		expect(global.fetch).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-conversation-empty"]').exists()).toBe(true)
	})

	it('runs the reply action with the text and reads the list again', async () => {
		global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ results: ROWS }) }))
		const dispatch = jest.fn(async () => true)
		const w = mountWidget({ ...CONTENT, replyAction: { type: 'handler', handler: 'sendResidentMessage', props: { case: '@objectId' } } }, { cnDispatchAction: dispatch })
		await flushPromises()
		await w.find('textarea').setValue('We sent the documents.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledTimes(1)
		const action = dispatch.mock.calls[0][0]
		expect(action.handler).toBe('sendResidentMessage')
		expect(action.args).toEqual([{ text: 'We sent the documents.', objectId: 'case-1' }])
		expect(action.props).toEqual({ case: 'case-1', text: 'We sent the documents.' })
		expect(global.fetch).toHaveBeenCalledTimes(2)
		expect(require('@nextcloud/axios').default.post).not.toHaveBeenCalled()
	})
})

describe('CnConversationThread: loading', () => {
	it('says it is loading while there are no messages yet, as a status', () => {
		const w = mount(CnConversationThread, { props: { messages: [], loading: true } })
		const status = w.find('[data-testid="cn-conversation-loading"]')
		expect(status.attributes('role')).toBe('status')
		expect(w.find('[data-testid="cn-conversation-empty"]').exists()).toBe(false)
	})
})
