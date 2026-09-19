/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tests for CnAiChatPanel.vue — the AI Chat Companion chat WINDOW.
 *
 * ⚠️ These five assertions used to describe an NcAppSidebar: a docked panel with
 * a Chat tab, two secondary actions, and a `close` event coming from the sidebar
 * component. The redesign replaced that with a floating chat window, and the
 * tests kept describing the component that no longer exists — so they failed
 * against the very change they should have been verifying.
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

const axios = require('@nextcloud/axios').default
const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default

/**
 * Answer the agents endpoint with `agents` and every other GET with an empty
 * list, so a test can describe the agent roster without also having to
 * describe the conversations the panel fetches in the same `created()` hook.
 *
 * @param {Array<object>} agents Agent records as the agents API returns them.
 * @return {void}
 */
function serveAgents(agents) {
	axios.get.mockImplementation((url) => Promise.resolve({
		data: String(url).endsWith('/agents') ? { results: agents } : { results: [] },
	}))
}

const mockStreamState = {
	isStreaming: false,
	currentText: '',
	toolCalls: [],
	error: null,
	messages: [],
	conversationUuid: null,
}

const stubs = {
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

function mountPanel(props = {}, provide = {}, context = undefined) {
	return mount(CnAiChatPanel, {
		propsData: {
			visible: true,
			streamState: mockStreamState,
			...(context ? { context } : {}),
			...props,
		},
		provide: { cnTranslate: (key) => key, ...provide },
		stubs,
	})
}

/**
 * Let every already-resolved promise settle, so `created()`'s fetches have run.
 *
 * @return {Promise<void>}
 */
function flushPromises() {
	return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('CnAiChatPanel', () => {
	it('shows why a turn failed instead of going quiet', () => {
		const wrapper = mountPanel({
			streamState: {
				...mockStreamState,
				error: {
					code: 'tool_grants_unresolved',
					message: "This agent's tool grants resolve to no tools.",
				},
			},
		})

		const banner = wrapper.find('[data-testid="cn-ai-panel-error"]')
		expect(banner.exists()).toBe(true)
		expect(banner.text()).toContain('resolve to no tools')
	})

	it('renders a chat window, not a docked sidebar', () => {
		const wrapper = mountPanel()
		const win = wrapper.find('.cn-ai-chat-window')

		expect(win.exists()).toBe(true)

		// ⚠️ Labelled, but NOT asserted to equal 'Hermiq'. With no agent
		// resolved the label is the loading string, and pinning the agent's
		// name here would test the fixture rather than the component. What
		// matters is that the window always carries an accessible name and
		// that the visible identity says the same thing as the label.
		const label = win.attributes('aria-label')
		expect(typeof label === 'string' && label.length > 0).toBe(true)
		expect(win.find('.cn-ai-chat-window__identity-name').text()).toBe(label)

		// The thing the redesign removed. Asserted by absence because a
		// half-applied revert would otherwise render BOTH.
		expect(wrapper.findComponent({ name: 'NcAppSidebar' }).exists()).toBe(false)
	})

	it('shows the window title on the identity, for hover as well as screen readers', () => {
		const wrapper = mountPanel()
		const identity = wrapper.find('.cn-ai-chat-window__identity')

		expect(identity.exists()).toBe(true)
		// `title` AND the window's `aria-label` carry the same string: the name
		// is truncated in a 380px window, so hover is the only way a sighted
		// user reads it in full.
		expect(identity.attributes('title')).toBe(wrapper.find('.cn-ai-chat-window').attributes('aria-label'))
	})

	it('emits "close" when the titlebar close button is pressed', async () => {
		const wrapper = mountPanel()
		// Addressed by its test id, not by label text: the label goes through
		// `cnTranslate`, so matching on the English string would break under
		// any locale the component is actually used in.
		const close = wrapper.find('[data-testid="cn-ai-panel-close"]')

		expect(close.exists()).toBe(true)
		await close.trigger('click')
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

	it('switches to the inline history view, without an overlay dialog', async () => {
		// `activeView`, not `activeTab` — the window has two VIEWS where the
		// sidebar had tabs, and the old name silently referred to nothing.
		const wrapper = mountPanel()
		expect(wrapper.vm.activeView).toBe('chat')

		wrapper.vm.activeView = 'history'
		await wrapper.vm.$nextTick()

		expect(wrapper.findComponent({ name: 'CnAiHistoryList' }).exists()).toBe(true)
		// Inline, not an overlay: the history replaces the body of the same
		// window rather than opening a dialog over it.
		expect(wrapper.find('.cn-ai-chat-window').exists()).toBe(true)
	})

	it('re-emits "load-conversation", records the uuid, and returns to the chat view', async () => {
		const wrapper = mountPanel()
		wrapper.vm.activeView = 'history'
		await wrapper.vm.$nextTick()

		wrapper.findComponent({ name: 'CnAiHistoryList' }).vm.$emit('select', 'conv-123')

		expect(wrapper.vm.activeConversationUuid).toBe('conv-123')
		expect(wrapper.vm.activeView).toBe('chat')
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

	/**
	 * Which agent the panel starts on.
	 *
	 * The panel already computes `relevantAgentOptions` for the MENU. These
	 * assert that the same judgement decides the DEFAULT, because a default
	 * that ignores it hands the user an agent with no tools for the page they
	 * are on, and the only cure is a settings menu they have no reason to open.
	 */
	describe('the agent it starts on', () => {
		afterEach(() => {
			axios.get.mockImplementation(() => Promise.resolve({ data: { results: [] } }))
		})

		it('starts on an agent that has tools for this page, not merely the first one', async () => {
			serveAgents([
				{ uuid: 'agent-general', name: 'General assistant', tools: ['docudesk.summarise'] },
				{ uuid: 'agent-buildiq', name: 'Buildiq builder', tools: ['buildiq_listApps', 'buildiq_createApp'] },
			])

			const wrapper = mountPanel({}, {}, { appId: 'buildiq' })
			await flushPromises()

			expect(wrapper.vm.selectedAgentUuid).toBe('agent-buildiq')
		})

		it('still starts on the first agent when this page has no relevant one', async () => {
			serveAgents([
				{ uuid: 'agent-general', name: 'General assistant', tools: ['docudesk.summarise'] },
				{ uuid: 'agent-other', name: 'Other', tools: ['larpinq.roll'] },
			])

			const wrapper = mountPanel({}, {}, { appId: 'buildiq' })
			await flushPromises()

			// The relevance filter fails open, so nothing relevant means the
			// whole roster, and the first of it — exactly the old behaviour.
			expect(wrapper.vm.selectedAgentUuid).toBe('agent-general')
		})

		it('leaves a selection the caller already made alone', async () => {
			serveAgents([
				{ uuid: 'agent-general', name: 'General assistant', tools: ['docudesk.summarise'] },
				{ uuid: 'agent-buildiq', name: 'Buildiq builder', tools: ['buildiq_listApps'] },
			])

			const wrapper = mountPanel({}, {}, { appId: 'buildiq' })
			wrapper.vm.selectedAgentUuid = 'agent-general'
			await wrapper.vm.fetchAgents()

			expect(wrapper.vm.selectedAgentUuid).toBe('agent-general')
		})
	})
})
