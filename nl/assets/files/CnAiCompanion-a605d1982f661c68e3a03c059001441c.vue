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
	<div
		v-if="probeSucceeded && !isChatPage && isPrimaryCompanion"
		class="cn-ai-companion"
		data-testid="cn-ai-companion">
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
			:context="context"
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

/** How many times the health probe may fail before the companion hides. */
const HEALTH_PROBE_ATTEMPTS = 3

/** Base backoff between probe attempts, multiplied by the attempt number. */
const HEALTH_RETRY_DELAY = 750

/**
 * The window key one companion claims so a second one stands down.
 *
 * On `window` rather than in module scope, because the two companions on a page
 * do not share a module instance: one comes from the host app's bundle and one
 * from a standalone bundle attached to every page. Two copies of this file are
 * loaded, so a module-level flag would be two flags and would guard nothing.
 */
const COMPANION_SINGLETON_KEY = '__cnAiCompanionPrimary'

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
			isPrimaryCompanion: false,
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

	beforeUnmount() {
		this.releaseSingleton()
	},

	methods: {
		/**
		 * Claim the page's single companion slot, or stand down.
		 *
		 * 🔴 TWO COMPANIONS ON ONE PAGE IS A REACHABLE STATE, and it was reached:
		 * `CnAppRoot` renders a companion for any app that sets `aiCompanion`,
		 * while a host app can also mount one standalone on every page of the
		 * instance (Hermiq does exactly this, so the assistant reaches
		 * third-party office editors that have no CnAppRoot of ours). On any
		 * page that has both, the user saw TWO hexes stacked a few pixels apart
		 * — the two mounts pick up different bundled stylesheets, so they do not
		 * even land in the same place.
		 *
		 * The guard lives HERE, in the component, rather than in each host's
		 * mount script, because only the component knows how many of itself
		 * exist. A host-side check cannot see a sibling that mounts later: the
		 * standalone script runs at DOMContentLoaded and the app's own Vue tree
		 * boots after it, so whichever check runs first sees nothing and both
		 * render.
		 *
		 * First to claim wins and the rest render nothing. That order is stable
		 * in practice — the standalone mount runs first — but the rule does not
		 * depend on it: what matters is that exactly one renders, not which.
		 *
		 * @return {void}
		 */
		claimSingleton() {
			// 🔴 CLAIMED ONLY WHEN THIS INSTANCE WOULD ACTUALLY RENDER.
			//
			// An earlier version claimed in `created()`, before the health probe
			// had answered — so a companion whose probe FAILED still took the
			// slot and stood the other one down, turning "one companion" into
			// NONE. Measured on a slow instance, where the probe's 3×5s budget
			// is genuinely marginal: the slot was claimed and nothing rendered.
			//
			// Claiming late is also why the claim is not in a `watch` on the
			// window key: the slot is contended exactly once per page, at the
			// moment each candidate learns it can render.
			if (this.probeSucceeded !== true || this.isChatPage === true) {
				return
			}

			const scope = typeof window !== 'undefined' ? window : null
			if (scope === null) {
				// No window (SSR, a bare unit test): nothing else can be
				// rendering, so this instance is the only one by definition.
				this.isPrimaryCompanion = true
				return
			}

			if (scope[COMPANION_SINGLETON_KEY] == null) {
				scope[COMPANION_SINGLETON_KEY] = this
				this.isPrimaryCompanion = true
				return
			}

			this.isPrimaryCompanion = scope[COMPANION_SINGLETON_KEY] === this
		},

		/**
		 * Give the slot back, but only if this instance is holding it.
		 *
		 * Checked rather than cleared unconditionally: a second, standing-down
		 * instance unmounting must not release the slot the FIRST one is still
		 * using, which would let a third mount render alongside it.
		 *
		 * @return {void}
		 */
		releaseSingleton() {
			const scope = typeof window !== 'undefined' ? window : null
			if (scope !== null && scope[COMPANION_SINGLETON_KEY] === this) {
				scope[COMPANION_SINGLETON_KEY] = null
			}
		},

		async runHealthProbe() {
			// RETRY before hiding. A single probe makes the whole companion
			// disappear on one slow response, and "slow" is normal: measured on a
			// busy instance (load 48) the health endpoint answered in well under a
			// second, but the request still lost its 5s budget to contention. The
			// failure mode is the worst kind — the widget is simply absent, with
			// nothing on screen saying why, and a reload usually "fixes" it, which
			// is what makes it read as flakiness rather than as a probe result.
			//
			// A backend that is genuinely down fails all attempts and is still
			// reported; this only stops one unlucky request from deciding.
			for (let attempt = 1; attempt <= HEALTH_PROBE_ATTEMPTS; attempt++) {
				try {
					const response = await axios.get(chatHealthUrl(this.chatAppId), {
						timeout: HEALTH_TIMEOUT,
						validateStatus: (status) => status >= 200 && status < 300,
					})
					this.probeSucceeded = response.status >= 200 && response.status < 300
					// Contend for the page's single slot only now, with a
					// backend that answered. See claimSingleton().
					this.claimSingleton()
					return
				} catch {
					if (attempt < HEALTH_PROBE_ATTEMPTS) {
						await new Promise((resolve) => {
							setTimeout(resolve, HEALTH_RETRY_DELAY * attempt)
						})
						continue
					}
					// eslint-disable-next-line no-console
					console.info(
						`[CnAiCompanion] chat backend "${this.chatAppId}" health probe did not return 2xx `
							+ `after ${HEALTH_PROBE_ATTEMPTS} attempts — widget hidden`,
					)
					this.probeSucceeded = false
				}
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
