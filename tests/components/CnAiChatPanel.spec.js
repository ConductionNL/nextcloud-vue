/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tests for CnAiChatPanel.vue — the NcAppSidebar-based AI Chat Companion panel.
 *
 * The header (agent name, close) is now NcAppSidebar's built-in chrome; the
 * panel's own wiring is: the agent-name title, the "Start new chat" / "History"
 * secondary actions, the Chat tab body (CnAiMessageList + CnAiInput), and the
 * history dialog. NcAppSidebar / NcActionButton / etc. are stubbed so the test
 * exercises CnAiChatPanel's wiring rather than the @nextcloud/vue components.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(),
	},
}))

const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default

const mockStreamState = {
	isStreaming: false,
	currentText: '',
	toolCalls: [],
	error: null,
	messages: [],
	conversationUuid: null,
}

const stubs = {
	NcAppSidebar: {
		name: 'NcAppSidebar',
		props: ['name', 'title', 'active', 'forceMenu'],
		template: `<div class="stub-app-sidebar" :data-name="name" :data-title="title">
			<div class="stub-description"><slot name="description" /></div>
			<div class="stub-secondary-actions"><slot name="secondary-actions" /></div>
			<slot />
		</div>`,
	},
	NcAppSidebarTab: {
		name: 'NcAppSidebarTab',
		props: ['id', 'name', 'order'],
		template: '<div class="stub-app-sidebar-tab" :data-id="id"><slot name="icon" /><slot /></div>',
	},
	NcActionButton: {
		name: 'NcActionButton',
		props: ['ariaLabel', 'title', 'disabled'],
		template: '<button class="stub-action-btn" :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
	},
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name'],
		template: '<div class="stub-empty" :data-name="name"><slot name="icon" /><slot name="description" /></div>',
	},
	CnAiMessageList: {
		name: 'CnAiMessageList',
		props: ['messages', 'currentText'],
		template: '<div class="stub-message-list"><slot name="empty" /></div>',
	},
	CnAiInput: {
		name: 'CnAiInput',
		props: ['disabled', 'chatAppId'],
		methods: { focus() {} },
		template: '<div class="stub-input" />',
	},
	CnAiAgentPicker: {
		name: 'CnAiAgentPicker',
		props: ['agents', 'loading', 'fetchError', 'value'],
		template: '<div class="stub-agent-picker" />',
	},
	CnAiRecentSessions: {
		name: 'CnAiRecentSessions',
		props: ['conversations', 'activeConversationUuid', 'loading'],
		template: '<div class="stub-recent-sessions" />',
	},
	CnAiHistoryList: {
		name: 'CnAiHistoryList',
		props: ['conversations', 'loading', 'fetchError', 'activeConversationUuid', 'chatAppId', 'searchable'],
		template: '<div class="stub-history-list" />',
	},
}

function mountPanel(props = {}, provide = {}) {
	return mount(CnAiChatPanel, {
		propsData: { visible: true, streamState: mockStreamState, ...props },
		provide: { cnTranslate: (key) => key, ...provide },
		stubs,
	})
}

describe('CnAiChatPanel', () => {
	it('renders an NcAppSidebar titled "Hermiq" with a Chat tab', () => {
		const wrapper = mountPanel()
		const sidebar = wrapper.findComponent({ name: 'NcAppSidebar' })
		expect(sidebar.exists()).toBe(true)
		expect(sidebar.props('name')).toBe('Hermiq')
		expect(sidebar.props('title')).toBe('Hermiq')
		expect(wrapper.findComponent({ name: 'NcAppSidebarTab' }).props('id')).toBe('chat')
	})

	it('exposes "Start new chat" and "History" as the two secondary actions', () => {
		const wrapper = mountPanel()
		const actions = wrapper.findAllComponents({ name: 'NcActionButton' })
		expect(actions.length).toBe(2)
		expect(actions.wrappers.map((a) => a.props('ariaLabel'))).toEqual(['Start new chat', 'History'])
		// Both labelled for a11y.
		actions.wrappers.forEach((btn) => expect(btn.props('ariaLabel')).toBeTruthy())
	})

	it('emits "close" when NcAppSidebar requests close', () => {
		const wrapper = mountPanel()
		wrapper.findComponent({ name: 'NcAppSidebar' }).vm.$emit('close')
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('emits "new-thread" when the Start-new-chat action is clicked while a conversation is active', async () => {
		const wrapper = mountPanel({
			streamState: { ...mockStreamState, messages: [{ role: 'user', content: 'hi' }] },
		})
		await wrapper.findAllComponents({ name: 'NcActionButton' }).at(0).trigger('click')
		expect(wrapper.emitted('new-thread')).toBeTruthy()
	})

	it('disables "Start new chat" and does not emit "new-thread" when already on the fresh new-chat screen', async () => {
		// Default mockStreamState has no messages — this IS the fresh new-chat screen.
		const wrapper = mountPanel()
		expect(wrapper.vm.isOnNewChatScreen).toBe(true)
		expect(wrapper.findAllComponents({ name: 'NcActionButton' }).at(0).props('disabled')).toBe(true)
		await wrapper.findAllComponents({ name: 'NcActionButton' }).at(0).trigger('click')
		expect(wrapper.emitted('new-thread')).toBeFalsy()
	})

	it('switches to the inline History tab when the History action is clicked (no overlay dialog)', async () => {
		const wrapper = mountPanel()
		expect(wrapper.vm.activeTab).toBe('chat')
		await wrapper.findAllComponents({ name: 'NcActionButton' }).at(1).trigger('click')
		expect(wrapper.vm.activeTab).toBe('history')
		expect(wrapper.findComponent({ name: 'CnAiHistoryList' }).exists()).toBe(true)
	})

	it('re-emits "load-conversation", records the active uuid, and returns to the chat tab on history select', () => {
		const wrapper = mountPanel()
		wrapper.vm.activeTab = 'history'
		wrapper.findComponent({ name: 'CnAiHistoryList' }).vm.$emit('select', 'conv-123')
		expect(wrapper.vm.activeConversationUuid).toBe('conv-123')
		expect(wrapper.vm.activeTab).toBe('chat')
		expect(wrapper.emitted('load-conversation')[0][0]).toBe('conv-123')
	})

	it('emits "send" (with the selected agent uuid and attachments) when CnAiInput triggers send', () => {
		const wrapper = mountPanel()
		wrapper.vm.selectedAgentUuid = 'agent-1'
		const attachments = [{ path: '/tmp/foo.txt', name: 'foo.txt' }]
		wrapper.vm.onSend({ text: 'Hello from input', attachments })
		expect(wrapper.emitted('send')).toBeTruthy()
		expect(wrapper.emitted('send')[0]).toEqual(['Hello from input', 'agent-1', attachments])
	})
})
