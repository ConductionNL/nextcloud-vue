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
			</div>
			<div class="cn-widget-wrapper__actions">
				<slot name="actions" />
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

/**
 * CnWidgetWrapper — Widget container with header, content, and footer.
 *
 * @example
 * <CnWidgetWrapper title="My Cases" :icon-url="casesIconUrl">
 *   <MyCasesChart :data="chartData" />
 * </CnWidgetWrapper>
 *
 * @example With NC widget object
 * <CnWidgetWrapper
 *   :title="widget.title"
 *   :icon-url="widget.iconUrl"
 *   :icon-class="widget.iconClass"
 *   :buttons="widget.buttons">
 *   <CnWidgetRenderer :widget="widget" />
 * </CnWidgetWrapper>
 */
export default {
	name: 'CnWidgetWrapper',

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
		/** Footer action buttons: [{ text, link }] */
		buttons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Style configuration for the wrapper.
		 * @type {{ backgroundColor?: string, borderStyle?: string, borderWidth?: number, borderColor?: string, borderRadius?: number, padding?: { top: number, right: number, bottom: number, left: number } }}
		 */
		styleConfig: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		displayTitle() {
			return this.title || 'Widget'
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

.cn-widget-wrapper__content {
	flex: 1;
	overflow: auto;
	min-height: 0;
	padding: 16px;
}

.cn-widget-wrapper__actions {
	display: flex;
	gap: 4px;
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
