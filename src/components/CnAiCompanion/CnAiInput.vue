<!--
  CnAiInput — multi-line textarea + send button for the AI Chat Companion.

  - Auto-grows vertically up to ~6 lines, then scrolls internally.
  - Enter sends and clears; Shift+Enter inserts a newline.
  - Disabled prop disables both controls; send button shows NcLoadingIcon.
  - Send button disabled when textarea is empty or whitespace-only.
-->
<template>
	<div class="cn-ai-input" data-testid="cn-ai-input">
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
			:disabled="disabled || isTextEmpty"
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
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import Send from 'vue-material-design-icons/Send.vue'

export default {
	name: 'CnAiInput',

	components: {
		NcLoadingIcon,
		Send,
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
	},

	emits: ['send'],

	data() {
		return {
			inputText: '',
		}
	},

	computed: {
		isTextEmpty() {
			return !this.inputText || !this.inputText.trim()
		},
	},

	methods: {
		handleEnter() {
			if (this.disabled || this.isTextEmpty) {
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
			if (this.disabled || this.isTextEmpty) {
				return
			}
			const text = this.inputText.trim()
			this.inputText = ''
			this.$nextTick(() => {
				this.autoGrow()
			})
			this.$emit('send', text)
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
	},
}
</script>

<style>
.cn-ai-input {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	padding: 8px 12px;
	border-top: 1px solid var(--color-border);
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

.cn-ai-input__send-button:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-ai-input__send-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
