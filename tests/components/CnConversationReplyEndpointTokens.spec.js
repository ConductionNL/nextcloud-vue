/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * conversation-reply-endpoint-tokens: the reply `endpoint` fills
 * `@object.<path>` from the record as `source.url` does; an unresolved
 * `@object.` token posts nowhere, and an endpoint with only `@objectId`
 * is unchanged.
 *
 * @spec openspec/changes/conversation-reply-endpoint-tokens/specs/conversation-source/spec.md#requirement-the-reply-endpoint-is-filled-from-the-record-like-the-source
 */
import { mount } from '@vue/test-utils'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn() } }))

/**
 * @param {object} content Widget content.
 * @param {object} objectData The record.
 * @return {object} Wrapper.
 */
function mountWidget(content, objectData) {
	return mount(CnConversationWidget, {
		props: { content, objectId: 'ticket-1', objectData },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { template: '<button type="submit"><slot /></button>' } } },
	})
}

describe('CnConversationWidget: the reply endpoint takes the record\'s tokens', () => {
	it('fills @object.<path> from the record', () => {
		const w = mountWidget({ field: 'messages', endpoint: '/apps/pipelinq/api/web-chat/conversations/@object.threadKey/reply' }, { messages: [], threadKey: 'conversation:abc' })
		expect(w.vm.endpoint).toBe('/apps/pipelinq/api/web-chat/conversations/conversation%3Aabc/reply')
		w.unmount()
	})

	it('posts nowhere when the record lacks the value', () => {
		const w = mountWidget({ field: 'messages', endpoint: '/apps/pipelinq/api/web-chat/conversations/@object.threadKey/reply' }, { messages: [] })
		expect(w.vm.endpoint).toBe('')
		w.unmount()
	})

	it('keeps an endpoint with only @objectId as before', () => {
		const w = mountWidget({ field: 'messages', endpoint: '/api/tickets/@objectId/reply' }, { messages: [] })
		expect(w.vm.endpoint).toBe('/api/tickets/ticket-1/reply')
		w.unmount()
	})
})
