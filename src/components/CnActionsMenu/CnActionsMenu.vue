<!--
  CnActionsMenu — Shared "…" overflow Actions menu.

  Renders the canonical built-in action trio that appears on every
  Conduction surface — Refresh, Documentation, Request a feature — inside
  a single NcActions overflow, and auto-mounts the CnSuggestFeatureModal
  for the Request-a-feature default. Used by CnWidgetWrapper (widgets) and
  the page-level headers of CnDetailPage / CnDashboardPage so the three
  surfaces stay in lockstep.
-->
<template>
	<NcActions
		v-if="hasOverflowMenu"
		:force-name="true"
		:menu-name="actionsMenuLabel"
		:data-testid="`${testidBase}-actions`">
		<template #icon>
			<DotsHorizontal :size="20" />
		</template>
		<NcActionButton
			v-if="showRefresh"
			:data-testid="`${testidBase}-action-refresh`"
			@click="onRefreshClick">
			<template #icon>
				<Refresh
					:size="20"
					:class="{ 'cn-actions-menu__refresh-icon--spinning': isRefreshing }" />
			</template>
			{{ refreshLabel }}
		</NcActionButton>
		<NcActionLink
			v-if="documentationUrl"
			:href="documentationUrl"
			target="_blank"
			rel="noopener noreferrer"
			:data-testid="`${testidBase}-action-documentation`">
			<template #icon>
				<BookOpenVariant :size="20" />
			</template>
			{{ documentationLabel }}
		</NcActionLink>
		<NcActionButton
			v-if="showRequestFeature"
			:data-testid="`${testidBase}-action-request-feature`"
			@click="onRequestFeatureClick">
			<template #icon>
				<LightbulbOutline :size="20" />
			</template>
			{{ requestFeatureLabel }}
		</NcActionButton>
		<!-- @slot action-items Additional NcActionButton-family items
		     rendered inside the overflow menu, after the built-in
		     Refresh / Documentation / Request-a-feature group. -->
		<slot name="action-items" />

		<!-- Auto-mounted feature-request modal. Lazy-loaded so the modal
		     bundle only ships when a surface renders the menu. Suppressed
		     when the host calls preventDefault on @request-feature. -->
		<CnSuggestFeatureModal
			v-if="featureRequestModalOpen"
			:repo="cnFeatureRequestRepo"
			:spec-ref="specRef"
			:app="cnAppId"
			:page="$route ? ($route.name || '') : ''"
			:surface="surface"
			:conduction-submit-enabled="false"
			@close="onFeatureRequestModalClose" />
	</NcActions>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton, NcActionLink } from '@nextcloud/vue'
import { emit as emitOnBus } from '@nextcloud/event-bus'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import LightbulbOutline from 'vue-material-design-icons/LightbulbOutline.vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'

/**
 * Build a synthetic event object handed to host listeners alongside the
 * action payload. Mirrors the Vue 3 / DOM Event API enough to let a host
 * call `event.preventDefault()` to suppress the menu's built-in default
 * handler. Because Vue's `$emit` is synchronous, the same object also
 * propagates up through wrapping components (e.g. CnWidgetWrapper
 * re-emitting `@refresh`), so a host listener on the outer component can
 * still suppress the default.
 *
 * @return {{defaultPrevented: boolean, preventDefault: Function}}
 */
function createSyntheticEvent() {
	const ev = {
		defaultPrevented: false,
		preventDefault() {
			this.defaultPrevented = true
		},
	}
	return ev
}

/**
 * CnActionsMenu — the shared built-in overflow Actions menu (Refresh /
 * Documentation / Request a feature).
 *
 * ```vue
 * <CnActionsMenu
 *   :widget-id="resolvedWidgetId"
 *   :title="displayTitle"
 *   :surface="`widget:${resolvedWidgetId}`"
 *   :documentation-url="documentationUrl"
 *   testid-base="cn-widget-wrapper"
 *   @refresh="(p, e) => $emit('refresh', p, e)"
 *   @request-feature="(p, e) => $emit('request-feature', p, e)">
 *   <template #action-items><slot name="action-items" /></template>
 * </CnActionsMenu>
 * ```
 */
export default {
	name: 'CnActionsMenu',

	components: {
		NcActions,
		NcActionButton,
		NcActionLink,
		DotsHorizontal,
		Refresh,
		LightbulbOutline,
		BookOpenVariant,
		CnSuggestFeatureModal: () => import('../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'),
	},

	inject: {
		/**
		 * Consuming app's slug (e.g. "pipelinq"). Provided by CnAppRoot.
		 * Auto-filled on the built-in Request-a-feature modal as the `app`
		 * prop. Defaults to empty string when no CnAppRoot ancestor exists;
		 * the modal falls back to a missing-context warning.
		 */
		cnAppId: { default: () => '' },
		/**
		 * Repo slug used as the GitHub deep-link target on the auto-mounted
		 * CnSuggestFeatureModal (e.g. `ConductionNL/pipelinq`). Provided by
		 * CnAppRoot from the manifest's `nav.featureRequestRepo` field (with
		 * fallback to `ConductionNL/<appId>`). Empty when no ancestor — the
		 * default handler warns and skips opening rather than open a broken
		 * link.
		 */
		cnFeatureRequestRepo: { default: () => '' },
	},

	props: {
		/**
		 * Whether the Refresh item renders. The parent surface is
		 * responsible for any opt-out aliasing (e.g. CnWidgetWrapper's
		 * `hideRefresh`) and passes the resolved boolean here.
		 *
		 * @type {boolean}
		 */
		showRefresh: {
			type: Boolean,
			default: true,
		},
		/**
		 * Whether the Request-a-feature item renders.
		 *
		 * @type {boolean}
		 */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},
		/**
		 * Documentation link target. When a non-empty URL is provided the
		 * menu renders a "Documentation" item that opens the link in a new
		 * tab (`target="_blank"` + `rel="noopener noreferrer"`). Empty
		 * (the default) hides the item entirely.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Pre-translated label for the Documentation item. Defaults to the
		 * lib's translation of "Documentation".
		 */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
		/**
		 * Stable id forwarded on the `@refresh` / `@request-feature`
		 * payloads (as `widgetId`) and on the `cn:widget:refresh`
		 * event-bus payload. The parent resolves it (explicit id or
		 * slugified title).
		 *
		 * @type {string}
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/**
		 * Human-readable title carried on action payloads.
		 */
		title: {
			type: String,
			default: '',
		},
		/**
		 * Full `surface` string forwarded to the auto-mounted
		 * CnSuggestFeatureModal so the resulting GitHub issue records where
		 * the request originated (e.g. `widget:<id>`, `detail:<id>`,
		 * `dashboard:<id>`).
		 *
		 * @type {string}
		 */
		surface: {
			type: String,
			default: '',
		},
		/**
		 * Optional `specRef` forwarded to the auto-mounted
		 * CnSuggestFeatureModal so the issue links to the spec capability
		 * this surface belongs to.
		 *
		 * @type {string}
		 */
		specRef: {
			type: String,
			default: '',
		},
		/**
		 * Whether a refresh is currently in flight. When bound by the host,
		 * the Refresh icon spins for exactly as long as this stays true.
		 * When left `false`, clicking Refresh spins optimistically for
		 * `optimisticSpinMs`.
		 *
		 * @type {boolean}
		 */
		refreshing: {
			type: Boolean,
			default: false,
		},
		/**
		 * Duration (ms) of the optimistic spin shown on Refresh click when
		 * the host has NOT bound `:refreshing`. Set to 0 to disable.
		 *
		 * @type {number}
		 */
		optimisticSpinMs: {
			type: Number,
			default: 800,
		},
		/**
		 * Event-bus channel the default Refresh handler emits on when no
		 * host listener suppresses it. Widgets use `cn:widget:refresh`;
		 * page surfaces pass `cn:page:refresh`.
		 */
		refreshChannel: {
			type: String,
			default: 'cn:widget:refresh',
		},
		/** Pre-translated label for the Refresh action. */
		refreshLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Refresh'),
		},
		/** Pre-translated label for the Request-a-feature action. */
		requestFeatureLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Request a feature'),
		},
		/** Pre-translated aria-label / tooltip for the overflow trigger. */
		actionsMenuLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Actions'),
		},
		/**
		 * Prefix for the `data-testid`s emitted on the menu container and
		 * its items: `<base>-actions` (container), `<base>-action-refresh`,
		 * `<base>-action-documentation`, `<base>-action-request-feature`.
		 * Lets each host keep its own stable testids.
		 */
		testidBase: {
			type: String,
			default: 'cn-actions-menu',
		},
	},

	data() {
		return {
			/**
			 * Internal state for the auto-mounted CnSuggestFeatureModal.
			 * Flipped true by the default Request-a-feature handler when
			 * the host did not `preventDefault()` on `@request-feature`.
			 */
			featureRequestModalOpen: false,
			/**
			 * Optimistic-spin flag. Set true on Refresh click when the host
			 * hasn't bound `:refreshing`, then auto-cleared after
			 * `optimisticSpinMs`. OR-ed with `refreshing` by `isRefreshing`.
			 */
			optimisticSpinning: false,
		}
	},

	computed: {
		/**
		 * Whether the Refresh icon should spin. True while the host's bound
		 * `:refreshing` is true OR during the short optimistic window after
		 * a click when no prop is bound.
		 *
		 * @return {boolean}
		 */
		isRefreshing() {
			return this.refreshing || this.optimisticSpinning
		},

		/**
		 * Whether the overflow `…` menu renders at all. True when at least
		 * one built-in item is visible OR the caller provided an
		 * `action-items` slot.
		 *
		 * @return {boolean}
		 */
		hasOverflowMenu() {
			if (this.showRefresh) return true
			if (this.documentationUrl) return true
			if (this.showRequestFeature) return true
			return Boolean(this.$slots['action-items']) || Boolean(this.$scopedSlots && this.$scopedSlots['action-items'])
		},
	},

	beforeDestroy() {
		if (this._optimisticSpinTimer) {
			clearTimeout(this._optimisticSpinTimer)
			this._optimisticSpinTimer = null
		}
	},

	methods: {
		/**
		 * Refresh click — emits `@refresh`, then runs the built-in default
		 * (emit on `refreshChannel`) unless a host called
		 * `event.preventDefault()` on the second handler arg.
		 *
		 * @return {void}
		 */
		onRefreshClick() {
			this.startOptimisticSpin()
			const ev = createSyntheticEvent()
			/**
			 * @event refresh User clicked the Refresh item. Payload:
			 * `{ widgetId, title }`. Handlers may call the second arg's
			 * `preventDefault()` to suppress the built-in default (event-bus
			 * emit on `refreshChannel`).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('refresh', { widgetId: this.widgetId, title: this.title }, ev)
			if (ev.defaultPrevented) return
			emitOnBus(this.refreshChannel, {
				widgetId: this.widgetId,
				title: this.title,
			})
		},

		/**
		 * Spin the Refresh icon optimistically for `optimisticSpinMs`, but
		 * only when the host has not bound `:refreshing`. No-op when
		 * `optimisticSpinMs` is 0.
		 *
		 * @return {void}
		 */
		startOptimisticSpin() {
			if (this.refreshing) return
			if (!this.optimisticSpinMs || this.optimisticSpinMs <= 0) return
			this.optimisticSpinning = true
			if (this._optimisticSpinTimer) clearTimeout(this._optimisticSpinTimer)
			this._optimisticSpinTimer = setTimeout(() => {
				this.optimisticSpinning = false
				this._optimisticSpinTimer = null
			}, this.optimisticSpinMs)
		},

		/**
		 * Request-a-feature click — emits `@request-feature`, then runs the
		 * built-in default (open CnSuggestFeatureModal) unless a host called
		 * `event.preventDefault()`. Warns and skips opening when no
		 * `cnFeatureRequestRepo` inject can be resolved.
		 *
		 * @return {void}
		 */
		onRequestFeatureClick() {
			const ev = createSyntheticEvent()
			/**
			 * @event request-feature User clicked the Request a feature
			 * item. Payload: `{ widgetId, title }`. Handlers may call the
			 * second arg's `preventDefault()` to suppress the built-in
			 * default (auto-opening CnSuggestFeatureModal).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('request-feature', { widgetId: this.widgetId, title: this.title }, ev)
			if (ev.defaultPrevented) return
			if (!this.cnFeatureRequestRepo) {
				// eslint-disable-next-line no-console
				console.warn(
					'[CnActionsMenu] Cannot open feature request modal: missing cnFeatureRequestRepo inject (mount under CnAppRoot or bind a custom @request-feature listener).',
				)
				return
			}
			this.featureRequestModalOpen = true
		},

		/**
		 * Close handler for the auto-mounted feature-request modal.
		 *
		 * @return {void}
		 */
		onFeatureRequestModalClose() {
			this.featureRequestModalOpen = false
		},
	},
}
</script>

<style scoped>
/* Refresh icon spin — driven by the `isRefreshing` class binding. One
   full rotation per 400ms, so the default 800ms optimistic window reads
   as ~2 turns. Disabled under prefers-reduced-motion. */
.cn-actions-menu__refresh-icon--spinning {
	animation: cn-actions-menu-spin 400ms linear infinite;
}

@keyframes cn-actions-menu-spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
	.cn-actions-menu__refresh-icon--spinning {
		animation: none;
	}
}
</style>
