<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: AGPL-3.0-or-later

  CnAiRecentSessions — up-to-5 recent-conversation cards shown on the AI Chat
  Companion's "start a new conversation" screen (CnAiChatPanel's empty-state),
  plus a "View all conversations" expander that hands off to the sidebar's
  searchable History tab (CnAiHistoryList).

  Purely presentational: `conversations` (already normalized via
  aiChatConfig.js's normalizeConversation()) and `loading` are owned and
  fetched by the parent (CnAiChatPanel), which also reuses the same fetch for
  the History tab's full list. Renders nothing while loading or when there
  are no conversations yet — the surrounding empty-state's own "ask me
  anything" message already covers that case.
-->
<template>
	<div v-if="!loading && conversations.length > 0" class="cn-ai-recent-sessions" data-testid="cn-ai-recent-sessions">
		<p class="cn-ai-recent-sessions__title">
			{{ cnTranslate('Recent conversations') }}
		</p>
		<ul class="cn-ai-recent-sessions__list">
			<li v-for="conv in conversations" :key="conv.uuid">
				<button
					type="button"
					class="cn-ai-recent-sessions__card"
					:class="{ 'cn-ai-recent-sessions__card--active': conv.uuid === activeConversationUuid }"
					data-testid="cn-ai-recent-session-card"
					@click="$emit('select', conv.uuid)">
					<span class="cn-ai-recent-sessions__card-title">{{ conv.title || cnTranslate('New conversation') }}</span>
					<span v-if="conv.description" class="cn-ai-recent-sessions__card-desc">{{ conv.description }}</span>
				</button>
			</li>
		</ul>
		<button
			type="button"
			class="cn-ai-recent-sessions__view-all"
			data-testid="cn-ai-recent-sessions-view-all"
			@click="$emit('view-all')">
			{{ cnTranslate('View all conversations') }}
		</button>
	</div>
</template>

<script>
export default {
	name: 'CnAiRecentSessions',

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Up to 5 normalized conversations (see aiChatConfig.js's normalizeConversation()). */
		conversations: {
			type: Array,
			default: () => [],
		},
		/** UUID of the currently active conversation (for the active-card indicator). */
		activeConversationUuid: {
			type: String,
			default: null,
		},
		/** Whether the parent's conversation fetch is still in flight. */
		loading: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['select', 'view-all'],
}
</script>

<style>
.cn-ai-recent-sessions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
}

.cn-ai-recent-sessions__title {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: bold;
}

.cn-ai-recent-sessions__list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-ai-recent-sessions__card {
	display: flex;
	flex-direction: column;
	gap: 2px;
	width: 100%;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	text-align: left;
	cursor: pointer;
}

.cn-ai-recent-sessions__card:hover,
.cn-ai-recent-sessions__card:focus-visible {
	background: var(--color-background-hover);
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-ai-recent-sessions__card--active {
	background: var(--color-primary-element-light, rgba(var(--color-primary-rgb), 0.1));
}

.cn-ai-recent-sessions__card-title {
	overflow: hidden;
	font-weight: 500;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-recent-sessions__card-desc {
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.cn-ai-recent-sessions__view-all {
	padding: 4px 0;
	border: none;
	background: transparent;
	color: var(--color-primary-element);
	text-align: left;
	cursor: pointer;
}

.cn-ai-recent-sessions__view-all:hover,
.cn-ai-recent-sessions__view-all:focus-visible {
	text-decoration: underline;
}
</style>
