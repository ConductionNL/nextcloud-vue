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
		props: ['ariaLabel', 'title'],
		template: '<button class="stub-action-btn" :aria-label="ariaLabel" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
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
		props: ['disabled'],
		methods: { focus() {} },
		template: '<div class="stub-input" />',
	},
	CnAiHistoryDialog: {
		name: 'CnAiHistoryDialog',
		props: ['open', 'activeConversationUuid'],
		template: '<div class="stub-history-dialog" />',
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
	it('renders an NcAppSidebar titled with the agent name and a Chat tab', () => {
		const wrapper = mountPanel()
		const sidebar = wrapper.findComponent({ name: 'NcAppSidebar' })
		expect(sidebar.exists()).toBe(true)
		expect(sidebar.props('name')).toBe('AI assistant')
		expect(sidebar.props('title')).toBe('AI assistant')
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

	it('emits "new-thread" when the Start-new-chat action is clicked', async () => {
		const wrapper = mountPanel()
		await wrapper.findAllComponents({ name: 'NcActionButton' }).at(0).trigger('click')
		expect(wrapper.emitted('new-thread')).toBeTruthy()
	})

	it('opens the history dialog when the History action is clicked', async () => {
		const wrapper = mountPanel()
		expect(wrapper.vm.isHistoryOpen).toBe(false)
		await wrapper.findAllComponents({ name: 'NcActionButton' }).at(1).trigger('click')
		expect(wrapper.vm.isHistoryOpen).toBe(true)
		expect(wrapper.findComponent({ name: 'CnAiHistoryDialog' }).props('open')).toBe(true)
	})

	it('re-emits "load-conversation" and records the active uuid on history select', () => {
		const wrapper = mountPanel()
		wrapper.findComponent({ name: 'CnAiHistoryDialog' }).vm.$emit('select', 'conv-123')
		expect(wrapper.vm.activeConversationUuid).toBe('conv-123')
		expect(wrapper.emitted('load-conversation')[0][0]).toBe('conv-123')
	})

	it('mirrors the history dialog\'s update:open back into state', () => {
		const wrapper = mountPanel()
		wrapper.vm.isHistoryOpen = true
		wrapper.findComponent({ name: 'CnAiHistoryDialog' }).vm.$emit('update:open', false)
		expect(wrapper.vm.isHistoryOpen).toBe(false)
	})

	it('emits "send" when CnAiInput triggers send', () => {
		const wrapper = mountPanel()
		wrapper.vm.onSend('Hello from input')
		expect(wrapper.emitted('send')).toBeTruthy()
		expect(wrapper.emitted('send')[0][0]).toBe('Hello from input')
	})
})
