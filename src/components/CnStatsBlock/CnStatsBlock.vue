<template>
	<component
		:is="componentTag"
		class="cn-stats-block"
		:class="rootClasses"
		v-bind="componentAttrs"
		@click="onClick">
		<!-- Icon -->
		<div v-if="hasIcon" class="cn-stats-block__icon" :class="iconClasses">
			<slot name="icon">
				<component :is="icon" v-if="icon" :size="iconSize" />
			</slot>
		</div>

		<!-- Content -->
		<div class="cn-stats-block__content">
			<div class="cn-stats-block__header">
				<h4>{{ title || t('nextcloud-vue', 'Objects') }}</h4>
			</div>

			<div v-if="count > 0 || (showZeroCount && count === 0)" class="cn-stats-block__count">
				<span class="cn-stats-block__count-value">{{ formattedCount }}</span>
				<span class="cn-stats-block__count-label">{{ countLabel }}</span>
			</div>
			<div v-else-if="loading" class="cn-stats-block__loading">
				<NcLoadingIcon :size="16" />
				{{ loadingLabel }}
			</div>
			<div v-else class="cn-stats-block__empty">
				{{ emptyLabel }}
			</div>

			<!-- Breakdown details -->
			<div v-if="breakdown && (count > 0 || showZeroCount)" class="cn-stats-block__breakdown">
				<div
					v-for="(value, key) in breakdown"
					:key="key"
					class="cn-stats-block__breakdown-item">
					<span class="cn-stats-block__breakdown-label">{{ formatBreakdownLabel(key) }}</span>
					<span
						class="cn-stats-block__breakdown-value"
						:class="'cn-stats-block__breakdown-value--' + key">
						{{ value }}
					</span>
				</div>
			</div>
		</div>
	</component>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnStatsBlock — Statistics display card with icon, count, and optional breakdown.
 *
 * Supports vertical (default) and horizontal layouts, color variants, icons,
 * and clickable state. Use in a CnKpiGrid for responsive dashboard layouts.
 *
 * @example Basic vertical (default)
 * <CnStatsBlock title="Cases" :count="42" count-label="open cases" />
 *
 * @example Horizontal with icon and variant
 * <CnStatsBlock
 *   title="Open Cases"
 *   :count="42"
 *   :icon="BriefcaseOutline"
 *   variant="primary"
 *   horizontal
 *   clickable
 *   @click="goToCases" />
 *
 * @example With route-based navigation (renders as <router-link>)
 * <CnStatsBlock
 *   title="Open Cases"
 *   :count="42"
 *   :icon="BriefcaseOutline"
 *   variant="primary"
 *   :route="{ name: 'Cases', query: { status: 'open' } }" />
 *
 * @example With breakdown
 * <CnStatsBlock
 *   title="Cases"
 *   :count="42"
 *   :breakdown="{ total: 100, invalid: 3, deleted: 5, published: 92 }" />
 *
 * @example Custom icon slot
 * <CnStatsBlock title="Files" :count="128">
 *   <template #icon>
 *     <FileDocumentOutline :size="24" />
 *   </template>
 * </CnStatsBlock>
 */
export default {
	name: 'CnStatsBlock',

	components: {
		NcLoadingIcon,
	},

	props: {
		/** Block title */
		title: {
			type: String,
			default: '',
		},
		/** The main count number to display prominently */
		count: {
			type: Number,
			default: 0,
		},
		/** Label displayed next to the count */
		countLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'objects'),
		},
		/** Detailed breakdown object (key-value pairs) */
		breakdown: {
			type: Object,
			default: null,
		},
		/** Whether data is currently loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Text shown while loading */
		loadingLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/** Text shown when count is 0 */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No items found'),
		},
		/** Icon component (e.g., imported MDI icon) */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 24,
		},
		/** Color variant: 'default', 'primary', 'success', 'warning', 'error' */
		variant: {
			type: String,
			default: 'default',
			validator: (v) => ['default', 'primary', 'success', 'warning', 'error'].includes(v),
		},
		/** Use horizontal layout (icon left, content right) */
		horizontal: {
			type: Boolean,
			default: false,
		},
		/** Whether the card is clickable */
		clickable: {
			type: Boolean,
			default: false,
		},
		/** Whether to display 0 as a count value instead of the empty label */
		showZeroCount: {
			type: Boolean,
			default: false,
		},
		/**
		 * Vue Router location object for declarative navigation.
		 * When set, the card renders as a <router-link> and clickable styles are implied.
		 * @example { name: 'Cases', query: { status: 'open' } }
		 * @example { path: '/catalogi' }
		 */
		route: {
			type: Object,
			default: null,
		},
	},

	computed: {
		hasIcon() {
			return this.icon !== null || this.$scopedSlots.icon || this.$slots.icon
		},

		formattedCount() {
			return this.count.toLocaleString()
		},

		/**
		 * Whether the card is interactive (clickable or has a route).
		 * Used for applying hover/focus styles.
		 */
		isInteractive() {
			return !!this.route || this.clickable
		},

		/**
		 * Determines which HTML element or component to render.
		 * - route set → 'router-link' (SPA navigation)
		 * - clickable → 'a' (app handles click via event)
		 * - neither → 'div' (static display)
		 */
		componentTag() {
			if (this.route) return 'router-link'
			if (this.clickable) return 'a'
			return 'div'
		},

		/**
		 * Dynamic attributes for the root element based on rendering mode.
		 */
		componentAttrs() {
			if (this.route) return { to: this.route, tabindex: '0' }
			if (this.clickable) return { href: '#', role: 'button', tabindex: '0' }
			return {}
		},

		rootClasses() {
			return {
				'cn-stats-block--horizontal': this.horizontal,
				'cn-stats-block--clickable': this.isInteractive,
				[`cn-stats-block--${this.variant}`]: this.variant !== 'default',
			}
		},

		iconClasses() {
			return {
				[`cn-stats-block__icon--${this.variant}`]: this.variant !== 'default',
			}
		},
	},

	methods: {
		formatBreakdownLabel(key) {
			return key.charAt(0).toUpperCase() + key.slice(1) + ':'
		},

		onClick(event) {
			// When route is set, router-link handles navigation — do not emit click
			if (this.route) return
			if (this.clickable) {
				event.preventDefault()
				this.$emit('click', event)
			}
		},
	},
}
</script>

<style scoped>
.cn-stats-block {
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large, 10px);
	padding: 1rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-decoration: none;
	color: inherit;
	border: 2px solid transparent;
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
	height: 100%;
	width: 100%;
	box-sizing: border-box;
	overflow: hidden;
	min-width: 0;
}

.cn-stats-block--horizontal {
	flex-direction: row;
	align-items: center;
	gap: 12px;
}

.cn-stats-block--horizontal .cn-stats-block__content {
	text-align: left;
	min-width: 0;
}

.cn-stats-block--horizontal .cn-stats-block__count {
	justify-content: flex-start;
}

.cn-stats-block--clickable {
	cursor: pointer;
}

.cn-stats-block--clickable:hover {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cn-stats-block--clickable:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* Icon */
.cn-stats-block__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	background: var(--color-primary-element-light, rgba(0, 130, 201, 0.1));
	color: var(--color-primary-element);
	flex-shrink: 0;
	margin-bottom: 8px;
}

.cn-stats-block--horizontal .cn-stats-block__icon {
	margin-bottom: 0;
	width: 36px;
	height: 36px;
}

.cn-stats-block__icon--primary {
	background: var(--color-primary-element-light, rgba(0, 130, 201, 0.1));
	color: var(--color-primary-element);
}

.cn-stats-block__icon--success {
	background: rgba(70, 186, 97, 0.1);
	color: var(--color-element-success, var(--color-success));
}

.cn-stats-block__icon--warning {
	background: rgba(232, 163, 24, 0.1);
	color: var(--color-element-warning, var(--color-warning));
}

.cn-stats-block__icon--error {
	background: rgba(224, 36, 36, 0.1);
	color: var(--color-element-error, var(--color-error));
}

/* Content */
.cn-stats-block__content {
	flex: 1;
	min-width: 0;
	text-align: center;
}

.cn-stats-block__header h4 {
	margin-top: 0;
	margin-bottom: 0.25rem;
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-stats-block__count {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 0.25rem;
	font-size: 1.2rem;
	margin-bottom: 0.25rem;
	white-space: nowrap;
	overflow: hidden;
}

.cn-stats-block__count-value {
	font-size: 2rem;
	font-weight: bold;
	color: var(--color-primary-element);
	flex-shrink: 0;
}

.cn-stats-block--primary .cn-stats-block__count-value { color: var(--color-primary-element); }
.cn-stats-block--success .cn-stats-block__count-value { color: var(--color-element-success, var(--color-success)); }
.cn-stats-block--warning .cn-stats-block__count-value { color: var(--color-element-warning, var(--color-warning)); }
.cn-stats-block--error .cn-stats-block__count-value { color: var(--color-element-error, var(--color-error)); }

.cn-stats-block__count-label {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-stats-block__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	color: var(--color-text-maxcontrast);
	margin-bottom: 0.5rem;
}

.cn-stats-block__empty {
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin-bottom: 0.5rem;
}

.cn-stats-block__breakdown {
	margin-top: 0.5rem;
	padding: 0.75rem;
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	border: 1px solid var(--color-border);
	width: 100%;
}

.cn-stats-block__breakdown-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 0.5rem;
}

.cn-stats-block__breakdown-item:last-child {
	margin-bottom: 0;
}

.cn-stats-block__breakdown-label {
	font-weight: 500;
	color: var(--color-main-text);
}

.cn-stats-block__breakdown-value {
	font-weight: 600;
	padding: 0.25rem 0.5rem;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-stats-block__breakdown-value--invalid { color: var(--color-element-warning); }
.cn-stats-block__breakdown-value--deleted { color: var(--color-element-error); }
.cn-stats-block__breakdown-value--published { color: var(--color-element-success); }
</style>
