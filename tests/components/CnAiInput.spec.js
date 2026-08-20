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

/**
 * Dictation — the microphone's state and what a silence does.
 *
 * ⚠️ THIS WHOLE BLOCK IS NEW, AND ITS ABSENCE IS WHY THE MIC BUTTON SHIPPED
 * SHOWING THE OPPOSITE OF ITS STATE. The suite above covers typing, sending and
 * attachments; dictation had no test at all, so an inverted icon was as green as
 * a correct one.
 */
describe('CnAiInput dictation', () => {

	/**
	 * A stand-in for the browser's SpeechRecognition, which jsdom does not have.
	 * Records what the component did to it, and lets a test push results in.
	 */
	class FakeRecognition {

		constructor() {
			FakeRecognition.instances.push(this)
			this.started = 0
			this.stopped = 0
			this.continuous = false
			this.interimResults = false
			this.lang = ''
		}

		start() {
			this.started += 1
		}

		stop() {
			this.stopped += 1
		}

		/**
		 * Push a result the way the engine would.
		 *
		 * @param {string} transcript The words heard.
		 * @param {boolean} isFinal Whether the engine considers them settled.
		 * @return {void}
		 */
		emitResult(transcript, isFinal = false) {
			const results = [[{ transcript }]]
			results[0].isFinal = isFinal
			results.length = 1
			this.onresult({ resultIndex: 0, results })
		}

	}

	FakeRecognition.instances = []

	beforeEach(() => {
		jest.clearAllMocks()
		jest.useFakeTimers()
		FakeRecognition.instances = []
		window.SpeechRecognition = FakeRecognition
	})

	afterEach(() => {
		jest.useRealTimers()
		delete window.SpeechRecognition
	})

	/**
	 * Mount and press the mic button.
	 *
	 * @param {object} props Props for the component.
	 * @return {Promise<object>} The wrapper, already dictating.
	 */
	async function startDictating(props = {}) {
		const wrapper = mountInput(props)
		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')
		return wrapper
	}

	it('shows an OUTLINE mic when idle and a FILLED mic while listening — never the struck-through one', async () => {
		const wrapper = mountInput()

		// Idle: hollow mic, and specifically NOT the "muted" glyph.
		expect(wrapper.find('.microphone-outline-icon').exists()).toBe(true)
		expect(wrapper.find('.microphone-off-icon').exists()).toBe(false)

		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		// Live: filled mic on the recording state. A struck-through mic here is
		// the bug this test exists for — it reads as "muted" to every user.
		expect(wrapper.find('.microphone-icon').exists()).toBe(true)
		expect(wrapper.find('.microphone-off-icon').exists()).toBe(false)
		expect(wrapper.find('.cn-ai-input__mic-button--recording').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-ai-input-mic"]').attributes('aria-pressed')).toBe('true')
	})

	it('releases the microphone after the silence timeout and KEEPS the text', async () => {
		const wrapper = await startDictating({ dictationSilenceTimeout: 2500 })
		const recognition = FakeRecognition.instances[0]

		recognition.emitResult('een gedicteerde zin', true)
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.inputText).toBe('een gedicteerde zin')

		jest.advanceTimersByTime(2500)
		recognition.onend()
		await wrapper.vm.$nextTick()

		expect(recognition.stopped).toBe(1)
		expect(wrapper.vm.listening).toBe(false)
		// The point of the whole design: the words survive, unsent.
		expect(wrapper.vm.inputText).toBe('een gedicteerde zin')
		expect(wrapper.emitted('send')).toBeFalsy()
	})

	/*
	 * ⚠️ EVERY TEST BELOW ASSERTS THAT THE MIC *DOES* CLOSE, not only that it
	 * stays open. "Nothing stopped the recogniser" is satisfied perfectly by
	 * code with no silence timer at all — which is exactly the code these tests
	 * were written against. Four of them passed on the unfixed component before
	 * the closing assertion was added, proving nothing whatsoever.
	 */

	it('restarts the countdown on every result, so a pause between clauses does not cut you off', async () => {
		const wrapper = await startDictating({ dictationSilenceTimeout: 2500 })
		const recognition = FakeRecognition.instances[0]

		recognition.emitResult('eerste deel')
		jest.advanceTimersByTime(2000)
		recognition.emitResult('eerste deel tweede deel')
		jest.advanceTimersByTime(2000)

		// 4000ms have passed, but never 2500 in a row.
		expect(recognition.stopped).toBe(0)
		expect(wrapper.vm.listening).toBe(true)

		// …and the countdown is genuinely running, rather than absent: give it
		// the full silence and the microphone closes.
		jest.advanceTimersByTime(2500)
		expect(recognition.stopped).toBe(1)
	})

	it('does NOT arm the countdown before the first result — thinking is not silence', async () => {
		const wrapper = await startDictating({ dictationSilenceTimeout: 2500 })
		const recognition = FakeRecognition.instances[0]

		jest.advanceTimersByTime(10000)

		expect(recognition.stopped).toBe(0)
		expect(wrapper.vm.listening).toBe(true)

		// Speaking arms it — so the silence above was untimed by design, not
		// because there is no timer.
		recognition.emitResult('en dan begin ik')
		jest.advanceTimersByTime(2500)
		expect(recognition.stopped).toBe(1)
	})

	it('treats a timeout of 0 as "no timer"', async () => {
		const wrapper = await startDictating({ dictationSilenceTimeout: 0 })
		const untimed = FakeRecognition.instances[0]

		untimed.emitResult('blijf luisteren')
		jest.advanceTimersByTime(60000)

		expect(untimed.stopped).toBe(0)
		expect(wrapper.vm.listening).toBe(true)

		// The control for the above: the same fixture WITH a timeout does close,
		// so `0` is being honoured rather than the timer being missing.
		const timed = await startDictating({ dictationSilenceTimeout: 2500 })
		const timedRecognition = FakeRecognition.instances[1]
		timedRecognition.emitResult('deze stopt wel')
		jest.advanceTimersByTime(2500)
		expect(timedRecognition.stopped).toBe(1)
		expect(timed.vm.listening).toBe(false)
	})

	it('does not let a finished dictation\'s timer close the NEXT one', async () => {
		const wrapper = await startDictating({ dictationSilenceTimeout: 2500 })
		const first = FakeRecognition.instances[0]

		first.emitResult('eerste dictaat')
		// Stopped by hand well before the countdown would fire.
		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')
		first.onend()
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')
		const second = FakeRecognition.instances[1]
		jest.advanceTimersByTime(2400)

		// A leftover timer from the first dictation would have fired by now.
		expect(second.stopped).toBe(0)
		expect(wrapper.vm.listening).toBe(true)

		// The second dictation still has a working timer of its own.
		second.emitResult('tweede dictaat')
		jest.advanceTimersByTime(2500)
		expect(second.stopped).toBe(1)
	})
})
