/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The approved-assistant mark footer of CnAiChatPanel (thematiq).
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))
jest.mock('../../src/utils/assistantMark.js', () => ({ getAssistantMark: jest.fn() }))

const { getAssistantMark } = require('../../src/utils/assistantMark.js')
const CnAiChatPanel = require('../../src/components/CnAiCompanion/CnAiChatPanel.vue').default

const streamState = {
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function mountPanel() {
	const wrapper = mount(CnAiChatPanel, {
		propsData: { visible: true, streamState },
		provide: { cnTranslate: (key) => key },
		stubs,
	})
	await flush()
	return wrapper
}

const MARK = {
	enabled: true,
	label: 'Goedgekeurd door Gemeente Voorbeeld',
	organisation: 'Gemeente Voorbeeld',
	logo: { url: '/apps/thematiq/img/logos/voorbeeld.svg', alt: 'Gemeente Voorbeeld logo' },
}

describe('CnAiChatPanel approved mark', () => {
	it('draws the logo and the label as received', async () => {
		getAssistantMark.mockResolvedValue(MARK)
		const wrapper = await mountPanel()
		const row = wrapper.find('[data-testid="cn-ai-panel-mark"]')
		expect(row.exists()).toBe(true)
		expect(row.attributes('role')).toBe('note')
		expect(row.find('img').attributes('alt')).toBe('Gemeente Voorbeeld logo')
		expect(row.text()).toBe('Goedgekeurd door Gemeente Voorbeeld')
	})

	it('shows the label alone without a logo', async () => {
		getAssistantMark.mockResolvedValue({ ...MARK, logo: null })
		const wrapper = await mountPanel()
		const row = wrapper.find('[data-testid="cn-ai-panel-mark"]')
		expect(row.exists()).toBe(true)
		expect(row.find('img').exists()).toBe(false)
	})

	it('keeps the mark in the history view', async () => {
		getAssistantMark.mockResolvedValue(MARK)
		const wrapper = await mountPanel()
		await wrapper.setData({ activeView: 'history' })
		expect(wrapper.find('[data-testid="cn-ai-panel-mark"]').exists()).toBe(true)
	})

	it('renders no row when there is no mark', async () => {
		getAssistantMark.mockResolvedValue(null)
		const wrapper = await mountPanel()
		expect(wrapper.find('[data-testid="cn-ai-panel-mark"]').exists()).toBe(false)
		expect(wrapper.find('.cn-ai-chat-window--has-mark').exists()).toBe(false)
	})
})
