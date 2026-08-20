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
					'cn-ai-input__mic-button--recording': micIsOpen,
					'cn-ai-input__mic-button--transcribing': transcribing,
					'cn-ai-input__mic-button--blocked': speechBlockedReason !== '',
				}"
				type="button"
				:aria-label="micButtonLabel"
				:title="micButtonLabel"
				:aria-pressed="micIsOpen ? 'true' : 'false'"
				:aria-disabled="speechBlockedReason !== '' ? 'true' : 'false'"
				:disabled="disabled"
				:data-engine="dictationDecision.engine"
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
				<!-- The clip is recorded; this is the wait for the transcript.
				     The microphone is already closed, so showing the recording
				     state through it would be the same lie in a new place. -->
				<NcLoadingIcon
					v-if="transcribing"
					:size="20" />
				<Microphone
					v-else-if="micIsOpen"
					:size="20" />
				<MicrophoneOutline
					v-else
					:size="20" />
			</button>
			<!--
			  Conversation — a SEPARATE control from the microphone, offered only
			  where the agent allows it. Same reason it is a separate icon:
			  pressing "dictate" must never post a message by itself, and
			  pressing "converse" is the act of agreeing that it will.
			-->
			<button
				v-if="conversationButtonVisible"
				class="cn-ai-input__converse-button"
				:class="{ 'cn-ai-input__converse-button--active': conversing }"
				type="button"
				:aria-label="converseButtonLabel"
				:title="converseButtonLabel"
				:aria-pressed="conversing ? 'true' : 'false'"
				:disabled="disabled && conversing === false"
				data-testid="cn-ai-input-converse"
				@click="toggleConversation">
				<Headset
					v-if="conversing"
					:size="20" />
				<HeadsetOff
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
import Headset from 'vue-material-design-icons/Headset.vue'
import HeadsetOff from 'vue-material-design-icons/HeadsetOff.vue'
import MicrophoneOutline from 'vue-material-design-icons/MicrophoneOutline.vue'
import { DEFAULT_CHAT_APP_ID, attachmentsUrl, speechTranscriptionsUrl } from '../../composables/aiChatConfig.js'
import {
	SPEECH_AUTO,
	SPEECH_LOCAL,
	SPEECH_OFF,
	browserRecognitionUsable,
	browserRecordingUsable,
	resolveDictationEngine,
} from '../../composables/aiSpeechPolicy.js'
import { createLocalDictation } from '../../composables/aiLocalDictation.js'

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
		Headset,
		HeadsetOff,
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
		/**
		 * Which engine this agent's dictation may use: `auto`, `browser`,
		 * `local` or `off`. Comes from the agent's `voiceInputEngine`.
		 *
		 * 🔴 `local` MEANS ONLY LOCAL. It is not a preference to be abandoned
		 * when the instance's speech service is down — an agent is set to it
		 * because its subject matter must not reach a cloud service, and the
		 * browser engine IS a cloud service in Chrome, Edge and Safari alike.
		 * @type {string}
		 */
		speechInputEngine: {
			type: String,
			default: SPEECH_AUTO,
		},
		/**
		 * Whether the instance's own speech service answered its capability
		 * probe. Passed in rather than probed here so one panel makes one call
		 * for every composer it owns.
		 *
		 * ⚠️ Defaults to FALSE, so an app that does not probe never offers a
		 * private engine it has not confirmed. Wrong in the safe direction: the
		 * cost is the browser engine where local would have worked, not audio
		 * leaving an instance that thought it was private.
		 * @type {boolean}
		 */
		localSpeechAvailable: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether this agent offers hands-free conversation — a separate
		 * control from the microphone, and deliberately so.
		 *
		 * Dictation and conversation are different acts. Dictating is writing
		 * with your voice: the words land in the box and you decide when they
		 * go. Conversing is talking to someone: your turn ends when you stop
		 * speaking, and it is sent. Putting both on one button would mean every
		 * dictated pause risks posting a half-finished thought, which is why
		 * this is a second control the user chose to press.
		 * @type {boolean}
		 */
		conversationEnabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['send', 'dictation-complete', 'conversation-state'],

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
			/** Whether a hands-free conversation is running. */
			conversing: false,
			/** The local-engine session, or null when idle. */
			localSession: null,
			/** Whether the local engine is recording right now. */
			localRecording: false,
			/**
			 * Whether a recorded clip is being transcribed.
			 *
			 * Its own state, not folded into `localRecording`: the microphone is
			 * already closed by then, and showing "recording" through a
			 * multi-second upload is the same lie the mic icon used to tell.
			 */
			transcribing: false,
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
		 * under the `webkit` prefix) and Firefox does not expose it at all.
		 *
		 * ⚠️ This answers "is the BROWSER engine available", which since the
		 * per-agent policy landed is no longer the same question as "may this
		 * agent dictate" — see `dictationDecision`. Used only by the browser
		 * path's own guard.
		 *
		 * @return {boolean} true when a SpeechRecognition constructor exists.
		 */
		speechSupported() {
			return browserRecognitionUsable()
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
			if (this.dictationDecision.engine === SPEECH_OFF) {
				return this.cnTranslate(this.dictationDecision.reason)
			}
			if (typeof window !== 'undefined' && window.isSecureContext === false) {
				return this.cnTranslate('Dictation needs a secure (https) connection')
			}
			return ''
		},

		/**
		 * Which engine this agent's dictation may use, and why not when it may not.
		 *
		 * The DECISION, not a preference — `startDictation` runs exactly what
		 * this names. See composables/aiSpeechPolicy.js for the rule that matters:
		 * an agent pinned to the private engine never falls back to the browser's,
		 * because that fallback would send confidential audio to a cloud service.
		 *
		 * @return {{engine: string, reason: string}} The decision.
		 */
		dictationDecision() {
			return resolveDictationEngine(
				{ inputEngine: this.speechInputEngine },
				{
					browserUsable: browserRecognitionUsable(),
					localUsable: this.localSpeechAvailable === true && browserRecordingUsable(),
				},
			)
		},

		/**
		 * Whether the mic button is offered at all.
		 *
		 * ⚠️ HIDDEN ONLY WHEN THE AGENT SAYS SO. An unavailable engine still
		 * renders the button, disabled and carrying its reason: a control that
		 * vanishes reads as a missing feature, while one that says "this agent
		 * may only use the private speech service, and it is unavailable" reads
		 * as a fact somebody can act on. The exception is `off`, where the agent
		 * has decided there is no dictation — then there is nothing to explain.
		 *
		 * @return {boolean} true when the button should render.
		 */
		speechButtonVisible() {
			if (this.speechInputEngine === SPEECH_OFF) {
				return false
			}
			return this.dictationDecision.engine !== SPEECH_OFF
				|| this.dictationDecision.reason !== ''
		},

		/**
		 * Whether dictation is currently running on either engine.
		 *
		 * @return {boolean} true while the microphone is open.
		 */
		micIsOpen() {
			return this.listening === true || this.localRecording === true
		},

		/**
		 * Whether the conversation control is offered.
		 *
		 * Both conditions matter: the agent has to allow it, AND there has to be
		 * an engine that can hear you. A hands-free control on an agent with no
		 * working microphone is a button that can only disappoint.
		 *
		 * @return {boolean} true when the control should render.
		 */
		conversationButtonVisible() {
			return this.conversationEnabled === true
				&& this.dictationDecision.engine !== SPEECH_OFF
		},

		/**
		 * The conversation control's label.
		 *
		 * Says what pressing it will DO, including the part people need warning
		 * about — that a pause sends the message.
		 *
		 * @return {string} The label.
		 */
		converseButtonLabel() {
			return this.conversing === true
				? this.cnTranslate('End the spoken conversation')
				: this.cnTranslate('Talk to the agent — your turn is sent when you stop speaking')
		},

		/**
		 * The mic button's label and tooltip.
		 *
		 * Names the ENGINE when dictation is idle and the private one would be
		 * used, because "which service is about to hear me" is not something a
		 * user can discover any other way — and the difference between the two
		 * is whether their words leave the building.
		 *
		 * @return {string} The label.
		 */
		micButtonLabel() {
			if (this.speechBlockedReason !== '') {
				return this.speechBlockedReason
			}
			if (this.transcribing === true) {
				return this.cnTranslate('Transcribing…')
			}
			if (this.micIsOpen === true) {
				return this.cnTranslate('Stop dictation')
			}
			if (this.dictationDecision.engine === SPEECH_LOCAL) {
				return this.cnTranslate('Dictate message (private, on this instance)')
			}
			return this.cnTranslate('Dictate message')
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
		this.conversing = false
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
				// …unless this silence is the end of a conversational turn, which
				// is the ONE case where a pause sends — and the user pressed a
				// separate control to say so.
				this.completeConversationTurn()
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
			// The reason is shown rather than the press being ignored: a button
			// that does nothing teaches nothing, and this one has something
			// specific to say — that the agent forbids the fast engine and the
			// private one is down.
			if (this.dictationDecision.engine === SPEECH_OFF) {
				this.showDictationError(this.cnTranslate(this.dictationDecision.reason))
				return
			}
			if (this.micIsOpen) {
				this.stopDictation()
				return
			}
			if (this.dictationDecision.engine === SPEECH_LOCAL) {
				this.startLocalDictation()
				return
			}
			this.startDictation()
		},

		/**
		 * Start or end a hands-free conversation.
		 *
		 * @return {void}
		 */
		toggleConversation() {
			if (this.conversing === true) {
				this.endConversation()
				return
			}
			if (this.dictationDecision.engine === SPEECH_OFF) {
				this.showDictationError(this.cnTranslate(this.dictationDecision.reason))
				return
			}
			this.conversing = true
			this.$emit('conversation-state', true)
			this.beginConversationTurn()
		},

		/**
		 * Stop conversing and release the microphone.
		 *
		 * ⚠️ The FIRST thing it does is clear the flag, before stopping
		 * dictation. `stopDictation` runs the same paths a silence does, and
		 * with the flag still set the engine's own stop event would be read as
		 * "your turn ended" and send whatever was captured — so pressing "end
		 * conversation" would post one last message on the way out.
		 *
		 * @return {void}
		 */
		endConversation() {
			this.conversing = false
			this.$emit('conversation-state', false)
			this.stopDictation()
		},

		/**
		 * Open the microphone for the user's next turn.
		 *
		 * @return {void}
		 */
		beginConversationTurn() {
			if (this.conversing === false || this.disabled === true) {
				return
			}
			if (this.dictationDecision.engine === SPEECH_LOCAL) {
				this.startLocalDictation()
				return
			}
			this.startDictation()
		},

		/**
		 * Called by the panel once the agent has finished answering — and, when
		 * the reply is spoken aloud, once it has finished being spoken.
		 *
		 * 🔴 THE MICROPHONE MUST NOT REOPEN WHILE THE AGENT IS TALKING. It would
		 * record the reply through the speakers and hand it back as the user's
		 * next turn, and with auto-send on a silence that becomes a conversation
		 * the agent is having with itself. Which is why the resume is driven
		 * from outside rather than from a timer in here: only the side that owns
		 * the speaking knows when it stopped.
		 *
		 * @return {void}
		 */
		resumeConversation() {
			this.beginConversationTurn()
		},

		/**
		 * End the user's turn: send what was heard.
		 *
		 * Nothing is sent when nothing was heard — an empty turn means the
		 * microphone opened, caught silence and closed, which should leave the
		 * conversation waiting rather than post a blank message.
		 *
		 * @return {void}
		 */
		completeConversationTurn() {
			if (this.conversing === false) {
				return
			}
			if (this.isSendDisabled === true) {
				return
			}
			this.handleSend()
		},

		/**
		 * Dictate through the instance's own speech service.
		 *
		 * No partial text on the way — whisper answers a finished clip — so the
		 * feedback is the recording state and then an explicit "transcribing"
		 * one. The result is APPENDED to whatever is already in the box, the
		 * same as the browser path, so dictating twice builds a message rather
		 * than replacing it.
		 *
		 * @return {void}
		 */
		startLocalDictation() {
			if (this.disabled) {
				return
			}
			this.dictationError = ''
			this.localSession = createLocalDictation({
				silenceTimeout: this.dictationSilenceTimeout,
				transcribe: (blob) => this.uploadForTranscription(blob),
				onTranscript: (text) => {
					const existing = this.inputText.trim()
					this.inputText = (existing === '') ? text : `${existing} ${text}`
					this.$nextTick(() => this.autoGrow())
					this.$emit('dictation-complete', text)
					// The local engine has no silence event of its own to hang
					// this on — the transcript ARRIVING is the end of the turn,
					// seconds after the speaker actually stopped.
					this.completeConversationTurn()
				},
				onError: (message) => {
					this.showDictationError(this.cnTranslate(message))
				},
				onStateChange: (state) => {
					this.localRecording = (state === 'recording')
					this.transcribing = (state === 'transcribing')
				},
			})
			this.localSession.start()
		},

		/**
		 * Send a recorded clip to the backend for transcription.
		 *
		 * @param {Blob} blob The recorded audio.
		 * @return {Promise<{text: string}>} The transcript.
		 */
		async uploadForTranscription(blob) {
			const formData = new FormData()
			formData.append('audio', blob, 'dictation.webm')
			// The page's language, for the same reason the browser engine is
			// given it: auto-detection misfires on short utterances, and a
			// Dutch sentence detected as English comes back as nonsense rather
			// than as an error.
			if (typeof document !== 'undefined' && document.documentElement.lang) {
				formData.append('language', document.documentElement.lang)
			}
			const response = await axios.post(speechTranscriptionsUrl(this.chatAppId), formData)

			return (response && response.data) || { text: '' }
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
			if (this.localSession !== null) {
				// The local session owns its own teardown, including releasing
				// the microphone BEFORE the transcript request goes out.
				this.localSession.stop()
				this.localSession = null
				this.localRecording = false
				return
			}
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

/* The conversation control sits beside the mic and matches it in weight —
   neither is the primary action, and a bigger one would suggest the hands-free
   mode is the normal way to use the composer rather than a deliberate choice. */
.cn-ai-input__converse-button {
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

.cn-ai-input__converse-button:disabled {
	opacity: .5;
	cursor: default;
}

.cn-ai-input__converse-button:hover:not(:disabled) {
	background: var(--color-background-hover);
}

/* Primary rather than error colour: a live conversation is a mode the user is
   in, not a recording warning — the microphone beside it carries that. */
.cn-ai-input__converse-button--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
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
