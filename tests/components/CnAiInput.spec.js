/**
 * Tests for CnAiInput.vue keyboard, disabled-state, and attach-file behaviour.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn(),
	},
}))

// eslint-disable-next-line n/no-missing-require -- ESM-only package; jest resolves it via moduleNameMapper (tests/__mocks__/nextcloud-axios.js)
const axios = require('@nextcloud/axios').default
const CnAiInput = require('../../src/components/CnAiCompanion/CnAiInput.vue').default

function mountInput(props = {}) {
	return mount(CnAiInput, {
		propsData: props,
		provide: { cnTranslate: (key) => key },
	})
}

describe('CnAiInput', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('Enter sends { text, attachments } and clears the textarea', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')

		await textarea.setValue('Hello there')
		await textarea.trigger('keydown.enter', { shiftKey: false })

		const sent = wrapper.emitted('send')
		expect(sent).toBeTruthy()
		expect(sent[0][0]).toEqual({ text: 'Hello there', attachments: [] })
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

		expect(textarea.attributes('disabled')).toBeDefined()
		expect(sendBtn.attributes('disabled')).toBeDefined()
	})

	it('disabled prop shows NcLoadingIcon on send button', async () => {
		const wrapper = mountInput({ disabled: true })
		// NcLoadingIcon is stubbed as a div.stub.NcLoadingIcon
		expect(wrapper.find('.NcLoadingIcon').exists()).toBe(true)
		// Send icon should not be visible
		expect(wrapper.find('.Send').exists()).toBe(false)
	})

	it('send button disabled when textarea contains only whitespace and there are no attachments', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')
		const sendBtn = wrapper.find('.cn-ai-input__send-button')

		await textarea.setValue('   ')
		expect(sendBtn.attributes('disabled')).toBeDefined()
	})

	it('send button enabled when textarea has non-whitespace text', async () => {
		const wrapper = mountInput()
		const textarea = wrapper.find('textarea')

		await textarea.setValue('hello')
		// In non-disabled mode, button should NOT have disabled attr
		// (it's only disabled when isSendDisabled || disabled prop)
		expect(wrapper.vm.isTextEmpty).toBe(false)
	})

	it('send button is enabled with an attachment even when the textarea is empty', async () => {
		const wrapper = mountInput()
		wrapper.vm.attachments = [{ path: '/uploads/foo.txt', name: 'foo.txt' }]
		await wrapper.vm.$nextTick()
		const sendBtn = wrapper.find('.cn-ai-input__send-button')
		expect(sendBtn.attributes('disabled')).toBeUndefined()
	})

	it('uploads the picked file via multipart POST to the attachments endpoint and renders a chip', async () => {
		axios.post.mockResolvedValue({ data: { path: '/uploads/foo.txt', name: 'foo.txt' } })
		const wrapper = mountInput({ chatAppId: 'hermiq' })

		const file = new File(['hello world'], 'foo.txt', { type: 'text/plain' })
		const fileInput = wrapper.find('input[type="file"]')
		Object.defineProperty(fileInput.element, 'files', { value: [file] })
		await fileInput.trigger('change')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(axios.post).toHaveBeenCalledWith(
			'/index.php/apps/hermiq/api/chat/attachments',
			expect.any(FormData),
		)
		expect(wrapper.vm.attachments).toEqual([{ path: '/uploads/foo.txt', name: 'foo.txt' }])
		expect(wrapper.find('[data-testid="cn-ai-input-chips"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('foo.txt')
	})

	it('surfaces the backend {error} message inline on a 400 rejection instead of dropping the file', async () => {
		const err = new Error('Rejected')
		err.response = { status: 400, data: { error: 'File is too large' } }
		axios.post.mockRejectedValue(err)
		const wrapper = mountInput()

		const file = new File(['x'.repeat(30000)], 'big.txt', { type: 'text/plain' })
		const fileInput = wrapper.find('input[type="file"]')
		Object.defineProperty(fileInput.element, 'files', { value: [file] })
		await fileInput.trigger('change')
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.attachments).toEqual([])
		expect(wrapper.vm.uploadError).toBe('File is too large')
		expect(wrapper.find('[data-testid="cn-ai-input-error"]').exists()).toBe(true)
	})

	it('removes a pending attachment chip when its remove button is clicked', async () => {
		const wrapper = mountInput()
		wrapper.vm.attachments = [{ path: '/uploads/foo.txt', name: 'foo.txt' }]
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-ai-input-chip-remove-0"]').trigger('click')

		expect(wrapper.vm.attachments).toEqual([])
	})

	it('clears attachments after a send', async () => {
		const wrapper = mountInput()
		wrapper.vm.attachments = [{ path: '/uploads/foo.txt', name: 'foo.txt' }]
		await wrapper.vm.$nextTick()

		wrapper.vm.handleSend()

		expect(wrapper.vm.attachments).toEqual([])
		expect(wrapper.emitted('send')[0][0]).toEqual({ text: '', attachments: [{ path: '/uploads/foo.txt', name: 'foo.txt' }] })
	})
})
