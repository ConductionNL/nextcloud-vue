<!--
  CnActionsMenu — Shared "…" overflow Actions menu.

  Renders the canonical action set that appears on every Conduction
  surface — Refresh, then the mandatory trio Request a feature / Report a
  bug / Documentation — inside a single NcActions overflow, and
  auto-mounts the CnSuggestFeatureModal for the Request-a-feature default.
  Used by CnWidgetWrapper (widgets) and the page-level headers of
  CnDetailPage / CnDashboardPage so the three surfaces stay in lockstep.

  The trio is not optional and not conditional on configuration: each item
  resolves its own target (a forge new-issue deep-link for the bug report,
  `cnDocumentationBaseUrl` + the surface's `docsAnchor` for the docs link),
  so a host that passes no URLs still renders all three. That is the point
  — the items used to be per-host markup, and OpenRegister's widgets shipped
  without the Documentation entry while OpenCatalogi's were inconsistent.
-->
<template>
	<!-- Root <template v-if> (Vue 3 native fragment, renders no DOM node — was
	     vue-frag <Fragment>) so NcActions stays in its host's flex/grid flow
	     while the modal mounts as a SIBLING of NcActions, not inside it. The
	     NcActions default slot is the floating-vue popover, which unmounts the
	     instant the menu closes on an action-item click — mounting the modal
	     there would destroy the dialog the moment it opens. -->
	<template v-if="hasOverflowMenu">
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
			<!-- The canonical trio — Request a feature / Report a bug /
			     Documentation — renders on EVERY surface. None of the three
			     is conditional on a URL being configured any more: each
			     resolves its own target (see resolvedDocumentationUrl /
			     resolvedReportBugUrl), so a host that forgets to pass one
			     still gets a working item instead of a silently missing one.
			     `showRequestFeature` / `showReportBug` / `showDocumentation`
			     exist only for the rare surface that must suppress one
			     deliberately; they all default to true. -->
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
			<NcActionLink
				v-if="showReportBug && resolvedReportBugUrl"
				:href="resolvedReportBugUrl"
				target="_blank"
				rel="noopener noreferrer"
				:data-testid="`${testidBase}-action-report-bug`"
				:close-after-click="true">
				<template #icon>
					<BugOutline :size="20" />
				</template>
				{{ reportBugLabel }}
			</NcActionLink>
			<NcActionLink
				v-if="showDocumentation && resolvedDocumentationUrl"
				:href="resolvedDocumentationUrl"
				target="_blank"
				rel="noopener noreferrer"
				:data-testid="`${testidBase}-action-documentation`"
				:close-after-click="true">
				<template #icon>
					<BookOpenVariant :size="20" />
				</template>
				{{ documentationLabel }}
			</NcActionLink>
			<!-- @slot action-items Additional NcActionButton-family items
			     rendered inside the overflow menu, after the built-in
			     Refresh + Request-a-feature / Report-a-bug / Documentation
			     group. -->
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
	</template>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton, NcActionLink, NcLoadingIcon } from '@nextcloud/vue'
import { emit as emitOnBus } from '@nextcloud/event-bus'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import LightbulbOutline from 'vue-material-design-icons/LightbulbOutline.vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import BugOutline from 'vue-material-design-icons/BugOutline.vue'
import { buildBugReportUrl, DEFAULT_FORGE } from '../../utils/forge.js'

/**
 * The fleet's per-app documentation site, derived from the app id. Used only
 * when no `documentationUrl` prop and no `cnDocumentationBaseUrl` inject are
 * available, so that the Documentation item is never absent — an app that
 * hosts its docs anywhere else provides the base instead.
 *
 * @param {string} appId Consuming app's slug.
 * @return {string} Documentation base URL, or '' when the app id is unknown.
 */
function defaultDocsBase(appId) {
	const id = String(appId || '').trim()
	if (!id) return ''
	return `https://${id}.conduction.nl/docs/`
}

/**
 * Resolve a documentation deep-link from a base URL and a per-widget
 * anchor. An anchor already starting with `#`, `/` or a `scheme://` is
 * used as written (respectively appended, resolved against the base's
 * origin, or taken whole); a bare slug becomes a `#fragment`, which is
 * how a docs page addresses one section of itself.
 *
 * @param {string} base Documentation base URL.
 * @param {string} anchor Per-widget anchor / path fragment.
 * @return {string} The resolved URL, or '' when there is no base to build on.
 */
export function resolveDocsUrl(base, anchor) {
	const a = String(anchor || '').trim()
	if (a.includes('://')) return a
	const b = String(base || '').trim()
	if (!b) return ''
	if (!a) return b
	if (a.startsWith('#')) return `${b.replace(/#.*$/, '')}${a}`
	if (a.startsWith('/')) {
		try {
			return new URL(a, b).toString()
		} catch (e) {
			return `${b.replace(/\/+$/, '')}${a}`
		}
	}
	return `${b.replace(/#.*$/, '').replace(/\/+$/, '')}#${a}`
}

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
 * CnActionsMenu — the shared built-in overflow Actions menu.
 *
 * Renders Refresh plus the mandatory trio Request a feature / Report a bug /
 * Documentation. The trio is unconditional: the bug link is built from the
 * app's forge repo and the docs link from the app-wide documentation base
 * plus this surface's `docsAnchor`, so no host can ship a menu missing one.
 * Pass `docsAnchor` per widget type — that is what makes Documentation open
 * that widget's own section instead of the docs homepage.
 *
 * ```vue
 * <CnActionsMenu
 *   :widget-id="resolvedWidgetId"
 *   :title="displayTitle"
 *   :surface="`widget:${resolvedWidgetId}`"
 *   docs-anchor="open-cases"
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
		NcLoadingIcon,
		DotsHorizontal,
		Refresh,
		LightbulbOutline,
		BookOpenVariant,
		BugOutline,
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
		 * CnSuggestFeatureModal (e.g. `ConductionNL/pipelinq`). Provided by
		 * CnAppRoot from the manifest's `nav.featureRequestRepo` field (with
		 * fallback to `ConductionNL/<appId>`). Empty when no ancestor — the
		 * default handler warns and skips opening rather than open a broken
		 * link.
		 */
		cnFeatureRequestRepo: { default: () => '' },
		/**
		 * Forge config (`{type, baseUrl}`) forwarded to the auto-mounted
		 * CnSuggestFeatureModal so its "Continue on …" deep-link targets the
		 * right forge. Provided by CnAppRoot from `manifest.nav.forge`.
		 * Defaults to DEFAULT_FORGE when no CnAppRoot ancestor exists —
		 * a third hardcoded Codeberg default lived here, so a menu mounted
		 * standalone contradicted both the fleet default and the app it was
		 * reporting for.
		 */
		cnFeatureRequestForge: { default: () => ({ ...DEFAULT_FORGE }) },
		/**
		 * Resolver for a widget's manifest title — the AUTHORED English
		 * source string — provided by CnDashboardPage as
		 * `(widgetId) => string`. The `title` prop this component receives
		 * has already been through the host translate function
		 * — CnDashboardPage's getWidgetTitle is the display chokepoint — and
		 * may also be a user-typed customTitle in the user's own language, so
		 * it is the wrong thing to put in a bug-report title. Returns '' when
		 * no dashboard ancestor provides it (a standalone widget, a detail
		 * page) or the widget def carries no title, and the link falls back
		 * to the surface slug.
		 */
		cnWidgetTitleSource: { default: () => () => '' },
		/**
		 * App-wide documentation base URL (e.g.
		 * `https://pipelinq.conduction.nl/docs`), provided by CnAppRoot from
		 * `manifest.nav.documentationUrl`. Every widget's Documentation item
		 * is built from this base plus the widget's own `docsAnchor`, so the
		 * link lands on that widget's section rather than the docs homepage.
		 * Empty when no ancestor provides one — the host's explicit
		 * `documentationUrl` prop then has to carry the whole URL.
		 */
		cnDocumentationBaseUrl: { default: () => '' },
	},
	inheritAttrs: false,

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
		 * Explicit documentation link target, opened in a new tab. Wins over
		 * the `cnDocumentationBaseUrl` + `docsAnchor` pair. Leave empty (the
		 * default) to let the menu build the per-widget deep-link itself.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * This surface's own section in the app's documentation, appended to
		 * the app-wide `cnDocumentationBaseUrl`. A bare slug (`open-cases`)
		 * becomes a `#fragment`; a value starting with `/` is resolved as a
		 * path; a full `scheme://` URL is used as written. Supplying it is
		 * what makes the Documentation item land on THIS widget's section
		 * rather than the docs homepage.
		 *
		 * @type {string}
		 */
		docsAnchor: {
			type: String,
			default: '',
		},
		/**
		 * Whether the Documentation item renders. Defaults to true — the
		 * canonical trio is meant to be present on every surface; set false
		 * only where a docs link genuinely cannot exist.
		 *
		 * @type {boolean}
		 */
		showDocumentation: {
			type: Boolean,
			default: true,
		},
		/**
		 * Whether the "Report a bug" item renders.
		 *
		 * @type {boolean}
		 */
		showReportBug: {
			type: Boolean,
			default: true,
		},
		/**
		 * Explicit "Report a bug" target. Empty (the default) builds a
		 * new-issue deep-link on the app's forge from the injected
		 * `cnFeatureRequestRepo` + `cnFeatureRequestForge`, pre-filled with
		 * the surface's title.
		 *
		 * @type {string}
		 */
		reportBugUrl: {
			type: String,
			default: '',
		},
		/** Pre-translated label for the Report-a-bug action. */
		reportBugLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Report a bug'),
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
		 * `<base>-action-request-feature`, `<base>-action-report-bug`,
		 * `<base>-action-documentation`.
		 * Lets each host keep its own stable testids.
		 */
		testidBase: {
			type: String,
			default: 'cn-actions-menu',
		},
	},

	emits: ['refresh', 'request-feature'],

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
			if (this.showDocumentation && this.resolvedDocumentationUrl) return true
			if (this.showReportBug && this.resolvedReportBugUrl) return true
			if (this.showRequestFeature) return true
			return Boolean(this.$slots['action-items']) || Boolean(this.$slots && this.$slots['action-items'])
		},

		/**
		 * The Documentation item's target: the explicit `documentationUrl`
		 * when given, otherwise the app-wide base deep-linked with this
		 * surface's `docsAnchor`.
		 *
		 * @return {string}
		 */
		resolvedDocumentationUrl() {
			if (this.documentationUrl) {
				return this.docsAnchor
					? resolveDocsUrl(this.documentationUrl, this.docsAnchor)
					: this.documentationUrl
			}
			if (this.cnDocumentationBaseUrl) {
				return resolveDocsUrl(this.cnDocumentationBaseUrl, this.docsAnchor)
			}
			// Last resort so the item is never simply MISSING — an absent
			// Documentation entry is the defect this menu exists to prevent.
			// The fleet's convention is one docs site per app id; an app that
			// hosts its docs elsewhere sets `cnDocumentationBaseUrl` on
			// CnAppRoot, and the warning below says so.
			return resolveDocsUrl(defaultDocsBase(this.cnAppId), this.docsAnchor)
		},

		/**
		 * This surface's title AS AUTHORED, for anything that must not be
		 * localized. Asks the injected dashboard resolver for the widget's
		 * manifest source string; '' when nothing can supply one.
		 *
		 * @return {string}
		 */
		sourceTitle() {
			const resolve = this.cnWidgetTitleSource
			if (typeof resolve !== 'function' || !this.widgetId) return ''
			try {
				return String(resolve(this.widgetId) || '').trim()
			} catch (e) {
				// A host resolver that throws must not take the menu with it —
				// the link degrades to the surface slug.
				return ''
			}
		},

		/**
		 * The Report-a-bug target: the explicit `reportBugUrl` when given,
		 * otherwise a new-issue deep-link on the app's forge, pre-filled with
		 * a title naming the surface the report came from.
		 *
		 * @return {string}
		 */
		resolvedReportBugUrl() {
			if (this.reportBugUrl) return this.reportBugUrl
			const repo = String(this.cnFeatureRequestRepo || '').trim()
			if (!repo) return ''
			// buildBugReportUrl owns both the host (one resolveForge for the
			// whole suggestion flow) and the bug-report issue FORM. This was
			// hand-rolled here against a local copy of the forge host map that
			// defaulted to Codeberg, so a menu mounted without a CnAppRoot sent
			// bug reports to a different host than the Request-a-feature item
			// directly above it — and it linked the BLANK issue form, so every
			// in-product report arrived with no steps, no expected/actual and
			// no severity.
			//
			// The headline must be ENGLISH: the `title` prop is already
			// translated (CnDashboardPage's getWidgetTitle is the display
			// chokepoint), so a report from a French UI read "[BUG] Activité
			// récente" and one from a Russian UI was in Cyrillic — unreadable
			// to a maintainer, even though the English msgid was sitting in the
			// manifest. `cnWidgetTitleSource` hands back that manifest string,
			// skipping any user-typed customTitle for the same reason.
			//
			// With no dashboard ancestor to ask, fall back to the surface slug
			// rather than the translated prop: a slug is English by
			// construction, and "always English" is the point. The localized
			// title is deliberately not carried in the URL at all — see
			// buildBugReportUrl for why it was dropped.
			return buildBugReportUrl(this.cnFeatureRequestForge, repo, {
				title: this.sourceTitle,
				surface: this.surface || this.widgetId,
			})
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
