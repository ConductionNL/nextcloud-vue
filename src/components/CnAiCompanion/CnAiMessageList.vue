<!--
  CnAiMessageList — renders a list of conversation messages.

  Roles: 'user' (right-aligned, plain text), 'assistant' (left-aligned, NcRichText),
  'system' (centered, subdued). Tool-calls / tool-results rendered inline, collapsed
  by default and expandable on click.

  The assistant message container has aria-live="polite" for screen-reader streaming.
-->
<template>
	<div class="cn-ai-message-list" data-testid="cn-ai-message-list">
		<!-- Empty state -->
		<div v-if="messages.length === 0" class="cn-ai-message-list__empty">
			<slot name="empty" />
		</div>

		<div
			v-for="(message, index) in messages"
			:key="index"
			:class="['cn-ai-message-list__item', `cn-ai-message-list__item--${message.role}`]">
			<!-- System message -->
			<div v-if="message.role === 'system'" class="cn-ai-message-list__system-text">
				{{ message.content }}
			</div>

			<!-- User message — plain text, no markdown -->
			<div v-else-if="message.role === 'user'" class="cn-ai-message-list__bubble cn-ai-message-list__bubble--user">
				<span class="cn-ai-message-list__user-text">{{ message.content }}</span>
			</div>

			<!-- Assistant message — markdown via NcRichText + tool calls -->
			<div
				v-else
				class="cn-ai-message-list__bubble cn-ai-message-list__bubble--assistant"
				aria-live="polite">
				<!--
				  `use-markdown` alone renders INLINE syntax only — bold, italic,
				  links — which is why a model's answer showed bold headings while
				  its tables arrived as raw pipes and dashes. `use-extended-markdown`
				  is the prop that turns on the block syntax (tables, headings,
				  lists, code blocks), and an agent answering with data reaches for
				  a table constantly.
				-->
				<NcRichText
					v-if="message.content"
					:text="message.content"
					:use-markdown="true"
					:use-extended-markdown="true" />

				<!-- Tool calls / results -->
				<div
					v-for="(tool, tIdx) in (message.toolCalls || [])"
					:key="tIdx"
					:class="['cn-ai-message-list__tool', { 'cn-ai-message-list__tool--error': tool.isError }]">
					<button
						type="button"
						class="cn-ai-message-list__tool-summary"
						:aria-expanded="!!tool._expanded"
						@click="toggleTool(index, tIdx)">
						<ChevronDown
							:size="16"
							:class="['cn-ai-message-list__tool-chevron', { 'cn-ai-message-list__tool-chevron--open': tool._expanded }]" />
						{{ cnTranslate('Tool: {toolId}').replace('{toolId}', tool.toolId) }}
					</button>
					<div v-if="tool._expanded" class="cn-ai-message-list__tool-detail">
						<pre class="cn-ai-message-list__tool-json">{{ formatToolPayload(tool) }}</pre>
					</div>
				</div>
			</div>
		</div>

		<!-- Streaming in-progress indicator (partial tokens) -->
		<div v-if="currentText" class="cn-ai-message-list__item cn-ai-message-list__item--assistant">
			<div class="cn-ai-message-list__bubble cn-ai-message-list__bubble--assistant" aria-live="polite">
				<!-- Same treatment as a finalised message, or a table would render
				     as pipes while streaming and reflow into a table at the end. -->
				<NcRichText
					:text="currentText"
					:use-markdown="true"
					:use-extended-markdown="true" />
			</div>
		</div>

		<!--
		  Thinking placeholder bubble — shown while the request is in flight
		  but no streamed token has arrived yet. Local LLMs (Ollama et al.)
		  can take 10–30s before the first response so we need a visible
		  signal that something is happening; otherwise users assume the
		  chat is broken.
		-->
		<div
			v-if="isThinking"
			class="cn-ai-message-list__item cn-ai-message-list__item--assistant"
			data-testid="cn-ai-thinking">
			<div class="cn-ai-message-list__bubble cn-ai-message-list__bubble--assistant cn-ai-message-list__bubble--thinking"
				:aria-label="cnTranslate('AI is thinking')"
				role="status"
				aria-live="polite">
				<span class="cn-ai-message-list__thinking-text">{{ cnTranslate('Thinking') }}</span><span class="cn-ai-message-list__thinking-dots" aria-hidden="true"><span class="cn-ai-message-list__thinking-dot" /><span class="cn-ai-message-list__thinking-dot" /><span class="cn-ai-message-list__thinking-dot" /></span>
			</div>
		</div>
	</div>
</template>

<script>
import { NcRichText } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'

export default {
	name: 'CnAiMessageList',

	components: {
		NcRichText,
		ChevronDown,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Array of message objects: { role, content, toolCalls? }
		 */
		messages: {
			type: Array,
			default: () => [],
		},
		/**
		 * Partial streaming text from the current token stream.
		 */
		currentText: {
			type: String,
			default: '',
		},
		/**
		 * Streaming/request-in-flight flag. When true AND `currentText` is
		 * empty, the component renders a "Thinking..." placeholder bubble
		 * with animated dots so users get a visible signal that a slow
		 * local LLM is still working. Computed property `isThinking` below
		 * combines the two conditions.
		 *
		 * @type {boolean}
		 */
		isStreaming: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		// We mutate tool entries to track expanded state.
		// Keep a local copy to avoid mutating prop.
		return {}
	},

	computed: {
		/**
		 * Show the thinking placeholder only when we are actively waiting
		 * AND no token has arrived yet. Once the first token streams in,
		 * `currentText` carries the partial response and the placeholder
		 * is hidden so we don't double up.
		 *
		 * @returns {boolean}
		 */
		isThinking() {
			return this.isStreaming && (!this.currentText || this.currentText.length === 0)
		},
	},

	methods: {
		toggleTool(messageIndex, toolIndex) {
			const msg = this.messages[messageIndex]
			if (!msg || !msg.toolCalls) return
			const tool = msg.toolCalls[toolIndex]
			if (!tool) return
			// Vue 2: use $set for reactivity on new properties
			msg.toolCalls[toolIndex] = { ...tool, _expanded: !tool._expanded }
		},

		formatToolPayload(tool) {
			const payload = {}
			if (tool.arguments !== undefined) payload.arguments = tool.arguments
			if (tool.result !== undefined) payload.result = tool.result
			const json = JSON.stringify(payload, null, 2)
			// Truncate at 10KB
			if (json.length > 10240) {
				return json.substring(0, 10240) + '\n... (truncated)'
			}
			return json
		},
	},
}
</script>

<style>
.cn-ai-message-list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	overflow-y: auto;
}

.cn-ai-message-list__empty {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
}

/* Message item layout */
.cn-ai-message-list__item {
	display: flex;
}

.cn-ai-message-list__item--user {
	justify-content: flex-end;
}

.cn-ai-message-list__item--assistant {
	justify-content: flex-start;
}

.cn-ai-message-list__item--system {
	justify-content: center;
}

/* Bubbles */
.cn-ai-message-list__bubble {
	max-width: 80%;
	padding: 8px 12px;
	border-radius: var(--border-radius-large, 12px);
	word-break: break-word;
}

.cn-ai-message-list__bubble--user {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-ai-message-list__bubble--assistant {
	background: var(--color-background-hover);
	color: var(--color-main-text);
}

.cn-ai-message-list__user-text {
	white-space: pre-wrap;
}

.cn-ai-message-list__system-text {
	padding: 4px 8px;
	border-radius: var(--border-radius);
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

/* Tool call entries */
.cn-ai-message-list__tool {
	margin-top: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	overflow: hidden;
}

.cn-ai-message-list__tool--error {
	border-color: var(--color-error);
}

.cn-ai-message-list__tool-summary {
	display: flex;
	align-items: center;
	gap: 4px;
	width: 100%;
	padding: 4px 8px;
	border: none;
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 0.85em;
	text-align: left;
	cursor: pointer;
}

.cn-ai-message-list__tool--error .cn-ai-message-list__tool-summary {
	background: var(--color-error-rgb, rgba(220, 53, 69, 0.1));
	color: var(--color-error);
}

.cn-ai-message-list__tool-chevron {
	transition: transform 0.15s ease;
}

.cn-ai-message-list__tool-chevron--open {
	transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
	.cn-ai-message-list__tool-chevron {
		transition: none;
	}
}

.cn-ai-message-list__tool-detail {
	padding: 8px;
	background: var(--color-main-background);
}

.cn-ai-message-list__tool-json {
	margin: 0;
	font-size: 0.8em;
	white-space: pre-wrap;
	word-break: break-all;
}

/* Thinking placeholder — animated dots */
.cn-ai-message-list__bubble--thinking {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-ai-message-list__thinking-text {
	user-select: none;
}

.cn-ai-message-list__thinking-dots {
	display: inline-flex;
	gap: 2px;
	margin-left: 2px;
}

.cn-ai-message-list__thinking-dot {
	display: inline-block;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.3;
	animation: cn-ai-thinking-bounce 1.2s ease-in-out infinite;
}

.cn-ai-message-list__thinking-dot:nth-child(2) {
	animation-delay: 0.15s;
}

.cn-ai-message-list__thinking-dot:nth-child(3) {
	animation-delay: 0.30s;
}

@keyframes cn-ai-thinking-bounce {
	0%, 80%, 100% {
		opacity: 0.3;
		transform: translateY(0);
	}
	40% {
		opacity: 1;
		transform: translateY(-3px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.cn-ai-message-list__thinking-dot {
		animation: cn-ai-thinking-fade 1.4s ease-in-out infinite;
		transform: none;
	}
	@keyframes cn-ai-thinking-fade {
		0%, 100% { opacity: 0.3; }
		50%      { opacity: 1; }
	}
}
</style>
