<!--
  CnWidgetWrapper — Container shell around a dashboard widget.

  Provides header (icon + title), scrollable content area, and optional
  footer with action buttons. Applies style configuration for borders,
  backgrounds, and padding.
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
					:src="iconUrl"
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
				<NcActions
					v-if="hasOverflowMenu"
					:force-name="true"
					:menu-name="actionsMenuLabel"
					data-testid="cn-widget-wrapper-actions">
					<template #icon>
						<DotsHorizontal :size="20" />
					</template>
					<NcActionButton
						v-if="effectiveShowRefresh"
						data-testid="cn-widget-wrapper-action-refresh"
						@click="onRefreshClick">
						<template #icon>
							<Refresh :size="20" />
						</template>
						{{ refreshLabel }}
					</NcActionButton>
					<NcActionButton
						v-if="effectiveShowRequestFeature"
						data-testid="cn-widget-wrapper-action-request-feature"
						@click="onRequestFeatureClick">
						<template #icon>
							<LightbulbOutline :size="20" />
						</template>
						{{ requestFeatureLabel }}
					</NcActionButton>
					<!-- @slot action-items Additional NcActionButton-family
					     items rendered inside the overflow menu, after the
					     built-in Refresh / Request-a-feature pair. -->
					<slot name="action-items" />
				</NcActions>
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
					:href="button.link"
					class="cn-widget-wrapper__footer-link">
					{{ button.text }}
				</a>
			</slot>
		</div>

		<!-- Auto-mounted feature-request modal (B2 default for Request a feature).
		     Lazy-loaded via the components() async-import so the modal bundle
		     only ships when a host renders a widget wrapper. Suppressed by the
		     host calling preventDefault on @request-feature. -->
		<CnSuggestFeatureModal
			v-if="featureRequestModalOpen"
			:repo="cnFeatureRequestRepo"
			:spec-ref="specRef"
			:app="cnAppId"
			:page="$route ? ($route.name || '') : ''"
			:surface="`widget:${resolvedWidgetId}`"
			:conduction-submit-enabled="false"
			@close="onFeatureRequestModalClose" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton } from '@nextcloud/vue'
import { emit as emitOnBus } from '@nextcloud/event-bus'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import LightbulbOutline from 'vue-material-design-icons/LightbulbOutline.vue'

/**
 * Stable event-bus channel name for the built-in widget Refresh
 * action. Widgets opt in by `subscribe('cn:widget:refresh', cb)` and
 * filtering on `payload.widgetId`. Documented in
 * `cn-widget-wrapper.md` as part of the B3 refresh contract.
 */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

/**
 * Build a synthetic event object handed to host listeners alongside
 * the action payload. Mirrors the Vue 3 / DOM Event API enough to let
 * a host call `event.preventDefault()` to suppress the wrapper's
 * built-in default handler.
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
 *   :buttons="widget.buttons">
 *   <CnWidgetRenderer :widget="widget" />
 * </CnWidgetWrapper>
 * ```
 */
export default {
	name: 'CnWidgetWrapper',

	components: {
		NcActions,
		NcActionButton,
		DotsHorizontal,
		Refresh,
		LightbulbOutline,
		CnSuggestFeatureModal: () => import('../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'),
	},

	inject: {
		/**
		 * Consuming app's slug (e.g. "pipelinq"). Provided by CnAppRoot.
		 * Auto-filled on the built-in Request-a-feature modal as the
		 * `app` prop. Defaults to empty string when no CnAppRoot ancestor
		 * exists; the modal falls back to a missing-context warning.
		 */
		cnAppId: { default: () => '' },
		/**
		 * Repo slug used as the GitHub deep-link target on the auto-
		 * mounted CnSuggestFeatureModal (e.g. `ConductionNL/pipelinq`).
		 * Provided by CnAppRoot from the manifest's
		 * `nav.featureRequestRepo` field (with fallback to
		 * `ConductionNL/<appId>`). Empty when no ancestor — the default
		 * handler will warn-and-skip-modal rather than open a broken link.
		 */
		cnFeatureRequestRepo: { default: () => '' },
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

	data() {
		return {
			/**
			 * Internal state for the auto-mounted default
			 * CnSuggestFeatureModal (B2). Flipped to true by the
			 * default Request-a-feature handler when the host did not
			 * `preventDefault()` on `@request-feature`. The modal emits
			 * `@close` back to this component which resets it.
			 */
			featureRequestModalOpen: false,
		}
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
		 * Whether the built-in overflow `…` menu renders. True when at
		 * least one of Refresh / Request-a-feature is visible OR the
		 * caller provided an `action-items` slot.
		 *
		 * @return {boolean}
		 */
		hasOverflowMenu() {
			if (this.effectiveShowRefresh) return true
			if (this.effectiveShowRequestFeature) return true
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
		 * Refresh click — emits `@refresh`, then runs the built-in
		 * default (emit on the `cn:widget:refresh` event-bus channel)
		 * unless the host called `event.preventDefault()` on the
		 * second handler arg. Payload includes `widgetId` for
		 * subscriber-side filtering.
		 *
		 * @return {void}
		 */
		onRefreshClick() {
			const ev = createSyntheticEvent()
			/**
			 * @event refresh User clicked the Refresh item in the overflow
			 * action menu. Payload: `{ widgetId, title }`. Handlers may
			 * call the second arg's `preventDefault()` to suppress the
			 * built-in default (event-bus emit on `cn:widget:refresh`).
			 */
			this.$emit('refresh', { widgetId: this.resolvedWidgetId, title: this.displayTitle }, ev)
			if (ev.defaultPrevented) return
			emitOnBus(REFRESH_BUS_CHANNEL, {
				widgetId: this.resolvedWidgetId,
				title: this.displayTitle,
			})
		},

		/**
		 * Request-a-feature click — emits `@request-feature`, then runs
		 * the built-in default (open `CnSuggestFeatureModal` with
		 * `app + page + surface=widget:<id>` context auto-filled from
		 * `CnAppRoot` injects) unless the host called `event.preventDefault()`.
		 * The injects fall back to empty strings outside `CnAppRoot`;
		 * the handler logs a `console.warn` and skips opening the modal
		 * when no repo can be resolved.
		 *
		 * @return {void}
		 */
		onRequestFeatureClick() {
			const ev = createSyntheticEvent()
			/**
			 * @event request-feature User clicked the Request a feature
			 * item. Payload: `{ widgetId, title }`. Handlers may call
			 * the second arg's `preventDefault()` to suppress the
			 * built-in default (auto-opening `CnSuggestFeatureModal`).
			 */
			this.$emit('request-feature', { widgetId: this.resolvedWidgetId, title: this.displayTitle }, ev)
			if (ev.defaultPrevented) return
			if (!this.cnFeatureRequestRepo) {
				// eslint-disable-next-line no-console
				console.warn(
					'[CnWidgetWrapper] Cannot open feature request modal: missing cnFeatureRequestRepo inject (mount under CnAppRoot or bind a custom @request-feature listener).',
				)
				return
			}
			this.featureRequestModalOpen = true
		},
		/**
		 * Close handler for the auto-mounted feature-request modal.
		 * Resets the v-model-equivalent local flag.
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
