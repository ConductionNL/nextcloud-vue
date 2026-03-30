<template>
	<div class="cn-progress-bar">
		<div class="cn-progress-bar__items">
			<div
				v-for="(item, index) in items"
				:key="item.key || index"
				class="cn-progress-bar__item">
				<div class="cn-progress-bar__label">
					<span
						class="cn-progress-bar__name"
						:class="{ 'cn-progress-bar__name--tooltip': item.tooltip }"
						:title="item.tooltip || undefined">
						<slot :name="'label-' + (item.key || index)" :item="item">
							{{ item.label }}
						</slot>
					</span>
					<span class="cn-progress-bar__value">
						<slot :name="'value-' + (item.key || index)" :item="item" :percentage="getPercentage(item)">
							{{ formatValue(item) }}
						</slot>
					</span>
				</div>
				<div
					class="cn-progress-bar__track"
					:class="{ 'cn-progress-bar__track--rounded': rounded }"
					:style="{ height: barHeight + 'px' }">
					<div
						class="cn-progress-bar__fill"
						:class="[
							'cn-progress-bar__fill--' + resolveVariant(item),
							{ 'cn-progress-bar__fill--rounded': rounded },
						]"
						:style="{ width: getPercentage(item) + '%' }" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
/**
 * CnProgressBar — Labeled horizontal progress bars with variant colors.
 *
 * Renders a list of items as labeled progress bars. Each item has a label, a count,
 * and a percentage-width fill bar. Percentages are calculated automatically from the
 * items' count values relative to the total (sum of all counts), or can be provided
 * explicitly via `item.percentage`.
 *
 * Suitable for distribution visualizations (e.g., query complexity, action breakdown,
 * status distribution).
 *
 * @example Basic usage
 * <CnProgressBar :items="[
 *   { key: 'simple', label: 'Simple', count: 50, variant: 'success' },
 *   { key: 'medium', label: 'Medium', count: 30, variant: 'warning' },
 *   { key: 'complex', label: 'Complex', count: 20, variant: 'error' },
 * ]" />
 *
 * @example With explicit percentages
 * <CnProgressBar :items="[
 *   { key: 'cpu', label: 'CPU', percentage: 72, variant: 'warning' },
 *   { key: 'mem', label: 'Memory', percentage: 45, variant: 'success' },
 * ]" show-percentage />
 *
 * @example With tooltips
 * <CnProgressBar :items="[
 *   { key: 'simple', label: 'Simple', count: 50, variant: 'success', tooltip: 'Basic text searches' },
 * ]" />
 */
export default {
	name: 'CnProgressBar',

	props: {
		/**
		 * Array of progress bar items.
		 *
		 * Each item: `{ key?, label, count?, percentage?, variant?, tooltip? }`
		 *
		 * - `key` — Unique identifier (optional, falls back to index)
		 * - `label` — Display label
		 * - `count` — Numeric value (used to calculate percentage from total if `percentage` not given)
		 * - `total` — Per-item total for percentage calculation (e.g. count=50, total=500 → 10%). Defaults to sum of all item counts.
		 * - `percentage` — Explicit percentage (0-100), overrides both count and total
		 * - `variant` — Color variant: a string ('default'|'primary'|'success'|'warning'|'error'|'info') or a function `({ item, count, total, percentage }) => string` for dynamic resolution
		 * - `tooltip` — Hover tooltip text for the label
		 */
		items: {
			type: Array,
			default: () => [],
		},

		/**
		 * Default color variant for all bars. Individual items can override via `item.variant`.
		 * One of: 'default', 'primary', 'success', 'warning', 'error', 'info'
		 */
		variant: {
			type: String,
			default: 'primary',
			validator: (v) => ['default', 'primary', 'success', 'warning', 'error', 'info'].includes(v),
		},

		/** Height of the progress bar track in pixels */
		barHeight: {
			type: Number,
			default: 8,
		},

		/** Whether to use rounded corners on the track and fill */
		rounded: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the percentage value instead of the count */
		showPercentage: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		/**
		 * Total count across all items (for percentage calculation).
		 * @return {number}
		 */
		totalCount() {
			return this.items.reduce((sum, item) => sum + (item.count || 0), 0)
		},
	},

	methods: {
		/**
		 * Get the percentage for an item.
		 * Uses item.percentage if provided, otherwise calculates from count/total.
		 * @param {object} item - The progress bar item
		 * @return {number} Percentage (0-100)
		 */
		/**
		 * Resolve the variant for an item. Supports string or function.
		 * @param {object} item - The progress bar item
		 * @return {string} Resolved variant name
		 */
		resolveVariant(item) {
			const itemVariant = item.variant
			if (typeof itemVariant === 'function') {
				return itemVariant({
					item,
					count: item.count ?? 0,
					total: item.total ?? this.totalCount,
					percentage: this.getPercentage(item),
				}) || this.variant
			}
			return itemVariant || this.variant
		},

		getPercentage(item) {
			if (item.percentage !== undefined && item.percentage !== null) {
				return Math.min(100, Math.max(0, item.percentage))
			}
			const total = (item.total !== undefined && item.total !== null) ? item.total : this.totalCount
			if (total === 0) return 0
			return Math.round(((item.count || 0) / total) * 100)
		},

		/**
		 * Format the display value for an item.
		 * @param {object} item - The progress bar item
		 * @return {string} Formatted value
		 */
		formatValue(item) {
			if (this.showPercentage) {
				return `${this.getPercentage(item)}%`
			}
			return String(item.count ?? 0)
		},
	},
}
</script>

<style scoped>
.cn-progress-bar__items {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-progress-bar__item {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-progress-bar__label {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 0.9rem;
}

.cn-progress-bar__name {
	color: var(--color-main-text);
}

.cn-progress-bar__name--tooltip {
	cursor: help;
	text-decoration: underline;
	text-decoration-style: dotted;
	text-underline-offset: 2px;
}

.cn-progress-bar__name--tooltip:hover {
	text-decoration-style: solid;
}

.cn-progress-bar__value {
	color: var(--color-text-maxcontrast);
	font-variant-numeric: tabular-nums;
}

.cn-progress-bar__track {
	background: var(--color-background-dark, var(--color-background-darker));
	overflow: hidden;
}

.cn-progress-bar__track--rounded {
	border-radius: 4px;
}

.cn-progress-bar__fill {
	height: 100%;
	transition: width 0.3s ease;
}

.cn-progress-bar__fill--rounded {
	border-radius: 4px;
}

/* Variant colors */
.cn-progress-bar__fill--default {
	background: var(--color-main-text);
}

.cn-progress-bar__fill--primary {
	background: var(--color-primary-element);
}

.cn-progress-bar__fill--success {
	background: var(--color-success);
}

.cn-progress-bar__fill--warning {
	background: var(--color-warning);
}

.cn-progress-bar__fill--error {
	background: var(--color-error);
}

.cn-progress-bar__fill--info {
	background: var(--color-info, #0082c9);
}
</style>
