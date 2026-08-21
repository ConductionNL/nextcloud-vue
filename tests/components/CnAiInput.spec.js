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

jest.mock('../../src/composables/aiLocalDictation.js', () => ({
	__esModule: true,
	createLocalDictation: jest.fn(() => ({
		start: jest.fn(),
		stop: jest.fn(),
		isActive: jest.fn(() => false),
	})),
}))

// eslint-disable-next-line n/no-missing-require -- ESM-only package; jest resolves it via moduleNameMapper (tests/__mocks__/nextcloud-axios.js)
const axios = require('@nextcloud/axios').default
const { createLocalDictation } = require('../../src/composables/aiLocalDictation.js')
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

/**
 * Which ENGINE the composer starts, per the agent's policy.
 *
 * 🔴 The assertions that matter here are negative ones: for an agent pinned to
 * the instance's own speech service, NO browser recogniser may be constructed —
 * not even when the browser has a perfectly good one sitting there. Constructing
 * it is how confidential audio reaches Google.
 */
describe('CnAiInput speech engines', () => {

	class FakeRecognition {

		constructor() {
			FakeRecognition.instances.push(this)
			this.started = 0
			this.stopped = 0
		}

		start() {
			this.started += 1
		}

		stop() {
			this.stopped += 1
		}

	}

	FakeRecognition.instances = []

	let session

	beforeEach(() => {
		jest.clearAllMocks()
		FakeRecognition.instances = []
		// A browser that CAN do speech recognition, so "local was chosen" is
		// never an accident of the browser being incapable.
		window.SpeechRecognition = FakeRecognition
		window.MediaRecorder = function MediaRecorderStub() {}
		navigator.mediaDevices = { getUserMedia: jest.fn() }

		session = { start: jest.fn(), stop: jest.fn(), isActive: jest.fn(() => false) }
		createLocalDictation.mockReturnValue(session)
	})

	afterEach(() => {
		delete window.SpeechRecognition
		delete window.MediaRecorder
		delete navigator.mediaDevices
	})

	it('uses the local engine — and NO browser recogniser — for a local-pinned agent', async () => {
		const wrapper = mountInput({ speechInputEngine: 'local', localSpeechAvailable: true })

		expect(wrapper.find('[data-testid="cn-ai-input-mic"]').attributes('data-engine')).toBe('local')

		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		expect(session.start).toHaveBeenCalled()
		expect(FakeRecognition.instances).toHaveLength(0)
	})

	it('🔴 refuses to dictate at all when a local-pinned agent has no local engine', async () => {
		const wrapper = mountInput({ speechInputEngine: 'local', localSpeechAvailable: false })
		const button = wrapper.find('[data-testid="cn-ai-input-mic"]')

		// The button is still there, and says why.
		expect(button.exists()).toBe(true)
		expect(button.attributes('aria-disabled')).toBe('true')
		expect(button.attributes('title')).toMatch(/private/i)

		await button.trigger('click')

		// Neither engine ran. Especially not the browser's.
		expect(FakeRecognition.instances).toHaveLength(0)
		expect(session.start).not.toHaveBeenCalled()
		expect(wrapper.vm.dictationError).toMatch(/private/i)
	})

	it('uses the browser engine on auto, where it is available', async () => {
		const wrapper = mountInput({ speechInputEngine: 'auto', localSpeechAvailable: true })

		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		expect(FakeRecognition.instances).toHaveLength(1)
		expect(createLocalDictation).not.toHaveBeenCalled()
	})

	it('falls back to the local engine on auto in a browser with no recognition (Firefox)', async () => {
		delete window.SpeechRecognition
		const wrapper = mountInput({ speechInputEngine: 'auto', localSpeechAvailable: true })

		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		expect(session.start).toHaveBeenCalled()
	})

	it('offers no microphone at all when the agent switches dictation off', () => {
		const wrapper = mountInput({ speechInputEngine: 'off', localSpeechAvailable: true })

		expect(wrapper.find('[data-testid="cn-ai-input-mic"]').exists()).toBe(false)
	})

	it('shows a distinct transcribing state — the mic is shut by then', async () => {
		const wrapper = mountInput({ speechInputEngine: 'local', localSpeechAvailable: true })
		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		// Drive the state the local session reports back.
		const { onStateChange } = createLocalDictation.mock.calls[0][0]
		onStateChange('transcribing')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.micIsOpen).toBe(false)
		expect(wrapper.find('.cn-ai-input__mic-button--recording').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-ai-input-mic"]').attributes('title')).toMatch(/transcrib/i)
	})

	it('appends the transcript to what is already typed rather than replacing it', async () => {
		const wrapper = mountInput({ speechInputEngine: 'local', localSpeechAvailable: true })
		await wrapper.find('textarea').setValue('Beste collega,')
		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')

		const { onTranscript } = createLocalDictation.mock.calls[0][0]
		onTranscript('hierbij de notulen.')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.inputText).toBe('Beste collega, hierbij de notulen.')
		// Dictation still never sends by itself.
		expect(wrapper.emitted('send')).toBeFalsy()
	})
})

/**
 * Conversation mode — the ONE place a pause is allowed to send.
 *
 * The dangerous failure here is not a missing message, it is a loop: reopen the
 * microphone while the agent's reply is still being spoken and it records the
 * reply through the speakers, sends it as the user's next turn, and the agent
 * answers itself hands-free until somebody notices.
 */
describe('CnAiInput conversation mode', () => {

	class FakeRecognition {

		constructor() {
			FakeRecognition.instances.push(this)
			this.stopped = 0
		}

		start() {}

		stop() {
			this.stopped += 1
		}

		emitResult(transcript) {
			const results = [[{ transcript }]]
			results[0].isFinal = true
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

	it('offers no conversation control unless the agent allows it', () => {
		expect(mountInput().find('[data-testid="cn-ai-input-converse"]').exists()).toBe(false)
		expect(
			mountInput({ conversationEnabled: true }).find('[data-testid="cn-ai-input-converse"]').exists(),
		).toBe(true)
	})

	it('sends the turn on a silence — the difference from dictation', async () => {
		const wrapper = mountInput({ conversationEnabled: true, dictationSilenceTimeout: 2500 })

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')
		FakeRecognition.instances[0].emitResult('hoeveel verlofdagen heb ik nog')
		await wrapper.vm.$nextTick()
		jest.advanceTimersByTime(2500)

		expect(wrapper.emitted('send')).toBeTruthy()
		expect(wrapper.emitted('send')[0][0].text).toBe('hoeveel verlofdagen heb ik nog')
	})

	it('does NOT send on a silence when only dictating — the same code path, the other mode', async () => {
		const wrapper = mountInput({ conversationEnabled: true, dictationSilenceTimeout: 2500 })

		// The microphone, not the headset.
		await wrapper.find('[data-testid="cn-ai-input-mic"]').trigger('click')
		FakeRecognition.instances[0].emitResult('een losse notitie')
		await wrapper.vm.$nextTick()
		jest.advanceTimersByTime(2500)

		expect(wrapper.emitted('send')).toBeFalsy()
		expect(wrapper.vm.inputText).toBe('een losse notitie')
	})

	it('🔴 does not reopen the microphone by itself after a turn — the panel does, once speaking has ended', async () => {
		const wrapper = mountInput({ conversationEnabled: true, dictationSilenceTimeout: 2500 })

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')
		FakeRecognition.instances[0].emitResult('vraag een')
		await wrapper.vm.$nextTick()
		jest.advanceTimersByTime(2500)

		// The turn was sent. Nothing may start listening again on a timer —
		// that is what records the agent's own reply.
		jest.advanceTimersByTime(30000)
		expect(FakeRecognition.instances).toHaveLength(1)

		// Only an explicit resume — which the panel calls when the reply has
		// finished being spoken — opens the microphone again.
		wrapper.vm.resumeConversation()
		expect(FakeRecognition.instances).toHaveLength(2)
	})

	it('does not send a parting message when the conversation is ended by hand', async () => {
		const wrapper = mountInput({ conversationEnabled: true, dictationSilenceTimeout: 2500 })

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')
		FakeRecognition.instances[0].emitResult('laat maar zitten')
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')

		expect(wrapper.vm.conversing).toBe(false)
		expect(wrapper.emitted('send')).toBeFalsy()
		// And a resume after ending stays ended.
		wrapper.vm.resumeConversation()
		expect(FakeRecognition.instances).toHaveLength(1)
	})

	it('does not post a blank turn when the microphone caught nothing', async () => {
		const wrapper = mountInput({ conversationEnabled: true, dictationSilenceTimeout: 2500 })

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')
		jest.advanceTimersByTime(30000)

		expect(wrapper.emitted('send')).toBeFalsy()
	})

	it('tells the panel when a conversation starts and ends', async () => {
		const wrapper = mountInput({ conversationEnabled: true })

		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')
		await wrapper.find('[data-testid="cn-ai-input-converse"]').trigger('click')

		expect(wrapper.emitted('conversation-state')).toEqual([[true], [false]])
	})
})

/**
 * The blocked state has to LOOK blocked.
 *
 * 🔴 `cn-ai-input__mic-button--blocked` was bound in the template and styled
 * nowhere for the whole life of the control, so a microphone that cannot run
 * looked identical to one that can until the user hovered it for a tooltip. A
 * class set and never read is a comment, not a state — and this is the state
 * that tells somebody their agent's private engine is unavailable.
 */
describe('CnAiInput blocked microphone', () => {

	beforeEach(() => {
		jest.clearAllMocks()
		// A browser with no speech recognition and no recorder: nothing can run,
		// so the control must render blocked rather than absent.
		delete window.SpeechRecognition
		delete window.MediaRecorder
	})

	it('marks the control blocked, and says why, rather than hiding it', () => {
		const wrapper = mountInput({ speechInputEngine: 'auto' })
		const button = wrapper.find('[data-testid="cn-ai-input-mic"]')

		expect(button.exists()).toBe(true)
		expect(button.classes()).toContain('cn-ai-input__mic-button--blocked')
		expect(button.attributes('aria-disabled')).toBe('true')
		expect(button.attributes('title')).not.toBe('')
	})

	it('🔴 keeps the blocked control CLICKABLE — it has to be able to explain itself', () => {
		const wrapper = mountInput({ speechInputEngine: 'auto' })
		const button = wrapper.find('[data-testid="cn-ai-input-mic"]')

		// NOT the native `disabled` attribute: a disabled button suppresses
		// hover, so its tooltip never appears and it refuses in silence. That is
		// the bug this shape exists to avoid.
		expect(button.attributes('disabled')).toBeUndefined()
	})

	it('carries a style rule for the blocked class, not just the class', () => {
		// The regression itself: the binding existed, the rule did not.
		const styles = require('fs').readFileSync(
			require('path').join(__dirname, '../../src/components/CnAiCompanion/CnAiInput.vue'),
			'utf8',
		)
		expect(styles).toMatch(/\.cn-ai-input__mic-button--blocked\s*\{/)
	})
})
