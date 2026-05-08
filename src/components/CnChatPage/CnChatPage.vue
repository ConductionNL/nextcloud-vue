<!--
  CnChatPage — Conversation / messaging surface.

  v1: renders an `<iframe>` to `conversationSource` (typically an
  embeddable NC Talk conversation URL). Future iterations may swap the
  iframe for a native thread renderer when `schema` points at an
  OR-backed conversation register.

  Honours `headerComponent`, `actionsComponent`, and the generic slots
  map by exposing `#header`, `#actions`, and a `#conversation` slot
  that can fully replace the iframe (used as the bridge for native
  thread renderers and consumer-built chat UIs).
-->
<template>
	<div class="cn-chat-page">
		<!-- Header — overridable via #header slot -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="icon">
			<CnPageHeader
				v-if="showTitle && title"
				:title="title"
				:description="description"
				:icon="icon" />
		</slot>

		<!-- Actions slot -->
		<div v-if="$slots.actions || $scopedSlots.actions" class="cn-chat-page__actions">
			<slot name="actions" />
		</div>

		<!-- Conversation body — overridable via #conversation slot. The
		     scope exposes the resolved URL + post URL so a consumer's
		     custom chat component can wire to the same config without
		     re-reading the manifest. -->
		<slot
			name="conversation"
			:conversation-source="conversationSource"
			:post-url="postUrl"
			:schema="schema">
			<iframe
				v-if="conversationSource"
				class="cn-chat-page__iframe"
				:src="conversationSource"
				:title="title"
				allow="microphone; camera; display-capture"
				:sandbox="sandbox" />
			<div v-else class="cn-chat-page__placeholder">
				<slot name="empty">
					<NcEmptyContent :name="emptyText">
						<template #icon>
							<MessageOutline :size="64" />
						</template>
					</NcEmptyContent>
				</slot>
			</div>
		</slot>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent } from '@nextcloud/vue'
import MessageOutline from 'vue-material-design-icons/MessageOutline.vue'
import { CnPageHeader } from '../CnPageHeader/index.js'

/**
 * CnChatPage — Conversation / chat page.
 *
 * v1 implementation: embeds the conversation via an `<iframe>` to
 * `conversationSource` (typically an NC Talk embeddable URL). The
 * `<iframe>` runs sandboxed by default; consumers can opt-in to
 * additional permissions via the `sandbox` prop.
 *
 * The `#conversation` slot fully replaces the iframe — this is the
 * extension point for v2 (native thread renderer) and for consumer
 * apps that already have a chat component they want to drop in. The
 * scope exposes `{ conversationSource, postUrl, schema }` so the
 * replacement component does not need to re-read the manifest.
 *
 * NOTE: `conversationSource` and `postUrl` are intentionally
 * mutually-permissive at the component level — either can be set
 * alone, both can be set, or only `postUrl` (in which case the
 * empty-state renders and the consumer is expected to fill the
 * `#conversation` slot).
 *
 * Slots:
 *  - `#header` — Replaces the CnPageHeader.
 *  - `#actions` — Right-aligned actions area.
 *  - `#conversation` — Replaces the iframe entirely. Scope:
 *    `{ conversationSource, postUrl, schema }`.
 *  - `#empty` — Replaces the empty-state when no source is set.
 *
 * Events: none in v1. Native thread mode (v2) will emit `@send`,
 * `@receive`, and `@typing`.
 */
export default {
	name: 'CnChatPage',

	components: {
		NcEmptyContent,
		MessageOutline,
		CnPageHeader,
	},

	props: {
		/** Page title. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Conversation'),
		},
		/** Description shown under the title when `showTitle` is set. */
		description: {
			type: String,
			default: '',
		},
		/** Whether to render the inline page header. */
		showTitle: {
			type: Boolean,
			default: false,
		},
		/** MDI icon name for the header. */
		icon: {
			type: String,
			default: '',
		},
		/**
		 * URL of the embedded conversation (NC Talk iframe URL by
		 * default). Required for v1 unless the consumer supplies a
		 * `#conversation` slot.
		 */
		conversationSource: {
			type: String,
			default: '',
		},
		/**
		 * Custom thread-API endpoint. Used by consumers building their
		 * own chat UI via the `#conversation` slot. The value is passed
		 * through unchanged in the slot scope.
		 */
		postUrl: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister schema slug for an OR-backed conversation.
		 * Reserved for v2 native thread rendering.
		 */
		schema: {
			type: String,
			default: '',
		},
		/**
		 * `sandbox` attribute on the iframe. Defaults to a minimal
		 * permissive set: scripts + same-origin (so NC Talk can call
		 * back into its own origin) + forms. Override at the manifest
		 * level when an embed needs more (or fewer) capabilities.
		 */
		sandbox: {
			type: String,
			default: 'allow-scripts allow-same-origin allow-forms allow-popups',
		},
		/** Empty-state text shown when no conversation source is set. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No conversation selected'),
		},
	},
}
</script>

<style scoped>
.cn-chat-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
	height: 100%;
	min-height: 480px;
}

.cn-chat-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.cn-chat-page__iframe {
	flex: 1 1 auto;
	width: 100%;
	min-height: 480px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
}

.cn-chat-page__placeholder {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 240px;
}
</style>
