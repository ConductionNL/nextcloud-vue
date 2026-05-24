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
						v-if="!hideRefresh"
						data-testid="cn-widget-wrapper-action-refresh"
						@click="onRefreshClick">
						<template #icon>
							<Refresh :size="20" />
						</template>
						{{ refreshLabel }}
					</NcActionButton>
					<NcActionButton
						v-if="!hideRequestFeature"
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
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton } from '@nextcloud/vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import LightbulbOutline from 'vue-material-design-icons/LightbulbOutline.vue'

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
		 * has no refreshable data source (e.g. a static tile).
		 */
		hideRefresh: {
			type: Boolean,
			default: false,
		},
		/**
		 * Hide the built-in Request-a-feature item from the overflow
		 * action menu. Shown by default; set when the consuming app has
		 * no public issue tracker to link out to.
		 */
		hideRequestFeature: {
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
	},

	computed: {
		displayTitle() {
			return this.title || 'Widget'
		},

		/**
		 * Whether the built-in overflow `…` menu renders. True when at
		 * least one of Refresh / Request-a-feature is visible OR the
		 * caller provided an `action-items` slot.
		 *
		 * @return {boolean}
		 */
		hasOverflowMenu() {
			if (!this.hideRefresh) return true
			if (!this.hideRequestFeature) return true
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
		 * Emit @refresh when the user clicks the built-in Refresh action.
		 * Payload is the widget title — dashboard hosts use it to route
		 * to the right widget when a single handler is wired to many
		 * wrappers.
		 *
		 * @return {void}
		 */
		onRefreshClick() {
			/**
			 * @event refresh User clicked the Refresh item in the overflow
			 * action menu. Payload: `{ title }` where `title` is the
			 * widget's display title (consumers route by it when one
			 * handler serves many wrappers).
			 */
			this.$emit('refresh', { title: this.displayTitle })
		},

		/**
		 * Emit @request-feature when the user clicks the built-in
		 * Request-a-feature action. The consuming dashboard decides
		 * where to send the user (typically an issue tracker).
		 *
		 * @return {void}
		 */
		onRequestFeatureClick() {
			/**
			 * @event request-feature User clicked the Request a feature
			 * item. Payload: `{ title }` — the widget's display title.
			 */
			this.$emit('request-feature', { title: this.displayTitle })
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
