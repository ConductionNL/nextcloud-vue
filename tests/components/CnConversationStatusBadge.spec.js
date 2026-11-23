/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A conversation shows the status of the latest conversation thread as a
 * badge (`statusBadge`), and a message action whose answer names a status in
 * `onStatus` runs that action instead of showing a refusal (the WhatsApp
 * session closed: open the composer for a template).
 *
 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md#requirement-a-conversation-shows-the-latest-thread-status-and-a-status-can-open-a-follow-up
 */
var mockRequest = jest.fn()
var mockFetch = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { request: (...a) => mockRequest(...a), get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: (...a) => mockFetch(...a) }))

import { flushPromises, mount } from '@vue/test-utils'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

const stubs = {
	NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcCheckboxRadioSwitch: true,
	CnTemplateSelect: true,
}

const RECORD = {
	id: 'c-1',
	messages: [{ id: 'm-2', body: 'Are you there?', sentAt: '2026-10-02T09:00:00Z', direction: 'outbound', deliveryStatus: 'failed' }],
}

const BASE = {
	field: 'messages',
	textField: 'body',
	timeField: 'sentAt',
	sideField: 'direction',
	usValue: 'outbound',
	allowReply: false,
	title: 'Messages',
}

function mountWidget(content, dispatch = jest.fn()) {
	return mount(CnConversationWidget, {
		props: { content, objectId: 'c-1', objectData: RECORD },
		global: { provide: { cnTranslate: (key) => key, cnDispatchAction: dispatch }, stubs },
	})
}

beforeEach(() => {
	mockRequest.mockReset()
	mockFetch.mockReset()
})

describe('CnConversationWidget: statusBadge', () => {
	it('shows the status of the most recent thread, mapped', async () => {
		mockFetch.mockResolvedValue([
			{ id: 'k-1', status: 'closed', lastInboundAt: '2026-09-01T09:00:00Z' },
			{ id: 'k-2', status: 'assigned', lastInboundAt: '2026-10-01T09:00:00Z' },
		])
		const w = mountWidget({
			...BASE,
			statusBadge: { source: { register: 'pipelinq', schema: 'channelConversation', filter: { contactId: '@objectId' } }, sortField: 'lastInboundAt', path: 'status', map: { open: 'Open', assigned: 'Assigned', closed: 'Closed' } },
		})
		await flushPromises()
		expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ register: 'pipelinq', schema: 'channelConversation', filter: { contactId: 'c-1' } }))
		expect(w.find('[data-testid="cn-conversation-status-badge"]').text()).toBe('Assigned')
	})

	it('shows no badge without a thread', async () => {
		mockFetch.mockResolvedValue([])
		const w = mountWidget({ ...BASE, statusBadge: { source: { register: 'pipelinq', schema: 'channelConversation', filter: { contactId: '@objectId' } }, path: 'status' } })
		await flushPromises()
		expect(w.find('[data-testid="cn-conversation-status-badge"]').exists()).toBe(false)
	})
})

describe('CnConversationWidget: messageActions onStatus', () => {
	const ACTIONS = [{
		id: 'resend',
		label: 'Send again',
		endpoint: '/apps/pipelinq/api/messaging/messages/{id}/resend',
		when: { field: 'deliveryStatus', in: ['failed'] },
		errors: { path: 'status', map: { 'template-required': 'Closed, template required' }, default: 'Sending failed again.' },
		onStatus: { 'template-required': { type: 'open-modal', target: 'SendMessageModal', props: { contactId: '@objectId', initialChannel: 'whatsapp' } } },
	}]

	it('runs the follow-up action for a status it names instead of showing the refusal', async () => {
		mockRequest.mockRejectedValue({ response: { data: { status: 'template-required' } } })
		const dispatch = jest.fn().mockResolvedValue(true)
		const w = mountWidget({ ...BASE, messageActions: ACTIONS }, dispatch)
		await w.find('[data-testid="cn-conversation-action-resend"]').trigger('click')
		await flushPromises()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-modal', target: 'SendMessageModal', props: { contactId: 'c-1', initialChannel: 'whatsapp' } }))
		expect(w.find('[data-testid="cn-conversation-action-error"]').exists()).toBe(false)
	})

	it('still shows the refusal for a status it does not name', async () => {
		mockRequest.mockResolvedValue({ data: { status: 'consent-missing' } })
		const dispatch = jest.fn()
		const w = mountWidget({ ...BASE, messageActions: ACTIONS }, dispatch)
		await w.find('[data-testid="cn-conversation-action-resend"]').trigger('click')
		await flushPromises()
		expect(dispatch).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-conversation-action-error"]').text()).toBe('Sending failed again.')
	})
})
