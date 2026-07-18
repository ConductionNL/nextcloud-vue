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
	<!-- Fragment (renders no DOM node) so NcActions stays in its host's
	     flex/grid flow while the modal mounts as a SIBLING of NcActions,
	     not inside it. The NcActions default slot is the floating-vue
	     popover, which unmounts the instant the menu closes on an
	     action-item click — mounting the modal there would destroy the
	     dialog the moment it opens. -->
	<Fragment v-if="hasOverflowMenu">
		<NcActions
			:force-menu="true"
			:force-name="true"
			:menu-name="actionsMenuLabel"
			:data-testid="`${testidBase}-actions`">
			<template #icon>
				<DotsHorizontal :size="20" />
			</template>
			<NcActionButton
				v-if="showRefresh"
				:data-testid="`${testidBase}-action-refresh`"
				:disabled="refreshing"
				:close-after-click="true"
				@click="onRefreshClick">
				<template #icon>
					<NcLoadingIcon v-if="refreshing" :size="20" />
					<Refresh v-else :size="20" />
				</template>
				{{ refreshLabel }}
			</NcActionButton>
			<NcActionLink
				v-if="documentationUrl"
				:href="documentationUrl"
				target="_blank"
				rel="noopener noreferrer"
				:data-testid="`${testidBase}-action-documentation`"
				:close-after-click="true">
				<template #icon>
					<BookOpenVariant :size="20" />
				</template>
				{{ documentationLabel }}
			</NcActionLink>
			<NcActionButton
				v-if="showRequestFeature"
				:data-testid="`${testidBase}-action-request-feature`"
				:close-after-click="true"
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
		</NcActions>

		<!-- Auto-mounted feature-request modal. Lazy-loaded so the modal
		     bundle only ships when a surface renders the menu. Suppressed
		     when the host calls preventDefault on @request-feature.
		     Mounted as a sibling of NcActions (NOT inside its popover slot)
		     so closing the overflow menu doesn't tear the dialog down. -->
		<CnSuggestFeatureModal
			v-if="featureRequestModalOpen"
			:repo="cnFeatureRequestRepo"
			:forge="cnFeatureRequestForge"
			:spec-ref="specRef"
			:app="cnAppId"
			:page="$route ? ($route.name || '') : ''"
			:surface="surface"
			:conduction-submit-enabled="false"
			@close="onFeatureRequestModalClose" />
	</Fragment>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { Fragment } from 'vue-frag'
import { NcActions, NcActionButton, NcActionLink, NcLoadingIcon } from '@nextcloud/vue'
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
		Fragment,
		NcActions,
		NcActionButton,
		NcActionLink,
		NcLoadingIcon,
		DotsHorizontal,
		Refresh,
		LightbulbOutline,
		BookOpenVariant,
		// Unwrap `.default` explicitly: under some webpack chunk layouts the
		// resolved module namespace is frozen AND carries neither `__esModule`
		// nor `Symbol.toStringTag === 'Module'`, so Vue 2's `ensureCtor` skips
		// its own unwrap and calls `Vue.extend()` on the frozen namespace —
		// throwing "Cannot add property _Ctor, object is not extensible" and
		// silently swallowing the Request-a-feature modal.
		CnSuggestFeatureModal: () => import('../CnSuggestFeatureModal/CnSuggestFeatureModal.vue').then(m => m.default || m),
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
		 * Repo slug used as the forge deep-link target on the auto-mounted
		 * CnSuggestFeatureModal (e.g. `Conduction/pipelinq`). Provided by
		 * CnAppRoot from the manifest's `nav.featureRequestRepo` field (with
		 * fallback to `Conduction/<appId>`). Empty when no ancestor — the
		 * default handler warns and skips opening rather than open a broken
		 * link.
		 */
		cnFeatureRequestRepo: { default: () => '' },
		/**
		 * Forge config (`{type, baseUrl}`) forwarded to the auto-mounted
		 * CnSuggestFeatureModal so its "Continue on …" deep-link targets the
		 * right forge. Provided by CnAppRoot from `manifest.nav.forge`.
		 * Defaults to Codeberg when no CnAppRoot ancestor exists.
		 */
		cnFeatureRequestForge: { default: () => ({ type: 'codeberg', baseUrl: 'https://codeberg.org' }) },
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
		 * Whether a refresh is currently in flight. While true, the Refresh
		 * item is disabled and shows a loading spinner for exactly as long as
		 * this stays true — so the spinner reflects the real refresh time.
		 *
		 * @type {boolean}
		 */
		refreshing: {
			type: Boolean,
			default: false,
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
		}
	},

	computed: {
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
			return Boolean(this.$slots['action-items']) || Boolean(this.$slots && this.$slots['action-items'])
		},
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
