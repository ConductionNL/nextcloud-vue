<!--
  CnAiInput — multi-line textarea + send button for the AI Chat Companion.

  - Auto-grows vertically up to ~6 lines, then scrolls internally.
  - Enter sends and clears; Shift+Enter inserts a newline.
  - Disabled prop disables both controls; send button shows NcLoadingIcon.
  - Send button disabled when the textarea is empty/whitespace-only AND no
    attachment has been added (an attachment-only send is allowed).
  - Attach button (paperclip) opens a hidden file input. The picked file is
    uploaded immediately as multipart/form-data (field `file`) to the chat
    backend's attachments endpoint (see composables/aiChatConfig.js
    `attachmentsUrl()`), which text-decodes and stores it, returning
    `{ path, name }`. Successful uploads render as removable chips above the
    textarea; a 400 rejection (oversized or non-UTF-8 binary) surfaces the
    backend's `{ error }` message inline via NcNoteCard rather than being
    dropped silently.
  - On send, the accumulated attachment refs are emitted alongside the text
    as `{ text, attachments }` and cleared (mirrors the existing optimistic
    textarea clear — this component fires the `send` event and does not wait
    for the parent's async request to resolve before clearing either).
-->
<template>
	<div class="cn-ai-input" data-testid="cn-ai-input">
		<NcNoteCard
			v-if="uploadError"
			type="error"
			class="cn-ai-input__error"
			data-testid="cn-ai-input-error">
			{{ uploadError }}
		</NcNoteCard>
		<NcNoteCard
			v-if="dictationError"
			type="warning"
			class="cn-ai-input__error"
			data-testid="cn-ai-input-dictation-error">
			{{ dictationError }}
		</NcNoteCard>
		<ul
			v-if="attachments.length"
			class="cn-ai-input__chips"
			data-testid="cn-ai-input-chips">
			<li
				v-for="(attachment, index) in attachments"
				:key="attachment.path"
				class="cn-ai-input__chip">
				<Paperclip :size="14" class="cn-ai-input__chip-icon" />
				<span class="cn-ai-input__chip-name">{{ attachment.name }}</span>
				<button
					type="button"
					class="cn-ai-input__chip-remove"
					:aria-label="cnTranslate('Remove attachment')"
					:disabled="disabled"
					:data-testid="'cn-ai-input-chip-remove-' + index"
					@click="removeAttachment(index)">
					<Close :size="14" />
				</button>
			</li>
		</ul>
		<div class="cn-ai-input__row">
			<!--
			  Dictation sits LEFT of the paperclip: both are ways of getting content
			  into the message, and speech is the one reached for first when typing
			  is the obstacle.

			  Rendered only where the browser can actually do it. A mic button that
			  silently does nothing is worse than no mic button, and support is
			  genuinely partial (WebKit-prefixed in Safari, absent in Firefox).
			-->
			<!--
			  ⚠️ NOT the `disabled` attribute when dictation is merely blocked.
			  Browsers suppress hover events on a disabled control, so its
			  `title` tooltip can never appear — the button would look dead and
			  still refuse to say why, which is the bug this is fixing.

			  So: `aria-disabled` for assistive tech, a class for the muted look,
			  and a live click handler that puts the reason on screen. The real
			  `disabled` attribute is still used for the one case that is not a
			  capability problem — a turn already streaming.
			-->
			<button
				v-if="speechButtonVisible"
				class="cn-ai-input__mic-button"
				:class="{
					'cn-ai-input__mic-button--recording': listening,
					'cn-ai-input__mic-button--blocked': speechBlockedReason !== '',
				}"
				type="button"
				:aria-label="speechBlockedReason || (listening ? cnTranslate('Stop dictation') : cnTranslate('Dictate message'))"
				:title="speechBlockedReason || (listening ? cnTranslate('Stop dictation') : cnTranslate('Dictate message'))"
				:aria-pressed="listening ? 'true' : 'false'"
				:aria-disabled="speechBlockedReason !== '' ? 'true' : 'false'"
				:disabled="disabled"
				data-testid="cn-ai-input-mic"
				@click="toggleDictation">
				<!--
				  🔴 THE FILLED MIC MEANS LIVE. THIS WAS THE OTHER WAY AROUND.
				  A struck-through mic (`MicrophoneOff`) rendered WHILE
				  RECORDING, on the reasoning that a button should picture the
				  action its click performs. Every other product on the user's
				  machine uses that glyph for "muted", so the composer read as
				  off while it was listening and on while it was idle —
				  reported from a live session where the reporter was watching
				  their own words appear under an icon saying the mic was off.

				  A control's icon states what IS, not what clicking does; the
				  label and `aria-pressed` carry the action.

				  Outline vs filled rather than a colour change alone, so the
				  two states are distinguishable without perceiving the red
				  (WCAG 2.2 SC 1.4.1 Use of Colour).
				-->
				<Microphone
					v-if="listening"
					:size="20" />
				<MicrophoneOutline
					v-else
					:size="20" />
			</button>
			<button
				class="cn-ai-input__attach-button"
				type="button"
				:aria-label="cnTranslate('Attach file')"
				:disabled="disabled || uploading"
				data-testid="cn-ai-input-attach"
				@click="openFilePicker">
				<NcLoadingIcon
					v-if="uploading"
					:size="20" />
				<Paperclip
					v-else
					:size="20" />
			</button>
			<!-- `:ref`, not `ref` — a fully static input with a cached handler
			     is hoisted to module scope, and a hoisted vnode's ref has no
			     owner, which throws in production builds where Vue's guard is
			     compiled out. See CnFilesTab for the full account. -->
			<input
				:ref="fileInputRef"
				type="file"
				class="cn-ai-input__file-input"
				data-testid="cn-ai-input-file"
				@change="onFileSelected">
			<textarea
				ref="textarea"
				v-model="inputText"
				class="cn-ai-input__textarea"
				:aria-label="cnTranslate('Message input')"
				:disabled="disabled"
				:placeholder="cnTranslate('Message input')"
				rows="1"
				data-testid="cn-ai-input-textarea"
				@keydown.enter.exact.prevent="handleEnter"
				@keydown.shift.enter.exact="handleShiftEnter"
				@input="autoGrow" />
			<button
				class="cn-ai-input__send-button"
				type="button"
				:aria-label="cnTranslate('Send message')"
				:disabled="disabled || isSendDisabled"
				data-testid="cn-ai-input-send"
				@click="handleSend">
				<NcLoadingIcon
					v-if="disabled"
					:size="20" />
				<Send
					v-else
					:size="20" />
			</button>
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import axios from '@nextcloud/axios'
import Send from 'vue-material-design-icons/Send.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Microphone from 'vue-material-design-icons/Microphone.vue'
import MicrophoneOutline from 'vue-material-design-icons/MicrophoneOutline.vue'
import { DEFAULT_CHAT_APP_ID, attachmentsUrl } from '../../composables/aiChatConfig.js'

/** How long a dictation failure stays on screen, in ms. */
const DICTATION_ERROR_TIMEOUT = 6000

export default {
	name: 'CnAiInput',

	components: {
		NcLoadingIcon,
		NcNoteCard,
		Send,
		Paperclip,
		Close,
		Microphone,
		MicrophoneOutline,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Whether the input controls are disabled (e.g. while streaming).
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Backend app id the attach control uploads files to
		 * (`POST /index.php/apps/{chatAppId}/api/chat/attachments`). See
		 * composables/aiChatConfig.js `attachmentsUrl()`.
		 * @type {string}
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},
		/**
		 * How long a silence may last during dictation before the microphone is
		 * released, in ms. `0` disables the timer and leaves the mic open until
		 * the user stops it or the engine gives up on its own.
		 *
		 * Releasing the mic is ALL this does — the transcript stays in the box
		 * for the user to read, edit and send. Dictation that posts by itself
		 * turns a pause for thought into a sent message, and there is no
		 * unsending. Conversation mode is where auto-send belongs, behind its
		 * own control that the user chose to press.
		 *
		 * Per-agent, because the right pause length is a property of the work:
		 * dictating a case note is not the same rhythm as answering a question.
		 * @type {number}
		 */
		dictationSilenceTimeout: {
			type: Number,
			default: 2500,
		},
	},

	emits: ['send'],

	data() {
		return {
			/** The hidden file input, set by the template's function ref (kept off `$refs` so the ref stays dynamic). @type {HTMLInputElement|null} */
			fileInputEl: null,
			inputText: '',
			/** Uploaded attachment refs: { path, name } — awaiting send. */
			attachments: [],
			/** Whether an upload request is in-flight. */
			uploading: false,
			/** Backend `{ error }` message from a rejected (400) upload, or ''. */
			uploadError: '',
			/** Whether dictation is currently capturing. */
			listening: false,
			/** The live SpeechRecognition instance, or null when idle. */
			recognition: null,
			/** Text already in the box when dictation started, so it is not lost. */
			textBeforeDictation: '',
			/** Timer that releases the mic after a silence. null when not armed. */
			silenceTimer: null,
			/** Last dictation failure, shown to the user. '' when none. */
			dictationError: '',
			/** Timer clearing that message, so it does not outlive its moment. */
			dictationErrorTimer: null,
		}
	},

	computed: {
		/**
		 * Whether this browser can do speech recognition at all.
		 *
		 * Checked rather than assumed: Chrome and Safari expose it (Safari only
		 * under the `webkit` prefix) and Firefox does not expose it at all. The
		 * button is not rendered when this is false.
		 *
		 * @return {boolean} true when a SpeechRecognition constructor exists.
		 */
		speechSupported() {
			return typeof window !== 'undefined'
				&& (typeof window.SpeechRecognition === 'function'
					|| typeof window.webkitSpeechRecognition === 'function')
		},

		/**
		 * Why dictation cannot run here, or '' when it can.
		 *
		 * 🔴 The constructor EXISTING is not the capability. On an insecure
		 * origin Chrome still exposes `webkitSpeechRecognition`, so a
		 * constructor check passes, and then `start()` fires `onerror:
		 * not-allowed` immediately — measured on this instance over http://,
		 * where `isSecureContext` is false and `navigator.mediaDevices` is
		 * undefined. The first version of this button did exactly that and
		 * appeared to do nothing at all when pressed.
		 *
		 * Reported rather than hidden: the button vanishing reads as a missing
		 * feature, while a disabled button that says why reads as a
		 * deployment fact the user can act on (serve over https).
		 *
		 * @return {string} A reason to show, or '' when dictation is available.
		 */
		speechBlockedReason() {
			if (!this.speechSupported) {
				return this.cnTranslate('Dictation is not supported in this browser')
			}
			if (typeof window !== 'undefined' && window.isSecureContext === false) {
				return this.cnTranslate('Dictation needs a secure (https) connection')
			}
			return ''
		},

		/**
		 * Whether the mic button is offered at all.
		 *
		 * @return {boolean} true when the browser has the API in any form.
		 */
		speechButtonVisible() {
			return this.speechSupported
		},

		isTextEmpty() {
			return !this.inputText || !this.inputText.trim()
		},

		/** Send is only blocked when there's neither text nor an attachment. */
		isSendDisabled() {
			return this.isTextEmpty && this.attachments.length === 0
		},
	},

	beforeUnmount() {
		// A recogniser outliving its component keeps the microphone open — the
		// indicator stays lit in the browser chrome with nothing on screen
		// explaining why.
		this.stopDictation()
		if (this.dictationErrorTimer !== null) {
			clearTimeout(this.dictationErrorTimer)
		}
	},

	methods: {
		/**
		 * Function ref for the hidden file input; a method so the binding is
		 * stable across renders.
		 *
		 * @param {HTMLInputElement|null} el The element, or null on unmount.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		/**
		 * Show a dictation failure, and take it away again.
		 *
		 * A banner with no lifetime is a banner that becomes furniture: the
		 * first version stayed on screen for the rest of the session, sitting
		 * above the composer long after the moment it described, so it read as a
		 * permanent state of the chat rather than as the result of a click.
		 *
		 * @param {string} message What went wrong.
		 * @return {void}
		 */
		showDictationError(message) {
			this.dictationError = message
			if (this.dictationErrorTimer !== null) {
				clearTimeout(this.dictationErrorTimer)
			}
			this.dictationErrorTimer = setTimeout(() => {
				this.dictationError = ''
				this.dictationErrorTimer = null
			}, DICTATION_ERROR_TIMEOUT)
		},

		/**
		 * (Re)start the silence countdown that releases the microphone.
		 *
		 * Called on every result — interim ones included, so a long sentence
		 * keeps the mic open while the words are still arriving rather than
		 * being cut off between clauses.
		 *
		 * ⚠️ ARMED BY SPEECH, NOT BY `start()`. Arming it when dictation begins
		 * closes the microphone on somebody who pressed the button and then
		 * spent four seconds deciding what to say — the exact moment the
		 * feature exists to serve. Until the first result arrives the engine's
		 * own `no-speech` error is the backstop, and it says something useful.
		 *
		 * @return {void}
		 */
		armSilenceTimer() {
			this.clearSilenceTimer()
			if (this.dictationSilenceTimeout <= 0) {
				return
			}
			this.silenceTimer = setTimeout(() => {
				this.silenceTimer = null
				// Only the microphone is released. The text stays put.
				this.stopDictation()
			}, this.dictationSilenceTimeout)
		},

		/**
		 * Cancel a pending silence countdown.
		 *
		 * ⚠️ A LEFTOVER TIMER OUTLIVES THE DICTATION THAT ARMED IT and would
		 * close the NEXT one mid-sentence, seconds after it started, with no
		 * silence involved. So this is called from every path that ends a
		 * dictation — stop, `onend`, `onerror`, unmount — not only the tidy one.
		 *
		 * @return {void}
		 */
		clearSilenceTimer() {
			if (this.silenceTimer !== null) {
				clearTimeout(this.silenceTimer)
				this.silenceTimer = null
			}
		},

		/**
		 * Start dictation, or stop it if already running.
		 *
		 * @return {void}
		 */
		toggleDictation() {
			if (this.listening) {
				this.stopDictation()
				return
			}
			this.startDictation()
		},

		/**
		 * Begin capturing speech into the message box.
		 *
		 * Interim results are shown as they arrive so the user can see it is
		 * working — dictation with no visible feedback reads as broken. Whatever
		 * was already typed is preserved and appended to, rather than replaced.
		 *
		 * @return {void}
		 */
		startDictation() {
			if (!this.speechSupported || this.disabled) {
				return
			}

			this.dictationError = ''
			const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
			const recognition = new Recognition()
			recognition.continuous = true
			recognition.interimResults = true
			// Follow the page's language rather than hardcoding one: this ships to
			// Dutch and English instances alike.
			recognition.lang = (typeof document !== 'undefined' && document.documentElement.lang)
				? document.documentElement.lang
				: 'en-US'

			this.textBeforeDictation = this.inputText

			recognition.onresult = (event) => {
				let finalText = ''
				let interimText = ''
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i]
					if (result.isFinal) {
						finalText += result[0].transcript
					} else {
						interimText += result[0].transcript
					}
				}
				if (finalText !== '') {
					this.textBeforeDictation = `${this.textBeforeDictation}${finalText}`.replace(/\s+/g, ' ')
				}
				this.inputText = `${this.textBeforeDictation}${interimText}`.trimStart()
				this.$nextTick(() => this.autoGrow())
				this.armSilenceTimer()
			}

			// `onend` fires for a user stop AND for the engine giving up on
			// silence, so the button state is driven from here rather than from
			// the click — otherwise the button lies after an idle timeout.
			recognition.onend = () => {
				this.clearSilenceTimer()
				this.listening = false
				this.recognition = null
			}

			// SHOW the failure. Silently resetting `listening` is what made the
			// button look inert: the user pressed it, nothing changed, and there
			// was nowhere to find out why. `not-allowed` is the common one — an
			// insecure origin or a denied microphone permission.
			recognition.onerror = (event) => {
				const code = (event && event.error) ? String(event.error) : 'unknown'
				this.showDictationError((code === 'not-allowed')
					? this.cnTranslate('Microphone blocked — allow access, or use https')
					: this.cnTranslate('Dictation stopped: ') + code)
				this.clearSilenceTimer()
				this.listening = false
				this.recognition = null
			}

			try {
				recognition.start()
				this.recognition = recognition
				this.listening = true
			} catch (e) {
				// `start()` throws if called twice, and on some browsers when the
				// origin is not permitted. Either way say so rather than resetting
				// in silence.
				this.showDictationError(
					this.cnTranslate('Dictation could not start: ') + (e.message || 'unknown'),
				)
				this.listening = false
				this.recognition = null
			}
		},

		/**
		 * Stop dictation and release the microphone.
		 *
		 * @return {void}
		 */
		stopDictation() {
			this.clearSilenceTimer()
			if (!this.recognition) {
				this.listening = false
				return
			}
			try {
				this.recognition.stop()
			} catch (e) {
				// Already stopped; nothing to release.
			}
			this.recognition = null
			this.listening = false
		},

		handleEnter() {
			if (this.disabled || this.isSendDisabled) {
				return
			}
			this.handleSend()
		},

		handleShiftEnter() {
			// Default browser behaviour inserts a newline — we don't need to prevent it.
			// But we do need to trigger autoGrow after the character is inserted.
			this.$nextTick(() => this.autoGrow())
		},

		handleSend() {
			if (this.disabled || this.isSendDisabled) {
				return
			}
			const text = this.inputText.trim()
			const attachments = this.attachments.slice()
			this.inputText = ''
			this.attachments = []
			this.uploadError = ''
			this.$nextTick(() => {
				this.autoGrow()
			})
			this.$emit('send', { text, attachments })
		},

		autoGrow() {
			const el = this.$refs.textarea
			if (!el) return
			// Reset height first so shrinking works
			el.style.height = 'auto'
			// Clamp to 6-line max (~1.5em per line + padding)
			const maxHeight = parseInt(getComputedStyle(el).lineHeight || '24', 10) * 6 + 24
			el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
		},

		/** Focus the textarea — called by the parent panel on open. */
		focus() {
			this.$nextTick(() => {
				if (this.$refs.textarea) {
					this.$refs.textarea.focus()
				}
			})
		},

		/** Open the hidden file input in response to the paperclip button. */
		openFilePicker() {
			if (this.disabled || this.uploading) {
				return
			}
			this.uploadError = ''
			if (this.fileInputEl) {
				this.fileInputEl.click()
			}
		},

		/**
		 * Upload the picked file to the chat backend's attachments endpoint and,
		 * on success, add it as a removable chip. Surfaces the backend's
		 * `{ error }` message inline on a 400 rejection (oversized, or not
		 * text-decodable) instead of silently dropping the file.
		 * @param {Event} event The file input's change event.
		 * @return {Promise<void>}
		 */
		async onFileSelected(event) {
			const file = event.target && event.target.files && event.target.files[0]
			event.target.value = ''
			if (!file) {
				return
			}
			this.uploading = true
			this.uploadError = ''
			try {
				const formData = new FormData()
				formData.append('file', file)
				const response = await axios.post(attachmentsUrl(this.chatAppId), formData)
				const { path, name } = response.data || {}
				this.attachments.push({ path, name: name || file.name })
			} catch (err) {
				const backendMessage = err && err.response && err.response.status === 400
					? err.response.data && err.response.data.error
					: null
				this.uploadError = backendMessage || this.cnTranslate('Could not attach file')
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Remove a pending attachment chip before it's sent.
		 * @param {number} index Index into `attachments`.
		 */
		removeAttachment(index) {
			this.attachments.splice(index, 1)
		},
	},
}
</script>

<style>
.cn-ai-input {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 12px;
	border-top: 1px solid var(--color-border);
}

.cn-ai-input__error {
	margin: 0;
}

.cn-ai-input__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-ai-input__chip {
	display: flex;
	align-items: center;
	gap: 4px;
	max-width: 220px;
	padding: 4px 8px;
	border-radius: var(--border-radius-pill, 16px);
	background: var(--color-background-hover);
	font-size: 13px;
}

.cn-ai-input__chip-icon {
	flex-shrink: 0;
	opacity: 0.7;
}

.cn-ai-input__chip-name {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-input__chip-remove {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	cursor: pointer;
	opacity: 0.7;
}

/* `:focus-visible` and `:disabled` are declared BEFORE the compound
   `:hover:not(:disabled)` rule: stylelint's no-descending-specificity wants
   lower-specificity selectors first, and `:hover:not(:disabled)` outranks
   both. Ordering only — the cascade result is unchanged. */
.cn-ai-input__chip-remove:focus-visible {
	opacity: 1;
}

.cn-ai-input__chip-remove:disabled {
	cursor: not-allowed;
}

.cn-ai-input__chip-remove:hover:not(:disabled) {
	opacity: 1;
}

.cn-ai-input__row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.cn-ai-input__file-input {
	display: none;
}

/* Mic matches the paperclip exactly — they are peers in the row, and any
   difference in size or weight would read as one being the primary action. */
.cn-ai-input__mic-button {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

/* Declared BEFORE the hover rule below, which is more specific
   (`:hover:not(:disabled)`). Source order has to follow specificity here or the
   cascade's outcome depends on which rule happens to be written last — the
   thing `no-descending-specificity` exists to stop. */
.cn-ai-input__mic-button:disabled {
	opacity: .5;
	cursor: default;
}

.cn-ai-input__mic-button:hover:not(:disabled) {
	background: var(--color-background-hover);
}

/* Recording is a STATE, not a hover: it stays visible while the user speaks and
   looks away from the button. Error colour because it is the "something is
   live" signal, and the icon fills in beside it — it does NOT swap to a
   struck-through mic, which is what this comment used to describe and what made
   a listening composer look muted. */
.cn-ai-input__mic-button--recording {
	border-color: var(--color-error);
	background: var(--color-error);
	color: var(--color-primary-text, #fff);
}

.cn-ai-input__attach-button {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-ai-input__attach-button:hover:not(:disabled) {
	background: var(--color-background-hover);
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-ai-input__attach-button:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-ai-input__attach-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.cn-ai-input__textarea {
	flex: 1;
	min-height: 36px;
	max-height: calc(6 * 1.5em + 24px);
	padding: 8px;
	resize: none;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-family: inherit;
	font-size: inherit;
	line-height: 1.5;
	overflow-y: auto;
}

.cn-ai-input__textarea:focus {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 0;
	border-color: var(--color-primary-element);
}

.cn-ai-input__textarea:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.cn-ai-input__send-button {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: none;
	border-radius: var(--border-radius);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	cursor: pointer;
}

.cn-ai-input__send-button:hover:not(:disabled) {
	background: var(--color-primary-element-hover, var(--color-primary-element));
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-ai-input__send-button:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* stylelint-disable-next-line no-descending-specificity */
.cn-ai-input__send-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
