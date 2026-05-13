<!--
  CnAiCompanion — top-level mount for the AI Chat Companion widget.

  On created():
  - Issues GET /index.php/apps/openregister/api/chat/health via axios.
  - Renders nothing on non-2xx, network error, or timeout (5s).
  - Probe result cached for component lifetime.
  - Only console.info() on failure (never warn/error).

  When probe succeeds:
  - Renders CnAiFloatingButton (hidden while panel is open).
  - Renders CnAiChatPanel (when isPanelOpen).

  FAB and panel both hidden when cnAiContext.pageKind === 'chat'.
-->
<template>
	<div v-if="probeSucceeded && !isChatPage" class="cn-ai-companion" data-testid="cn-ai-companion">
		<CnAiFloatingButton
			:visible="!isPanelOpen"
			:position="position"
			@click="openPanel" />
		<CnAiChatPanel
			ref="panel"
			:visible="isPanelOpen"
			:stream-state="stream.state"
			:fab-ref="$refs.fabButton"
			@close="closePanel"
			@send="onSend"
			@new-thread="onNewThread"
			@load-conversation="onLoadConversation" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import CnAiChatPanel from './CnAiChatPanel.vue'
import CnAiFloatingButton from './CnAiFloatingButton.vue'
import { useAiChatStream } from '../../composables/useAiChatStream.js'

const HEALTH_URL = '/index.php/apps/openregister/api/chat/health'
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
		 *
		 * @type {'bottom-right'|'bottom-left'|'top-right'|'top-left'}
		 */
		position: {
			type: String,
			default: 'bottom-right',
		},
	},

	data() {
		return {
			probeSucceeded: false,
			isPanelOpen: false,
			stream: useAiChatStream(this),
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
				const response = await axios.get(HEALTH_URL, {
					timeout: HEALTH_TIMEOUT,
					validateStatus: (status) => status >= 200 && status < 300,
				})
				this.probeSucceeded = response.status >= 200 && response.status < 300
			} catch {
				console.info('[CnAiCompanion] OpenRegister health probe did not return 2xx — widget hidden')
				this.probeSucceeded = false
			}
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

		onSend(text) {
			this.stream.send(text).catch((err) => {
				// Stream errors are tracked in stream.state.error — no extra handling needed

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
