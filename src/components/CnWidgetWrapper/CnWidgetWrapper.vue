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
		}"
		:style="wrapperStyles">
		<!-- Header -->
		<div v-if="showTitle" class="cn-widget-wrapper__header">
			<!-- Title icon — left: rendered before the title group -->
			<div v-if="$slots['title-icon'] && titleIconPosition === 'left'"
				class="cn-widget-wrapper__title-icon"
				:style="titleIconColor ? { color: titleIconColor } : {}">
				<slot name="title-icon" />
			</div>
			<div class="cn-widget-wrapper__header-left">
				<img
					v-if="iconUrl"
					:src="safeImageSrc(iconUrl)"
					:alt="displayTitle"
					class="cn-widget-wrapper__icon">
				<span
					v-else-if="iconClass"
					:class="iconClass"
					class="cn-widget-wrapper__icon" />
				<h3 class="cn-widget-wrapper__title">
					{{ displayTitle }}
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
			<div class="cn-widget-wrapper__actions">
				<!-- @slot actions Custom action buttons rendered before the
				     built-in overflow menu. -->
				<slot name="actions" />
				<CnActionsMenu
					:show-refresh="effectiveShowRefresh"
					:show-request-feature="effectiveShowRequestFeature"
					:documentation-url="documentationUrl"
					:documentation-label="documentationLabel"
					:refresh-label="refreshLabel"
					:request-feature-label="requestFeatureLabel"
					:actions-menu-label="actionsMenuLabel"
					:refreshing="refreshing"
					:optimistic-spin-ms="optimisticSpinMs"
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
				class="cn-widget-wrapper__title-icon"
				:style="titleIconColor ? { color: titleIconColor } : {}">
				<slot name="title-icon" />
			</div>
		</div>

		<!-- Content -->
		<div class="cn-widget-wrapper__content">
			<slot />
		</div>

		<!-- Footer -->
		<div v-if="$slots.footer || (buttons && buttons.length > 0)" class="cn-widget-wrapper__footer">
			<slot name="footer">
				<a
					v-for="button in buttons"
					:key="button.link"
					:href="safeHref(button.link)"
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
import { safeHref, safeImageSrc } from '../../utils/safeHref.js'

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
export default {
	name: 'CnWidgetWrapper',

	components: {
		CnActionsMenu,
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

		/** CSS color value applied to the title-icon slot container */
		titleIconColor: {
			type: String,
			default: null,
		},

		/** Footer action buttons: [{ text, link }] */
		buttons: {
			type: Array,
			default: () => [],
		},

		/**
		 * Style configuration for the wrapper.
		 *
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
		 * Inverse of `hideRefresh`. Defaults to `true` so the action
		 * renders. Set `:show-refresh="false"` to hide. Either `hideRefresh`
		 * OR `!showRefresh` hides the action — the spec scenario in
		 * `widget-wrapper` declares the show-prefixed form as canonical;
		 * the `hide-` flags remain for back-compat.
		 *
		 * @type {boolean}
		 */
		showRefresh: {
			type: Boolean,
			default: true,
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
		 * Documentation link for this widget. When a non-empty URL is set,
		 * the overflow menu renders a "Documentation" item that opens the
		 * link in a new tab. Host apps supply it from the widget
		 * configuration. Empty (the default) hides the item.
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
		 * icon spins for exactly as long as this stays true — accurate
		 * feedback. When left at its default `false`, clicking Refresh
		 * still spins optimistically for a short fixed duration
		 * (`optimisticSpinMs`) so the action feels responsive even without
		 * host wiring.
		 *
		 * @type {boolean}
		 */
		refreshing: {
			type: Boolean,
			default: false,
		},
		/**
		 * Duration (ms) of the optimistic spin shown on Refresh click when
		 * the host has NOT bound `:refreshing`. Defaults to 800ms — roughly
		 * two rotations at the icon's spin speed. Set to 0 to disable the
		 * optimistic spin entirely (icon only spins while `refreshing` is
		 * true).
		 *
		 * @type {number}
		 */
		optimisticSpinMs: {
			type: Number,
			default: 800,
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
	},

	methods: {
		safeHref,
		safeImageSrc,
	},

	methods: {
		safeHref,
		safeImageSrc,
	},

	computed: {
		displayTitle() {
			return this.title || 'Widget'
		},

		/**
		 * Effective Refresh visibility. Either `hideRefresh: true` OR
		 * `showRefresh: false` hides the action. The show-prefixed prop
		 * is the spec-canonical form (per `widget-wrapper` scenario);
		 * `hideRefresh` remains as a back-compat alias.
		 *
		 * @return {boolean}
		 */
		effectiveShowRefresh() {
			return this.showRefresh && !this.hideRefresh
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
			return Boolean(this.$slots['action-items']) || Boolean(this.$scopedSlots && this.$scopedSlots['action-items'])
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
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	overflow: hidden;
}

.cn-widget-wrapper__content {
	flex: 1;
	overflow: auto;
	min-height: 0;
	padding: 16px;
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

.cn-widget-wrapper__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
}

.cn-widget-wrapper__header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.cn-widget-wrapper__icon {
	width: 24px;
	height: 24px;
	flex-shrink: 0;
}

.cn-widget-wrapper__title {
	font-weight: 600;
	font-size: 14px;
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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

.cn-widget-wrapper__title-icon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
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
