import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * conversation-endpoint-poll: the `conversation` widget reads its messages
 * from an endpoint (`source: { url, responsePath }`, the url filled from the
 * record), reads it again every `pollSeconds` while shown, keeps the last
 * messages when a poll fails, stops once `pollUntil` matches the answer (a
 * chat that ended), stops when it is removed, and reads the endpoint again
 * after a reply. A url whose token has no value sends nothing.
 *
 * @spec openspec/changes/conversation-endpoint-poll/specs/conversation-source/spec.md#requirement-a-conversation-reads-its-messages-from-an-endpoint-and-reads-them-again
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const VISITOR = { id: 'm1', author: 'visitor', body: 'When is the office open?', at: '2026-11-24T10:00:00' }
const AGENT = { id: 'm2', author: 'agent', body: 'From nine to five.', at: '2026-11-24T10:01:00' }

const CONTENT = {
	title: 'Website chat',
	source: { url: '/apps/pipelinq/api/web-chat/conversations/@object.threadKey', responsePath: 'messages' },
	pollSeconds: 3,
	pollUntil: { path: 'status', in: ['closed'] },
	sideField: 'author',
	usValue: 'agent',
	textField: 'body',
	timeField: 'at',
	endpoint: '/apps/pipelinq/api/web-chat/conversations/@objectId/reply',
	messageKey: 'text',
}

/**
 * @param {object} content Widget content.
 * @param {object} [objectData] The record.
 * @return {object} Wrapper.
 */
function mountWidget(content, objectData = { id: 'ticket-1', threadKey: 'web:abc' }) {
	return mount(CnConversationWidget, {
		props: { content, objectId: 'ticket-1', objectData },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
	})
}

const texts = (w) => w.findAll('[data-testid="cn-conversation-message"]').map((m) => m.text())

describe('CnConversationWidget: messages from an endpoint, read again on an interval', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		axios.get.mockReset()
		axios.post.mockReset()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('reads the endpoint filled from the record and shows the messages at responsePath', async () => {
		axios.get.mockResolvedValue({ data: { status: 'open', messages: [VISITOR] } })
		const w = mountWidget(CONTENT)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toContain('/apps/pipelinq/api/web-chat/conversations/web%3Aabc')
		expect(texts(w).join(' ')).toContain('When is the office open?')
		w.unmount()
	})

	it('reads it again every pollSeconds, and keeps the last messages when a poll fails', async () => {
		axios.get.mockResolvedValueOnce({ data: { status: 'open', messages: [VISITOR] } })
			.mockResolvedValueOnce({ data: { status: 'open', messages: [VISITOR, AGENT] } })
			.mockRejectedValueOnce(new Error('offline'))
		const w = mountWidget(CONTENT)
		await flushPromises()
		jest.advanceTimersByTime(3000)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(texts(w).join(' ')).toContain('From nine to five.')
		jest.advanceTimersByTime(3000)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(3)
		expect(texts(w)).toHaveLength(2)
		expect(w.find('[data-testid="cn-conversation-loading"]').exists()).toBe(false)
		w.unmount()
	})

	it('stops once the answer matches pollUntil, and when the widget is removed', async () => {
		axios.get.mockResolvedValueOnce({ data: { status: 'open', messages: [VISITOR] } })
			.mockResolvedValueOnce({ data: { status: 'closed', messages: [VISITOR, AGENT] } })
		const w = mountWidget(CONTENT)
		await flushPromises()
		jest.advanceTimersByTime(3000)
		await flushPromises()
		jest.advanceTimersByTime(9000)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(2)
		w.unmount()

		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { status: 'open', messages: [] } })
		const other = mountWidget(CONTENT)
		await flushPromises()
		other.unmount()
		jest.advanceTimersByTime(9000)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it('does not poll without pollSeconds, nor below two seconds', async () => {
		axios.get.mockResolvedValue({ data: { messages: [VISITOR] } })
		const { pollSeconds, ...once } = CONTENT
		const w = mountWidget({ ...once, pollSeconds: 1 })
		await flushPromises()
		jest.advanceTimersByTime(10000)
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(pollSeconds).toBe(3)
		w.unmount()
	})

	it('sends nothing when the url token has no value', async () => {
		const w = mountWidget(CONTENT, { id: 'ticket-1' })
		await flushPromises()
		jest.advanceTimersByTime(9000)
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-conversation-empty"]').exists()).toBe(true)
		w.unmount()
	})

	it('posts the reply under messageKey and reads the endpoint again', async () => {
		axios.get.mockResolvedValueOnce({ data: { status: 'open', messages: [VISITOR] } })
			.mockResolvedValueOnce({ data: { status: 'open', messages: [VISITOR, AGENT] } })
		axios.post.mockResolvedValue({ data: { status: 'open' } })
		const w = mountWidget({ ...CONTENT, pollSeconds: 0 })
		await flushPromises()
		await w.find('textarea').setValue('From nine to five.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toContain('/apps/pipelinq/api/web-chat/conversations/ticket-1/reply')
		expect(axios.post.mock.calls[0][1]).toMatchObject({ text: 'From nine to five.' })
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(texts(w).join(' ')).toContain('From nine to five.')
		w.unmount()
	})
})
