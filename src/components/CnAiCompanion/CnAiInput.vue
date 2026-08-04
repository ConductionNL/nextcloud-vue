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
			<input
				ref="fileInput"
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
import { DEFAULT_CHAT_APP_ID, attachmentsUrl } from '../../composables/aiChatConfig.js'

export default {
	name: 'CnAiInput',

	components: {
		NcLoadingIcon,
		NcNoteCard,
		Send,
		Paperclip,
		Close,
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
	},

	emits: ['send'],

	data() {
		return {
			inputText: '',
			/** Uploaded attachment refs: { path, name } — awaiting send. */
			attachments: [],
			/** Whether an upload request is in-flight. */
			uploading: false,
			/** Backend `{ error }` message from a rejected (400) upload, or ''. */
			uploadError: '',
		}
	},

	computed: {
		isTextEmpty() {
			return !this.inputText || !this.inputText.trim()
		},

		/** Send is only blocked when there's neither text nor an attachment. */
		isSendDisabled() {
			return this.isTextEmpty && this.attachments.length === 0
		},
	},

	methods: {
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
			if (this.$refs.fileInput) {
				this.$refs.fileInput.click()
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

.cn-ai-input__chip-remove:disabled {
	cursor: not-allowed;
}

.cn-ai-input__chip-remove:focus-visible,
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
