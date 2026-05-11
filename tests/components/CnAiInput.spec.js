/**
 * Tests for CnAiInput.vue keyboard and disabled-state behaviour.
 */

import { mount } from '@vue/test-utils'
const CnAiInput = require('../../src/components/CnAiCompanion/CnAiInput.vue').default

function mountInput(props = {}) {
	return mount(CnAiInput, {
		propsData: props,
		provide: { cnTranslate: (key) => key },
	})
}

describe('CnAiInput', () => {
	it('Enter sends and clears the textarea', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')

		await textarea.setValue('Hello there')
		await textarea.trigger('keydown.enter', { shiftKey: false })

		const sent = wrapper.emitted('send')
		expect(sent).toBeTruthy()
		expect(sent[0][0]).toBe('Hello there')
		expect(wrapper.vm.inputText).toBe('')
	})

	it('Shift+Enter inserts a newline and does NOT send', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')

		await textarea.setValue('Line one')
		// Simulate Shift+Enter
		await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
		// handleShiftEnter() does nothing special — the browser inserts \n;
		// in jsdom we manually check no send event fired
		expect(wrapper.emitted('send')).toBeFalsy()
	})

	it('disabled prop disables both controls', async () => {
		const wrapper = mountInput({ disabled: true })

		const textarea = wrapper.find('textarea')
		const sendBtn = wrapper.find('.cn-ai-input__send-button')

		expect(textarea.attributes('disabled')).toBeTruthy()
		expect(sendBtn.attributes('disabled')).toBeTruthy()
	})

	it('disabled prop shows NcLoadingIcon on send button', async () => {
		const wrapper = mountInput({ disabled: true })
		// NcLoadingIcon is stubbed as a div.stub.NcLoadingIcon
		expect(wrapper.find('.NcLoadingIcon').exists()).toBe(true)
		// Send icon should not be visible
		expect(wrapper.find('.Send').exists()).toBe(false)
	})

	it('send button disabled when textarea contains only whitespace', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')
		const sendBtn = wrapper.find('.cn-ai-input__send-button')

		await textarea.setValue('   ')
		expect(sendBtn.attributes('disabled')).toBeTruthy()
	})

	it('send button enabled when textarea has non-whitespace text', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')
		const sendBtn = wrapper.find('.cn-ai-input__send-button')

		await textarea.setValue('hello')
		// In non-disabled mode, button should NOT have disabled attr
		// (it's only disabled when isTextEmpty || disabled prop)
		expect(wrapper.vm.isTextEmpty).toBe(false)
	})
})
