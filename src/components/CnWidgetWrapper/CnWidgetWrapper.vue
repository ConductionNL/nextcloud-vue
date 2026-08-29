<!--
  CnWidgetWrapper — Container shell around a dashboard widget.

  Provides header (icon + title), scrollable content area, and optional
  footer with action buttons. Applies style configuration for borders,
  backgrounds, and padding. The built-in overflow Actions menu (Refresh /
  Documentation / Request a feature) is delegated to the shared
  CnActionsMenu so widgets and page surfaces stay in lockstep.
-->
<template>
	<div
		class="cn-widget-wrapper"
		:class="{
			'cn-widget-wrapper--borderless': borderless,
			'cn-widget-wrapper--flush': flush,
			'cn-widget-wrapper--nc-dashboard': chrome === 'nc-dashboard',
		}"
		:style="wrapperStyles">
		<!-- Header -->
		<div v-if="showTitle" class="cn-widget-wrapper__header" :style="[headerStyles, titleIconStyle]">
			<!-- Title icon — left: rendered before the title group. Moved
			     INSIDE header-left so the header's `space-between` cannot pull
			     it away from the title it belongs to; header-left's `gap` is
			     what now separates icon from title (they used to touch). -->
			<div class="cn-widget-wrapper__header-left">
				<div v-if="$slots['title-icon'] && titleIconPosition === 'left'"
					class="cn-widget-wrapper__title-icon">
					<slot name="title-icon" />
				</div>
				<img
					v-if="iconUrl"
					:src="iconUrl"
					:alt="resolvedTitle"
					class="cn-widget-wrapper__icon">
				<span
					v-else-if="iconClass"
					:class="iconClass"
					class="cn-widget-wrapper__icon" />
				<h3 :id="titleId" class="cn-widget-wrapper__title">
					{{ resolvedTitle }}
				</h3>
				<!-- @slot title-meta Rendered inside the header's left group,
				     after the title and before the spacer. Use for small
				     contextual chips (e.g. a date-range badge on chart
				     widgets). Kept inside header-left so the chip sits next
				     to the title rather than floating right next to the
				     actions menu. -->
				<div v-if="$slots['title-meta']" class="cn-widget-wrapper__title-meta">
					<slot name="title-meta" />
				</div>
			</div>
			<div v-if="showActions" class="cn-widget-wrapper__actions">
				<!-- @slot actions Custom action buttons rendered before the
				     built-in overflow menu. -->
				<slot name="actions" />
				<CnActionsMenu
					:show-refresh="effectiveShowRefresh"
					:show-request-feature="effectiveShowRequestFeature"
					:show-report-bug="showReportBug"
					:show-documentation="showDocumentation"
					:documentation-url="documentationUrl"
					:docs-anchor="docsAnchor"
					:report-bug-url="reportBugUrl"
					:documentation-label="documentationLabel"
					:refresh-label="refreshLabel"
					:request-feature-label="requestFeatureLabel"
					:actions-menu-label="actionsMenuLabel"
					:refreshing="refreshing"
					:widget-id="resolvedWidgetId"
					:title="displayTitle"
					:surface="`widget:${resolvedWidgetId}`"
					:spec-ref="specRef"
					refresh-channel="cn:widget:refresh"
					testid-base="cn-widget-wrapper"
					@refresh="onActionsRefresh"
					@request-feature="onActionsRequestFeature">
					<!-- @slot action-items Additional NcActionButton-family
					     items rendered inside the overflow menu, after the
					     built-in Refresh / Documentation / Request-a-feature
					     group. -->
					<template v-if="hasActionItemsSlot" #action-items>
						<slot name="action-items" />
					</template>
				</CnActionsMenu>
			</div>
			<!-- Title icon — right: rendered after actions, far right -->
			<div v-if="$slots['title-icon'] && titleIconPosition === 'right'"
				class="cn-widget-wrapper__title-icon">
				<slot name="title-icon" />
			</div>
		</div>

		<!-- Headerless meta (e.g. a KPI date chip on a flush card). When the
		     header is hidden but a `title-meta` chip is provided, float it in the
		     top-right corner over the content instead of dropping it — so a
		     compact flush KPI tile can carry a date-range chip without growing a
		     full header bar. -->
		<div
			v-if="!showTitle && $slots['title-meta']"
			class="cn-widget-wrapper__floating-meta">
			<slot name="title-meta" />
		</div>

		<!-- Content -->
		<!--
		  The content area is `overflow: auto`, so it can become a scrollable
		  region. WCAG 2.1.1 (Keyboard) requires scrollable regions to be
		  keyboard-focusable so keyboard-only users can scroll them, and 4.1.2
		  requires an accessible name. We expose it as a labelled region and
		  give it tabindex="0". When the header (and its title) is hidden we
		  fall back to an explicit aria-label from the widget title so the
		  region is never anonymous.
		-->
		<div
			class="cn-widget-wrapper__content"
			tabindex="0"
			role="region"
			:aria-labelledby="showTitle ? titleId : null"
			:aria-label="showTitle ? null : resolvedTitle">
			<slot />
		</div>

		<!-- Footer -->
		<div v-if="$slots.footer || (buttons && buttons.length > 0)" class="cn-widget-wrapper__footer">
			<slot name="footer">
				<a
					v-for="button in buttons"
					:key="button.link"
					:href="button.link"
					class="cn-widget-wrapper__footer-link">
					{{ button.text }}
				</a>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { CnActionsMenu } from '../CnActionsMenu/index.js'

/**
 * CnWidgetWrapper — Widget container with header, content, and footer.
 *
 * ```vue
 * <CnWidgetWrapper title="My Cases" :icon-url="casesIconUrl">
 *   <MyCasesChart :data="chartData" />
 * </CnWidgetWrapper>
 * ```
 *
 * With NC widget object
 * ```vue
 * <CnWidgetWrapper
 *   :title="widget.title"
 *   :icon-url="widget.iconUrl"
 *   :icon-class="widget.iconClass"
 *   :documentation-url="widget.documentationUrl"
 *   :buttons="widget.buttons">
 *   <CnWidgetRenderer :widget="widget" />
 * </CnWidgetWrapper>
 * ```
 */
/**
 * Semantic variant → CSS colour token for the widget header icon. Tokens
 * only — the nldesign app themes by overriding the Nextcloud variables, so a
 * literal hex here would ignore government theming entirely (ADR-062 / NL
 * Design System).
 *
 * @type {Record<string, string>}
 */
const TITLE_ICON_VARIANT_COLORS = {
	primary: 'var(--color-primary-element)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
	info: 'var(--color-info, var(--color-primary-element))',
	neutral: 'var(--color-text-maxcontrast)',
}

export default {
	name: 'CnWidgetWrapper',

	components: {
		CnActionsMenu,
	},

	inject: {
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored widget title is run through it so the card
		 * heading follows the user's language. Defaults to an identity
		 * function so an untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Widget title */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Widget'),
		},
		/** Whether to show the header with title */
		showTitle: {
			type: Boolean,
			default: true,
		},
		/**
		 * Chrome variant for the wrapper card.
		 * - `'default'` — the library's own card chrome (opaque background,
		 *   1px border, compact header).
		 * - `'nc-dashboard'` — matches the native Nextcloud Dashboard panel
		 *   exactly using the same design tokens: translucent blurred
		 *   background (`--color-main-background-blur` + `--filter-background-blur`),
		 *   `--border-radius-container-large` corners, no border/shadow, a 16px
		 *   header with a 20px/700 title and 32px leading icon, and content
		 *   inset 16px on the sides + bottom. `styleConfig` overrides still
		 *   layer on top so a user can customise any token.
		 *
		 * @type {'default'|'nc-dashboard'}
		 */
		chrome: {
			type: String,
			default: 'default',
			validator: (v) => ['default', 'nc-dashboard'].includes(v),
		},
		/**
		 * Remove border and background — makes the wrapper transparent.
		 * Useful for widgets that are self-contained cards (e.g. CnStatsBlock).
		 */
		borderless: {
			type: Boolean,
			default: false,
		},
		/**
		 * Remove content padding — allows content to go edge-to-edge.
		 * Useful for list-style widgets where items should span the full width.
		 */
		flush: {
			type: Boolean,
			default: false,
		},
		/** Icon URL (image) */
		iconUrl: {
			type: String,
			default: null,
		},
		/** Icon CSS class (e.g., Nextcloud icon class) */
		iconClass: {
			type: String,
			default: null,
		},
		/**
		 * Position of the title-icon slot in the header.
		 * 'left' places it before the title; 'right' places it after the actions.
		 */
		titleIconPosition: {
			type: String,
			default: 'right',
			validator: (v) => ['left', 'right'].includes(v),
		},
		/**
		 * Explicit CSS colour for the header icon. Overrides `titleIconVariant`.
		 * Must be a CSS custom property or a theme token — never a literal hex
		 * (NL Design System: the nldesign app re-themes by overriding the
		 * Nextcloud variables, and a hardcoded colour ignores that).
		 *
		 * @type {string}
		 */
		titleIconColor: {
			type: String,
			default: null,
		},
		/**
		 * Semantic colour for the header icon. Every widget's icon is
		 * coloured — `primary` (the theme colour) is the default, and a
		 * widget whose subject already carries a semantic meaning names it
		 * here so the icon says so at a glance (a Depublished list is
		 * `error`, a Concepts list `warning`, a Published list `success`).
		 *
		 * @type {'primary'|'success'|'warning'|'error'|'info'|'neutral'}
		 */
		titleIconVariant: {
			type: String,
			default: 'primary',
			validator: (v) => ['primary', 'success', 'warning', 'error', 'info', 'neutral'].includes(v),
		},
		/** Footer action buttons: [{ text, link }] */
		buttons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Whether the header's overflow action menu (Refresh / Documentation /
		 * Request-a-feature + any `#action-items`) renders. Shown by default;
		 * set `false` for compact surfaces — e.g. a KPI tile whose only header
		 * affordance is a date chip — to drop the menu and free header width.
		 */
		showActions: {
			type: Boolean,
			default: true,
		},
		/**
		 * Style configuration for the wrapper.
		 * @type {{ backgroundColor: string, borderStyle: string, borderWidth: number, borderColor: string, borderRadius: number, padding: { top: number, right: number, bottom: number, left: number } }}
		 */
		styleConfig: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Hide the built-in Refresh item from the overflow action menu.
		 * The Refresh item is shown by default — set this when the widget
		 * has no refreshable data source (e.g. a static tile). Alias for
		 * the inverse `:show-refresh="false"`; either form opts out.
		 */
		hideRefresh: {
			type: Boolean,
			default: false,
		},
		/**
		 * Hide the built-in Request-a-feature item from the overflow
		 * action menu. Shown by default; set when the consuming app has
		 * no public issue tracker to link out to. Alias for the inverse
		 * `:show-request-feature="false"`; either form opts out.
		 */
		hideRequestFeature: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whether to show the built-in Refresh item. Tri-state:
		 * - `true` / `false` — force the action on or off.
		 * - `null` (the default) — **auto**: show the action only when a
		 *   parent has attached an `@refresh` listener (i.e. something will
		 *   actually handle the refresh). This keeps widgets that can't
		 *   refresh — e.g. a prop-driven `CnObjectDataWidget` — from showing
		 *   a dead button. Widgets that refresh themselves via the
		 *   `cn:widget:refresh` event bus (with no `@refresh` listener)
		 *   should set `:show-refresh="true"` explicitly.
		 *
		 * `hideRefresh` (or `:show-refresh="false"`) always wins.
		 *
		 * @type {boolean|null}
		 */
		showRefresh: {
			type: Boolean,
			default: null,
		},
		/**
		 * Inverse of `hideRequestFeature`. Defaults to `true` so the
		 * action renders. Set `:show-request-feature="false"` to hide it.
		 * Either flag hides the action.
		 *
		 * @type {boolean}
		 */
		showRequestFeature: {
			type: Boolean,
			default: true,
		},
		/**
		 * Whether the built-in "Report a bug" item renders. On by default —
		 * the trio Request a feature / Report a bug / Documentation is the
		 * contract for every widget; this exists for the rare surface that
		 * must suppress one deliberately.
		 *
		 * @type {boolean}
		 */
		showReportBug: {
			type: Boolean,
			default: true,
		},
		/**
		 * Whether the built-in "Documentation" item renders. On by default,
		 * for the same reason as `showReportBug`. The item's target is
		 * resolved by the shared menu (see `docsAnchor`), so leaving it on
		 * costs the host nothing.
		 *
		 * @type {boolean}
		 */
		showDocumentation: {
			type: Boolean,
			default: true,
		},
		/**
		 * Explicit documentation link for this widget, opened in a new tab.
		 * Usually unnecessary: leave it empty and set `docsAnchor` instead,
		 * so the link is built from the app-wide documentation base and
		 * lands on this widget's own section.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Optional pre-translated label for the Documentation action.
		 * Defaults to the lib's translation of "Documentation".
		 */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
		/**
		 * Widget id for the built-in default Refresh / Request-a-feature
		 * handlers (B2). Forwarded as the `surface: "widget:<id>"` value
		 * on the auto-mounted CnSuggestFeatureModal AND as the
		 * `widgetId` field on the `cn:widget:refresh` event-bus payload.
		 * When unset, the wrapper falls back to a slugified `displayTitle`,
		 * which works but is less stable than an explicit id.
		 *
		 * @type {string}
		 */
		widgetId: {
			type: String,
			default: '',
		},
		/**
		 * This widget's own section in the app's documentation, appended to
		 * the app-wide documentation base URL (provided by CnAppRoot) to build
		 * the Actions menu's Documentation deep-link. A bare slug becomes a
		 * `#fragment`. Supply it per widget type — without it the item still
		 * renders, but lands on the docs homepage rather than this widget.
		 *
		 * @type {string}
		 */
		docsAnchor: {
			type: String,
			default: '',
		},
		/**
		 * Explicit "Report a bug" target for the Actions menu. Empty (the
		 * default) builds a new-issue deep-link on the app's own forge.
		 *
		 * @type {string}
		 */
		reportBugUrl: {
			type: String,
			default: '',
		},
		/**
		 * Optional `specRef` forwarded to the auto-mounted
		 * CnSuggestFeatureModal so the resulting GitHub issue links to
		 * the spec capability this widget belongs to.
		 *
		 * @type {string}
		 */
		specRef: {
			type: String,
			default: '',
		},
		/**
		 * Whether a refresh is currently in flight. When bound by the host
		 * (e.g. `:refreshing="loading"` around its refetch), the Refresh
		 * item is disabled and shows a loading spinner for exactly as long
		 * as this stays true — so the spinner reflects the real refresh time.
		 *
		 * @type {boolean}
		 */
		refreshing: {
			type: Boolean,
			default: false,
		},
		/**
		 * Optional pre-translated label for the Refresh action. Defaults
		 * to the lib's translation of "Refresh" so callers usually don't
		 * need to set this.
		 */
		refreshLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Refresh'),
		},
		/**
		 * Optional pre-translated label for the Request-a-feature action.
		 * Defaults to the lib's translation of "Request a feature".
		 */
		requestFeatureLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Request a feature'),
		},
		/**
		 * Pre-translated aria-label / tooltip for the overflow menu
		 * trigger. Defaults to "Actions".
		 */
		actionsMenuLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Actions'),
		},
		/**
		 * Translate function. Falls back to the injected `cnTranslate`,
		 * which itself defaults to an identity function.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	emits: ['refresh', 'request-feature'],

	computed: {
		displayTitle() {
			return this.title || 'Widget'
		},

		/**
		 * The header's icon colour, published as ONE custom property on the
		 * header rather than an inline `color` repeated on each icon element.
		 * Everything under the header — the icon-class span, the `title-icon`
		 * slot's content, an SVG inside it — inherits from that single
		 * declaration, so the icon and any decoration around it cannot end up
		 * different colours.
		 *
		 * `titleIconColor` wins when the host set one; otherwise the
		 * `titleIconVariant` token does, which is why EVERY widget icon is
		 * coloured and not just the ones an app remembered to configure. Every
		 * value is a CSS variable, so the nldesign app's overrides re-theme
		 * them for free (NL Design System).
		 *
		 * @return {object} A style object declaring `--cn-widget-icon-color`.
		 */
		titleIconStyle() {
			return {
				'--cn-widget-icon-color': this.titleIconColor
					|| TITLE_ICON_VARIANT_COLORS[this.titleIconVariant]
					|| TITLE_ICON_VARIANT_COLORS.primary,
			}
		},

		/**
		 * Effective translate function: the explicit `translate` prop when
		 * given, else the injected `cnTranslate` (identity by default).
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * The RENDERED widget title — `displayTitle` run through the host
		 * translate function. Kept separate from `displayTitle` on purpose:
		 * `resolvedWidgetId` slugifies the raw title, so identifiers (DOM
		 * ids, refresh channels, action payloads) stay locale-independent
		 * while only the visible/AT-facing text localises.
		 *
		 * @return {string}
		 */
		resolvedTitle() {
			return this.title ? this.effectiveTranslate(this.title) : this.displayTitle
		},

		/**
		 * Stable DOM id for the header title `<h3>`, used as the
		 * `aria-labelledby` target of the scrollable content region so the
		 * region gets an accessible name from the widget title (WCAG 4.1.2).
		 * Derived from `resolvedWidgetId` so it is stable and unique per
		 * widget instance on the page.
		 *
		 * @return {string}
		 */
		titleId() {
			return `cn-widget-wrapper-title-${this.resolvedWidgetId}`
		},

		/**
		 * Effective Refresh visibility. `hideRefresh: true` (or
		 * `:show-refresh="false"`) always hides it. When `showRefresh` is
		 * left unset (`null`), auto-detect: show the action only when a
		 * parent attached an `@refresh` listener — otherwise the refresh
		 * would do nothing. `hideRefresh` remains a back-compat alias.
		 *
		 * @return {boolean}
		 */
		effectiveShowRefresh() {
			if (this.hideRefresh) return false
			if (this.showRefresh !== null) return this.showRefresh
			// `$.vnode.props`, not `$attrs`: `refresh` is a declared emit, and
			// Vue keeps declared emits out of `$attrs`.
			return Boolean(this.$.vnode.props?.onRefresh)
		},
		/**
		 * Effective Request-a-feature visibility — same OR-of-opt-outs
		 * pattern as `effectiveShowRefresh`.
		 *
		 * @return {boolean}
		 */
		effectiveShowRequestFeature() {
			return this.showRequestFeature && !this.hideRequestFeature
		},

		/**
		 * Stable id used in event-bus payloads and the
		 * `surface: "widget:<id>"` field on the auto-mounted feature
		 * modal. Prefers the explicit `widgetId` prop; falls back to a
		 * slugified `displayTitle` so widgets without an explicit id
		 * still get a usable identifier.
		 *
		 * @return {string}
		 */
		resolvedWidgetId() {
			if (this.widgetId) return this.widgetId
			return this.displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
		},

		/**
		 * Whether the caller supplied an `action-items` slot. Forwarded
		 * conditionally so the shared CnActionsMenu doesn't treat an
		 * always-present pass-through template as content (which would
		 * keep the overflow menu visible even when every built-in is
		 * opted out).
		 *
		 * @return {boolean}
		 */
		hasActionItemsSlot() {
			return Boolean(this.$slots['action-items']) || Boolean(this.$slots && this.$slots['action-items'])
		},

		wrapperStyles() {
			const styles = {}

			if (this.styleConfig.backgroundColor) {
				styles.backgroundColor = this.styleConfig.backgroundColor
			}

			if (this.styleConfig.borderStyle && this.styleConfig.borderStyle !== 'none') {
				styles.border = `${this.styleConfig.borderWidth || 1}px ${this.styleConfig.borderStyle} ${this.styleConfig.borderColor || 'var(--color-border)'}`
			}

			if (this.styleConfig.borderRadius !== undefined) {
				styles.borderRadius = `${this.styleConfig.borderRadius}px`
			}

			if (this.styleConfig.padding) {
				const p = this.styleConfig.padding
				styles.padding = `${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`
			}

			return styles
		},

		/**
		 * Inline styles for the header bar, derived from
		 * `styleConfig.headerStyle.{backgroundColor, textColor}`. Lets a host
		 * give individual widgets a custom header colour without a per-app CSS
		 * workaround. Empty object when no header style is configured.
		 *
		 * @return {object} the header style bindings.
		 */
		headerStyles() {
			const hs = this.styleConfig.headerStyle
			if (!hs || typeof hs !== 'object') {
				return {}
			}
			const styles = {}
			if (hs.backgroundColor) {
				styles.backgroundColor = hs.backgroundColor
			}
			if (hs.textColor) {
				styles.color = hs.textColor
			}
			return styles
		},
	},

	methods: {
		/**
		 * Re-emit the shared CnActionsMenu `@refresh` to the host, passing
		 * the synthetic event through unchanged so a host listener can
		 * still `preventDefault()` the built-in default (event-bus emit on
		 * `cn:widget:refresh`).
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRefresh(payload, ev) {
			/**
			 * @event refresh User clicked the Refresh item in the overflow
			 * action menu. Payload: `{ widgetId, title }`. Handlers may call
			 * the second arg's `preventDefault()` to suppress the built-in
			 * default (event-bus emit on `cn:widget:refresh`).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('refresh', payload, ev)
		},

		/**
		 * Re-emit the shared CnActionsMenu `@request-feature` to the host,
		 * passing the synthetic event through so a host listener can
		 * `preventDefault()` the built-in default (auto-opening
		 * CnSuggestFeatureModal).
		 *
		 * @param {{ widgetId: string, title: string }} payload Action payload.
		 * @param {{ defaultPrevented: boolean, preventDefault: Function }} ev Synthetic event.
		 * @return {void}
		 */
		onActionsRequestFeature(payload, ev) {
			/**
			 * @event request-feature User clicked the Request a feature
			 * item. Payload: `{ widgetId, title }`. Handlers may call the
			 * second arg's `preventDefault()` to suppress the built-in
			 * default (auto-opening CnSuggestFeatureModal).
			 * @type {{ widgetId: string, title: string }}
			 */
			this.$emit('request-feature', payload, ev)
		},
	},
}
</script>

<style scoped>
.cn-widget-wrapper {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	/* NC design system: every content card is rounded — same token as
	   CnDetailCard so detail pages read as ONE card family (ADR-062). */
	border-radius: var(--border-radius-large, 8px);
	overflow: hidden;
}

/* Headerless date chip — floated over the top-right of a flush card. */
.cn-widget-wrapper__floating-meta {
	position: absolute;
	top: 8px;
	inset-inline-end: 10px;
	z-index: 2;
}

.cn-widget-wrapper__content {
	flex: 1;
	overflow: auto;
	min-height: 0;
	padding: 16px;
}

/* A TABLE GOES EDGE TO EDGE. ALWAYS.
   A table drawn inside 16px of padding renders a border inside a border — two
   rectangles a few pixels apart, which reads as a mistake because it is one.
   The wrapper already has a `flush` prop that zeroes this padding, but a prop
   is something an app has to remember on every table it ever adds, and the
   apps did not: the padding was visible in pipelinq's table widgets.
   So it is structural instead. `:has()` keys on the table component's own root
   class, which means a table is flush by construction and no caller can
   reintroduce the gap by forgetting a prop. */
.cn-widget-wrapper__content:has(> .cn-table-container),
.cn-widget-wrapper__content:has(> .cn-widget-object-table) {
	padding: 0;
}

/* Keyboard focus ring for the now-focusable scrollable content region. */
.cn-widget-wrapper__content:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-widget-wrapper--borderless {
	border: none;
	background: transparent;
}

.cn-widget-wrapper--borderless .cn-widget-wrapper__content {
	padding: 0;
}

.cn-widget-wrapper--flush .cn-widget-wrapper__content {
	padding: 0;
}

/*
 * `chrome="nc-dashboard"` — reproduce the native Nextcloud Dashboard panel
 * (apps/dashboard) exactly, using the same design tokens so an un-customised
 * widget is pixel-identical to a core dashboard panel. `styleConfig` inline
 * overrides (wrapperStyles / headerStyles) still win over these class rules,
 * so users can override any token. Combined selector raises specificity above
 * the base `.cn-widget-wrapper` rules it supersedes.
 */
.cn-widget-wrapper__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	/* The header is `space-between`, so without an explicit gap a right-hand
	   title-icon sits flush against whatever precedes it. The left-hand icon's
	   spacing comes from header-left's own gap. */
	gap: 8px;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
}

.cn-widget-wrapper__header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	/* Grow so the title hugs the (optional) title-icon on the left instead
	   of centering between icon and actions (header is space-between). */
	flex: 1 1 auto;
}

.cn-widget-wrapper__icon {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	color: var(--cn-widget-icon-color, var(--color-primary-element));
}

.cn-widget-wrapper__title {
	font-weight: 600;
	font-size: 14px;
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-widget-wrapper.cn-widget-wrapper--nc-dashboard {
	background: var(--color-main-background-blur, var(--color-main-background));
	-webkit-backdrop-filter: var(--filter-background-blur, none);
	backdrop-filter: var(--filter-background-blur, none);
	border: none;
	border-radius: var(--border-radius-container-large, 16px);
}

.cn-widget-wrapper--nc-dashboard .cn-widget-wrapper__header {
	padding: 16px;
	border-bottom: none;
}

.cn-widget-wrapper--nc-dashboard .cn-widget-wrapper__header-left {
	gap: 16px;
}

.cn-widget-wrapper--nc-dashboard .cn-widget-wrapper__icon {
	width: 32px;
	height: 32px;
	background-size: 32px;
}

.cn-widget-wrapper--nc-dashboard .cn-widget-wrapper__title {
	font-size: 20px;
	font-weight: 700;
	line-height: 24px;
}

.cn-widget-wrapper--nc-dashboard .cn-widget-wrapper__content {
	padding: 0 16px 16px;
}

.cn-widget-wrapper__title-meta {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	flex-shrink: 0;
}

.cn-widget-wrapper__actions {
	display: flex;
	gap: 4px;
	flex-shrink: 0;
}

/* Every widget's header icon is coloured — `--cn-widget-icon-color` is set on
   the header from titleIconStyle, and defaults to the theme colour if a
   wrapper is ever rendered without it. Material-design-icon components paint
   with `fill: currentColor`, so this reaches them; the :deep rule below makes
   it reach a raw <svg> in the slot too. */
.cn-widget-wrapper__title-icon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	/* COLOURED BY DEFAULT. `--cn-widget-icon-color` is set on the header from
	   titleIconStyle; the theme colour is the fallback for a wrapper rendered
	   without it. Before this, the prop defaulted to null and the icon inherited
	   body text colour, which is why every widget header looked the same. */
	color: var(--cn-widget-icon-color, var(--color-primary-element));

	/* SPACE BETWEEN THE ICON AND THE TITLE.
	   This element is a sibling of `__header-left` inside a space-between
	   header, so it never received that element's `gap: 8px` — the icon sat
	   flush against the title text. Matching the header-left gap rather than
	   inventing a value keeps the two icon positions spaced identically. */
	margin-inline-end: 8px;
}

/* Right-positioned title icons sit AFTER the actions, so the margin belongs on
   the other side or it pushes the icon off the header's right edge. */
.cn-widget-wrapper__title-icon:last-child {
	margin-inline-end: 0;
	margin-inline-start: 8px;
}

/* Material-design-icon components paint with `fill: currentColor`, so the
   colour above reaches them; this makes it reach a raw <svg> in the slot too. */
.cn-widget-wrapper__title-icon :deep(svg) {
	fill: currentcolor;
}

.cn-widget-wrapper__footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 8px 16px;
	border-top: 1px solid var(--color-border);
	flex-shrink: 0;
}

.cn-widget-wrapper__footer-link {
	font-size: 13px;
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-widget-wrapper__footer-link:hover {
	text-decoration: underline;
}
</style>
