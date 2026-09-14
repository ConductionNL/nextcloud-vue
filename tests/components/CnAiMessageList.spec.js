/**
 * Tests for CnAiMessageList.vue
 */

import { mount } from '@vue/test-utils'
const CnAiMessageList = require('../../src/components/CnAiCompanion/CnAiMessageList.vue').default

const USER_MESSAGE = { role: 'user', content: 'Hi' }
const ASSISTANT_MESSAGE = { role: 'assistant', content: 'Hello!' }
const SYSTEM_MESSAGE = { role: 'system', content: 'System context loaded.' }
const MESSAGE_WITH_TOOL = {
	role: 'assistant',
	content: 'Using search tool...',
	toolCalls: [
		{ toolId: 'opencatalogi.searchCatalogues', arguments: { q: 'broker' } },
	],
}
const MESSAGE_WITH_ERROR_TOOL = {
	role: 'assistant',
	content: 'Tool failed.',
	toolCalls: [
		{ toolId: 'search', arguments: {}, result: { error: 'forbidden' }, isError: true },
	],
}

function mountList(messages = [], currentText = '') {
	return mount(CnAiMessageList, {
		propsData: { messages, currentText },
		provide: { cnTranslate: (key) => key },
	})
}

describe('CnAiMessageList', () => {
	it('renders user and assistant messages with distinct CSS classes', () => {
		const wrapper = mountList([USER_MESSAGE, ASSISTANT_MESSAGE])

		const items = wrapper.findAll('.cn-ai-message-list__item')
		expect(items.length).toBe(2)
		expect(items.at(0).classes()).toContain('cn-ai-message-list__item--user')
		expect(items.at(1).classes()).toContain('cn-ai-message-list__item--assistant')
	})

	it('user content NOT rendered through NcRichText (plain text)', () => {
		const wrapper = mountList([USER_MESSAGE])

		// User message should have .cn-ai-message-list__user-text, not NcRichText stub
		expect(wrapper.find('.cn-ai-message-list__user-text').exists()).toBe(true)
		expect(wrapper.find('.NcRichText').exists()).toBe(false)
	})

	it('assistant content IS rendered through NcRichText stub', () => {
		const wrapper = mountList([ASSISTANT_MESSAGE])

		// NcRichText is stubbed as .NcRichText
		expect(wrapper.find('.NcRichText').exists()).toBe(true)
	})

	it('system message renders with system CSS class', () => {
		const wrapper = mountList([SYSTEM_MESSAGE])

		expect(wrapper.find('.cn-ai-message-list__item--system').exists()).toBe(true)
		expect(wrapper.find('.cn-ai-message-list__system-text').exists()).toBe(true)
	})

	it('tool-call collapsed by default, expandable on click', async () => {
		const wrapper = mountList([MESSAGE_WITH_TOOL])

		const summary = wrapper.find('.cn-ai-message-list__tool-summary')
		expect(summary.exists()).toBe(true)
		// Detail should be hidden initially
		expect(wrapper.find('.cn-ai-message-list__tool-detail').exists()).toBe(false)

		// Click to expand
		await summary.trigger('click')
		expect(wrapper.find('.cn-ai-message-list__tool-detail').exists()).toBe(true)
	})

	it('never writes the expanded state onto the messages it was given', async () => {
		// 🔴 THE DEFECT. `toggleTool` set `_expanded` on the tool entry inside
		// the `messages` prop, so opening a tool call mutated the caller's
		// conversation in place. It also made the test above flaky: it passed
		// alone and failed under load, because a write that deep into a
		// shallow reactive prop is not something a re-render can rely on.
		//
		// ⚠️ ITS OWN LITERAL, NOT A CLONE OF `MESSAGE_WITH_TOOL`. Other tests
		// in this file click that shared fixture, and under the defect each
		// click wrote into it. A clone taken afterwards already carried the
		// write, so this guard compared a polluted "before" with an equally
		// polluted "after" and passed with the defect present. Watched it
		// happen: the mutation check reddened this test run alone and passed
		// it in the full file.
		const tool = { toolId: 'search', arguments: { q: 'broker' } }
		const messages = [{ role: 'assistant', content: 'Searching', toolCalls: [tool] }]
		const wrapper = mountList(messages)

		await wrapper.find('.cn-ai-message-list__tool-summary').trigger('click')

		expect(wrapper.find('.cn-ai-message-list__tool-detail').exists()).toBe(true)
		expect(messages[0].toolCalls[0]).toBe(tool)
		expect(tool).toEqual({ toolId: 'search', arguments: { q: 'broker' } })
	})

	it('closes again on a second click', async () => {
		const wrapper = mountList([JSON.parse(JSON.stringify(MESSAGE_WITH_TOOL))])
		const summary = wrapper.find('.cn-ai-message-list__tool-summary')

		await summary.trigger('click')
		await summary.trigger('click')

		expect(wrapper.find('.cn-ai-message-list__tool-detail').exists()).toBe(false)
		expect(summary.attributes('aria-expanded')).toBe('false')
	})

	it('tool-result with isError:true renders error styling', () => {
		const wrapper = mountList([MESSAGE_WITH_ERROR_TOOL])

		expect(wrapper.find('.cn-ai-message-list__tool--error').exists()).toBe(true)
	})

	it('renders streaming currentText as an additional assistant bubble', () => {
		const wrapper = mountList([], 'partial assistant text...')

		// There should be a streaming bubble even when messages array is empty
		expect(wrapper.find('.cn-ai-message-list__bubble--assistant').exists()).toBe(true)
	})

	it('assistant message container has aria-live="polite"', () => {
		const wrapper = mountList([ASSISTANT_MESSAGE])

		const assistantBubble = wrapper.find('.cn-ai-message-list__bubble--assistant')
		expect(assistantBubble.attributes('aria-live')).toBe('polite')
	})
})
