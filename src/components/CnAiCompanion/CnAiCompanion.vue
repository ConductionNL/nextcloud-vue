<!--
  CnAiCompanion — top-level mount for the AI Chat Companion widget.

  On created():
  - Issues GET /index.php/apps/{chatAppId}/api/chat/health via axios.
  - Renders nothing on non-2xx, network error, or timeout (5s).
  - Probe result cached for component lifetime.
  - Only console.info() on failure (never warn/error).

  When probe succeeds:
  - Renders CnAiFloatingButton ALWAYS — it toggles the window rather than only
    opening it, and stays visible while the window is open.
  - Renders CnAiChatPanel (when isPanelOpen) as a floating window anchored to the
    same corner as the hex, offset clear of it so both stay clickable.

  FAB and panel both hidden when cnAiContext.pageKind === 'chat'.
-->
<template>
	<div v-if="probeSucceeded && !isChatPage" class="cn-ai-companion" data-testid="cn-ai-companion">
		<!--
		  The hex is rendered UNCONDITIONALLY and toggles the window.

		  It used to be `:visible="!isPanelOpen"` — the launcher vanished while
		  the thing it launched was open. Three reasons it now stays, in order of
		  weight:

		  1. It is the one control we can guarantee. The window's own close
		     button lives in markup a host page's stylesheet could hide; the hex
		     is fixed-position with explicit `!important` properties and has
		     survived every host it has been dropped into, including third-party
		     office editors.
		  2. A launcher that disappears is a dead end — the affordance you used
		     to summon something should dismiss it.
		  3. It removes a state transition: no show/hide to coordinate with the
		     window's own.

		  ⚠️ This is why the window anchors 70px from the edge: the hex is 26x30
		  at a 24px inset, and the two must not overlap or the guarantee above is
		  worth nothing.
		-->
		<CnAiFloatingButton
			:visible="true"
			:position="position"
			@click="togglePanel" />
		<CnAiChatPanel
			ref="panel"
			:visible="isPanelOpen"
			:stream-state="stream.state"
			:chat-app-id="chatAppId"
			:position="position"
			:fab-ref="$refs.fabButton"
			@close="closePanel"
			@send="onSend"
			@new-thread="onNewThread"
			@load-conversation="onLoadConversation" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { useAiChatStream } from '../../composables/useAiChatStream.js'
import { DEFAULT_CHAT_APP_ID, chatHealthUrl } from '../../composables/aiChatConfig.js'
import CnAiFloatingButton from './CnAiFloatingButton.vue'
import CnAiChatPanel from './CnAiChatPanel.vue'

const HEALTH_TIMEOUT = 5000

export default {
	name: 'CnAiCompanion',

	components: {
		CnAiFloatingButton,
		CnAiChatPanel,
	},

	inject: {
		cnAiContext: { default: null },
	},

	props: {
		/**
		 * Default position for the FAB.
		 * @type {'bottom-right'|'bottom-left'|'top-right'|'top-left'}
		 */
		position: {
			type: String,
			default: 'bottom-right',
		},
		/**
		 * Backend app id that answers the chat/health/conversation HTTP calls
		 * (`/index.php/apps/{chatAppId}/api/...`). Single configuration point for
		 * the AI Chat Companion's backend — see composables/aiChatConfig.js.
		 * Defaults to `hermiq` (the agent engine's home per hydra ADR-034
		 * "Amendment 2026-07-05"); `CnAppRoot` forwards its own `chatAppId`
		 * prop here so a consuming app can point the widget at another backend
		 * (e.g. `openregister` during its compat window) in one place.
		 * @type {string}
		 */
		chatAppId: {
			type: String,
			default: DEFAULT_CHAT_APP_ID,
		},

		/**
		 * What the user is looking at, stated by whoever mounted the companion.
		 *
		 * Inside a Conduction app, CnAppRoot provides this and the prop is
		 * unnecessary. Mounted standalone on a page belonging to another app —
		 * an office editor, the Files list — there is no provider, and the
		 * injected fallback reports `appId: 'unknown'`. The agent then has no
		 * idea what "this document" refers to and says so.
		 *
		 * Shape mirrors the injected context: `{ appId, pageKind, fileId,
		 * objectUuid, registerSlug, schemaSlug, route }`. All optional; whatever
		 * the host knows is better than 'unknown'.
		 * @type {object|null}
		 */
		context: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			probeSucceeded: false,
			isPanelOpen: false,
			stream: useAiChatStream(this, { chatAppId: this.chatAppId, context: this.context }),
		}
	},

	computed: {
		isChatPage() {
			const ctx = this.cnAiContext
			return ctx && ctx.pageKind === 'chat'
		},
	},

	created() {
		this.runHealthProbe()
	},

	methods: {
		async runHealthProbe() {
			try {
				const response = await axios.get(chatHealthUrl(this.chatAppId), {
					timeout: HEALTH_TIMEOUT,
					validateStatus: (status) => status >= 200 && status < 300,
				})
				this.probeSucceeded = response.status >= 200 && response.status < 300
			} catch {
				// eslint-disable-next-line no-console
				console.info(`[CnAiCompanion] chat backend "${this.chatAppId}" health probe did not return 2xx — widget hidden`)
				this.probeSucceeded = false
			}
		},

		/**
		 * The hex's own handler: open when closed, close when open.
		 *
		 * The launcher stays visible while the window is open (see the template),
		 * so it has to answer for both directions rather than only opening.
		 * @return {void}
		 */
		togglePanel() {
			if (this.isPanelOpen) {
				this.closePanel()
				return
			}

			this.openPanel()
		},

		openPanel() {
			this.isPanelOpen = true
			this.$nextTick(() => {
				if (this.$refs.panel && this.$refs.panel.$refs.input) {
					this.$refs.panel.$refs.input.focus()
				}
			})
		},

		closePanel() {
			this.isPanelOpen = false
		},

		onSend(text, agentUuid, attachments) {
			this.stream.send(text, { agentUuid, attachments }).catch((err) => {
				// Stream errors are tracked in stream.state.error — no extra handling needed
				// eslint-disable-next-line no-console
				console.info('[CnAiCompanion] send error:', err?.message)
			})
		},

		onNewThread() {
			this.stream.startNewThread()
		},

		onLoadConversation(uuid) {
			this.stream.loadConversation(uuid)
		},
	},
}
</script>

<style>
.cn-ai-companion {
	/*
	 * display: contents removes this wrapper from the layout tree so the
	 * embedded NcAppSidebar inherits NcContent as its flex parent — required
	 * for the sidebar to slide in from the RIGHT edge. The FAB is itself
	 * position:fixed so it positions independently of the wrapper's box.
	 *
	 * !important is intentional: webpack pulls in BOTH the old (position:
	 * fixed) and new (display: contents) rules from the package's CJS and
	 * ESM builds; without !important the old rule wins the cascade and the
	 * sidebar renders at the left.
	 */
	display: contents !important;
	position: static !important;
}
</style>
