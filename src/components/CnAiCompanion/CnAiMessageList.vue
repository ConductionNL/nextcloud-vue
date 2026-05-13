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
			class="cn-ai-message-list__item"
			:class="[`cn-ai-message-list__item--${message.role}`]">
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
				<!-- Streaming partial text (currentText from parent) -->
				<NcRichText
					v-if="message.content"
					:text="message.content"
					:use-markdown="true" />

				<!-- Tool calls / results -->
				<div
					v-for="(tool, tIdx) in (message.toolCalls || [])"
					:key="tIdx"
					class="cn-ai-message-list__tool"
					:class="[{ 'cn-ai-message-list__tool--error': tool.isError }]">
					<button
						type="button"
						class="cn-ai-message-list__tool-summary"
						:aria-expanded="!!tool._expanded"
						@click="toggleTool(index, tIdx)">
						<ChevronDown
							:size="16"
							class="cn-ai-message-list__tool-chevron"
							:class="[{ 'cn-ai-message-list__tool-chevron--open': tool._expanded }]" />
						{{ cnTranslate('Tool: {toolId}').replace('{toolId}', tool.toolId) }}
					</button>
					<div v-if="tool._expanded" class="cn-ai-message-list__tool-detail">
						<pre class="cn-ai-message-list__tool-json">{{ formatToolPayload(tool) }}</pre>
					</div>
				</div>
			</div>
		</div>

		<!-- Streaming in-progress indicator -->
		<div v-if="currentText" class="cn-ai-message-list__item cn-ai-message-list__item--assistant">
			<div class="cn-ai-message-list__bubble cn-ai-message-list__bubble--assistant" aria-live="polite">
				<NcRichText :text="currentText" :use-markdown="true" />
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
	},

	data() {
		// We mutate tool entries to track expanded state.
		// Keep a local copy to avoid mutating prop.
		return {}
	},

	methods: {
		toggleTool(messageIndex, toolIndex) {
			const msg = this.messages[messageIndex]
			if (!msg || !msg.toolCalls) return
			const tool = msg.toolCalls[toolIndex]
			if (!tool) return
			// Vue 2: use $set for reactivity on new properties
			this.$set(msg.toolCalls, toolIndex, { ...tool, _expanded: !tool._expanded })
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
</style>
