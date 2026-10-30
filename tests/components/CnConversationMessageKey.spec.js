/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reply posted to an endpoint that takes its text by another name
 * (`messageKey: "body"`), with the switch's state beside it; an answer that
 * does not echo the text makes the page read the record again.
 *
 * @spec openspec/changes/detail-endpoint-answer-parts/specs/detail-page/spec.md#requirement-a-conversation-reply-is-posted-under-the-endpoints-own-field
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationThread from '../../src/components/CnConversationThread/CnConversationThread.vue'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

const mockPost = jest.fn()
const mockEmit = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/event-bus', () => ({ emit: (...a) => mockEmit(...a), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const OPTION = { label: 'Visible to the reporter', key: 'visibleToReporter', value: false }

beforeEach(() => {
	mockPost.mockReset()
	mockEmit.mockReset()
})

describe('CnConversationThread messageKey', () => {
	it('posts the text under message by default', async () => {
		mockPost.mockResolvedValue({ data: {} })
		const w = mount(CnConversationThread, { props: { messages: [], endpoint: '/apps/x/api/reports/r1/messages' } })
		await w.find('textarea').setValue('Hello')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(mockPost.mock.calls[0][1]).toEqual({ message: 'Hello' })
	})

	it('posts the text under the named field, with the option beside it', async () => {
		mockPost.mockResolvedValue({ data: {} })
		const w = mount(CnConversationThread, { props: { messages: [], endpoint: '/apps/x/api/reports/r1/messages', messageKey: 'body', replyOption: OPTION } })
		await w.find('textarea').setValue('We looked into it.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(mockPost.mock.calls[0][1]).toEqual({ body: 'We looked into it.', visibleToReporter: false })
	})
})

describe('CnConversationWidget messageKey', () => {
	const mountWidget = () => mount(CnConversationWidget, {
		props: {
			content: {
				field: 'messages',
				textField: 'body',
				endpoint: '/apps/x/api/reports/@objectId/messages',
				messageKey: 'body',
				replyOption: OPTION,
			},
			objectId: 'r1',
			objectData: { id: 'r1', messages: [{ id: 'm1', body: 'Thank you.' }] },
		},
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
	})

	it('reads the thread from the record and posts the reply under the named field', async () => {
		mockPost.mockResolvedValue({ data: { written: true } })
		const w = mountWidget()
		expect(w.text()).toContain('Thank you.')
		await w.find('textarea').setValue('We looked into it.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(mockPost.mock.calls[0][0]).toContain('/apps/x/api/reports/r1/messages')
		expect(mockPost.mock.calls[0][1]).toEqual({ body: 'We looked into it.', visibleToReporter: false })
	})

	it('asks the page to read the record again when the answer does not echo the reply', async () => {
		mockPost.mockResolvedValue({ data: { written: true } })
		const w = mountWidget()
		await w.find('textarea').setValue('We looked into it.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(mockEmit).toHaveBeenCalledWith('cn:page:refresh', {})
	})

	it('shows an echoed reply at once and reads nothing again', async () => {
		mockPost.mockResolvedValue({ data: { message: 'We looked into it.' } })
		const w = mountWidget()
		await w.find('textarea').setValue('We looked into it.')
		await w.find('form').trigger('submit')
		await flushPromises()
		expect(w.text()).toContain('We looked into it.')
		expect(mockEmit).not.toHaveBeenCalledWith('cn:page:refresh', {})
	})
})
