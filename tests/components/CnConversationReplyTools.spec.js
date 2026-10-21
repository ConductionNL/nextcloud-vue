/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * conversation-reply-tools: a conversation merges several lists of the record
 * by time (`fields`), offers templates in the reply box (`templates`, through
 * CnTemplateSelect), sends reply options with the reply (`replyOptions`),
 * shows a message's status (`statusField`) and acts on a message
 * (`messageActions`, such as "Send again" on a failed one).
 *
 * @spec openspec/changes/conversation-reply-tools/specs/conversation/spec.md
 */
var mockPost = jest.fn()
var mockRequest = jest.fn()
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: (...a) => mockPost(...a), request: (...a) => mockRequest(...a), get: (...a) => mockGet(...a) },
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { flushPromises, mount } from '@vue/test-utils'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

const TICKET = {
	id: 't-1',
	portalReplies: [
		{ message: 'Second question', createdAt: '2026-10-03T09:00:00Z' },
		{ message: 'First question', createdAt: '2026-10-01T09:00:00Z' },
	],
	portalAnswers: [{ message: 'An answer', createdAt: '2026-10-02T09:00:00Z' }],
}

const stubs = {
	NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcCheckboxRadioSwitch: {
		inheritAttrs: false,
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template: '<label><input type="checkbox" v-bind="$attrs" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
	},
	CnTemplateSelect: {
		name: 'CnTemplateSelect',
		props: ['url', 'params', 'inputLabel'],
		emits: ['apply'],
		template: '<div class="template-stub" />',
	},
}

/**
 * Mount the widget for ticket t-1.
 *
 * @param {object} content The content.
 * @param {object} [object] The record.
 * @return {object} The wrapper.
 */
function mountWidget(content, object = TICKET) {
	return mount(CnConversationWidget, {
		props: { content, objectId: 't-1', objectData: object },
		global: { provide: { cnTranslate: (key) => key }, stubs },
	})
}

beforeEach(() => {
	mockPost.mockReset()
	mockRequest.mockReset()
	mockGet.mockReset()
})

describe('CnConversationWidget: several lists, merged by time', () => {
	it('merges the lists of `fields` by time, each on its side', () => {
		const w = mountWidget({
			fields: [{ field: 'portalReplies', side: 'them' }, { field: 'portalAnswers', side: 'us' }],
			textField: 'message',
			timeField: 'createdAt',
			allowReply: false,
		})
		const items = w.findAll('[data-testid="cn-conversation-message"]')
		expect(items.map((li) => li.find('.cn-conversation-thread__text').text())).toEqual(['First question', 'An answer', 'Second question'])
		expect(items.map((li) => li.attributes('data-side'))).toEqual(['them', 'us', 'them'])
	})
})

describe('CnConversationWidget: reply tools', () => {
	const REPLY = {
		fields: [{ field: 'portalReplies', side: 'them' }, { field: 'portalAnswers', side: 'us' }],
		textField: 'message',
		timeField: 'createdAt',
		endpoint: '/apps/pipelinq/api/tickets/@objectId/answer',
		templates: { url: '/apps/pipelinq/api/saved-replies', params: { channel: 'portal', ticket: '@objectId' }, inputLabel: 'Saved reply', textField: 'body' },
		replyOptions: [{ key: 'waitForCustomer', label: 'Also set the ticket to waiting for the customer', default: true }],
	}

	it('offers the templates in the reply box, with tokens resolved, and a pick fills the reply', async () => {
		const w = mountWidget(REPLY)
		const select = w.findComponent({ name: 'CnTemplateSelect' })
		expect(select.props('url')).toBe('/apps/pipelinq/api/saved-replies')
		expect(select.props('params')).toEqual({ channel: 'portal', ticket: 't-1' })
		expect(select.props('inputLabel')).toBe('Saved reply')
		select.vm.$emit('apply', { id: 'r-1', name: 'Thanks', values: { body: 'Thank you, Jan.' } })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-conversation-input"]').element.value).toBe('Thank you, Jan.')
	})

	it('sends the reply options with the reply', async () => {
		mockPost.mockResolvedValue({ data: { message: 'Hello' } })
		const w = mountWidget(REPLY)
		const option = w.find('[data-testid="cn-conversation-option-waitForCustomer"]')
		expect(option.element.checked).toBe(true)
		await option.setValue(false)
		await w.find('[data-testid="cn-conversation-input"]').setValue('Hello')
		await w.find('[data-testid="cn-conversation-reply"]').trigger('submit')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/nc/apps/pipelinq/api/tickets/t-1/answer', { waitForCustomer: false, message: 'Hello' })
	})

	it('hands the reply options to a replyAction', async () => {
		const dispatch = jest.fn().mockResolvedValue(true)
		const w = mount(CnConversationWidget, {
			props: { content: { ...REPLY, endpoint: undefined, replyAction: { type: 'handler', handler: 'answer' } }, objectId: 't-1', objectData: TICKET },
			global: { provide: { cnTranslate: (key) => key, cnDispatchAction: dispatch }, stubs },
		})
		await w.find('[data-testid="cn-conversation-input"]').setValue('Hello')
		await w.find('[data-testid="cn-conversation-reply"]').trigger('submit')
		await flushPromises()
		expect(dispatch.mock.calls[0][0].args).toEqual([{ text: 'Hello', objectId: 't-1', options: { waitForCustomer: true } }])
	})
})

describe('CnConversationWidget: message status and actions', () => {
	const MESSAGES = {
		field: 'messages',
		textField: 'body',
		timeField: 'sentAt',
		sideField: 'direction',
		usValue: 'outbound',
		allowReply: false,
		statusField: 'deliveryStatus',
		statusMap: { failed: 'Failed', delivered: 'Delivered' },
		messageActions: [
			{ id: 'resend', label: 'Send again', endpoint: '/apps/pipelinq/api/messages/{id}/resend', method: 'POST', when: { field: 'deliveryStatus', in: ['failed'] }, errorText: 'Could not send it again.' },
		],
	}
	const record = {
		id: 'c-1',
		messages: [
			{ id: 'm-1', body: 'Hi', sentAt: '2026-10-01T09:00:00Z', direction: 'outbound', deliveryStatus: 'delivered' },
			{ id: 'm-2', body: 'Are you there?', sentAt: '2026-10-02T09:00:00Z', direction: 'outbound', deliveryStatus: 'failed' },
		],
	}

	it('shows each message status and offers the action only where its condition holds', () => {
		const w = mountWidget(MESSAGES, record)
		const items = w.findAll('[data-testid="cn-conversation-message"]')
		expect(items.map((li) => li.find('[data-testid="cn-conversation-status"]').text())).toEqual(['Delivered', 'Failed'])
		expect(items[0].find('[data-testid="cn-conversation-action-resend"]').exists()).toBe(false)
		expect(items[1].find('[data-testid="cn-conversation-action-resend"]').text()).toBe('Send again')
	})

	it('calls the action endpoint for the message', async () => {
		mockRequest.mockResolvedValue({ data: {} })
		const w = mountWidget(MESSAGES, record)
		await w.find('[data-testid="cn-conversation-action-resend"]').trigger('click')
		await flushPromises()
		expect(mockRequest).toHaveBeenCalledWith({ method: 'post', url: '/nc/apps/pipelinq/api/messages/m-2/resend' })
	})

	it('says so when the action fails', async () => {
		mockRequest.mockRejectedValue(new Error('down'))
		const w = mountWidget(MESSAGES, record)
		await w.find('[data-testid="cn-conversation-action-resend"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-conversation-action-error"]').text()).toBe('Could not send it again.')
	})
})
