/**
 * Tests for CnAiChatPanel.vue interactions.
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

function mountPanel(props = {}, provide = {}) {
	return mount(CnAiChatPanel, {
		propsData: {
			visible: true,
			streamState: mockStreamState,
			...props,
		},
		provide: {
			cnTranslate: (key) => key,
			...provide,
		},
		stubs: {
			CnAiHistoryDialog: { template: '<div class="stub-history-dialog" />' },
		},
	})
}

describe('CnAiChatPanel', () => {
	it('renders header with agent name, History, Start new chat, Close buttons', () => {
		const wrapper = mountPanel()

		expect(wrapper.find('.cn-ai-chat-panel__header').exists()).toBe(true)
		expect(wrapper.find('.cn-ai-chat-panel__agent-name').exists()).toBe(true)
		// Buttons with aria-labels
		const btns = wrapper.findAll('.cn-ai-chat-panel__header-btn')
		expect(btns.length).toBeGreaterThanOrEqual(3)
	})

	it('Close button click emits "close"', async () => {
		const wrapper = mountPanel()

		// Close button is the last header button
		const btns = wrapper.findAll('.cn-ai-chat-panel__header-btn')
		const closeBtn = btns.at(btns.length - 1)
		await closeBtn.trigger('click')

		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('Escape keydown emits "close"', async () => {
		const wrapper = mountPanel()

		await wrapper.trigger('keydown', { key: 'Escape' })
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('History button sets isHistoryOpen to true', async () => {
		const wrapper = mountPanel()

		// History button is the second header button (index 1)
		const btns = wrapper.findAll('.cn-ai-chat-panel__header-btn')
		await btns.at(1).trigger('click')

		expect(wrapper.vm.isHistoryOpen).toBe(true)
	})

	it('header buttons have aria-labels via cnTranslate', () => {
		const wrapper = mountPanel()

		const btns = wrapper.findAll('.cn-ai-chat-panel__header-btn')
		btns.wrappers.forEach((btn) => {
			expect(btn.attributes('aria-label')).toBeTruthy()
		})
	})

	it('emits "send" when CnAiInput triggers send', async () => {
		const wrapper = mountPanel()

		// Simulate the send event from CnAiInput child
		wrapper.vm.onSend('Hello from input')
		expect(wrapper.emitted('send')).toBeTruthy()
		expect(wrapper.emitted('send')[0][0]).toBe('Hello from input')
	})
})
