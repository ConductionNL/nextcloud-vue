<template>
	<div class="cn-stats-block">
		<div class="cn-stats-block__header">
			<h4>{{ title || 'Objects' }}</h4>
		</div>

		<div v-if="count > 0" class="cn-stats-block__count">
			<span class="cn-stats-block__count-value">{{ count }}</span>
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
		<div v-if="breakdown && count > 0" class="cn-stats-block__breakdown">
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
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnStatsBlock — Statistics display card with a prominent count and optional breakdown.
 *
 * Extracted from OpenRegister's SchemaStatsBlock. Shows a large number with
 * label and optional detailed breakdown (e.g., total, invalid, deleted, published).
 *
 * @example
 * <CnStatsBlock
 *   title="Cases"
 *   :count="42"
 *   count-label="open cases"
 *   :breakdown="{ total: 100, invalid: 3, deleted: 5, published: 92 }" />
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
			default: 'objects',
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
			default: 'Loading...',
		},
		/** Text shown when count is 0 */
		emptyLabel: {
			type: String,
			default: 'No items found',
		},
	},

	methods: {
		/**
		 * Format a breakdown key into a readable label.
		 * Capitalizes first letter and adds colon.
		 * @param {string} key The breakdown key
		 * @return {string} Formatted label
		 */
		formatBreakdownLabel(key) {
			return key.charAt(0).toUpperCase() + key.slice(1) + ':'
		},
	},
}
</script>

<style scoped>
.cn-stats-block {
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	padding: 1rem;
	margin-bottom: 1rem;
}

.cn-stats-block__header h4 {
	margin-top: 0;
	margin-bottom: 1rem;
	color: var(--color-main-text);
}

.cn-stats-block__count {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 0.5rem;
	font-size: 1.2rem;
	margin-bottom: 1rem;
}

.cn-stats-block__count-value {
	font-size: 2rem;
	font-weight: bold;
	color: var(--color-primary-element);
}

.cn-stats-block__count-label {
	color: var(--color-text-maxcontrast);
}

.cn-stats-block__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	color: var(--color-text-maxcontrast);
	margin-bottom: 1rem;
}

.cn-stats-block__empty {
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin-bottom: 1rem;
}

.cn-stats-block__breakdown {
	margin-top: 1rem;
	padding: 1rem;
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	border: 1px solid var(--color-border);
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

.cn-stats-block__breakdown-value--invalid { color: var(--color-warning); }
.cn-stats-block__breakdown-value--deleted { color: var(--color-error); }
.cn-stats-block__breakdown-value--published { color: var(--color-success); }
</style>
