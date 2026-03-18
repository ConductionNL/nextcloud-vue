<template>
	<div
		class="cn-card"
		:class="rootClasses"
		:style="activeStyles"
		@click="onClick">
		<div class="cn-card__header">
			<h2 v-tooltip.bottom="titleTooltip || description" class="cn-card__title">
				<slot name="icon">
					<component :is="icon" v-if="icon" :size="iconSize" />
				</slot>
				<span class="cn-card__title-text">{{ title }}</span>
				<slot name="labels">
					<span v-if="labels.length > 0" class="cn-card__labels">
						<CnStatusBadge
							v-for="(label, i) in labels"
							:key="i"
							:label="label.text"
							:variant="label.variant || 'default'"
							:solid="true" />
					</span>
				</slot>
			</h2>
			<div v-if="$slots.actions || $scopedSlots.actions" class="cn-card__actions">
				<slot name="actions" />
			</div>
		</div>

		<div class="cn-card__body">
			<slot name="description">
				<p v-if="description"
					class="cn-card__description"
					:style="descriptionStyle">
					{{ description }}
				</p>
			</slot>

			<div v-if="$slots.default || $scopedSlots.default" class="cn-card__content">
				<slot />
			</div>

			<slot name="stats">
				<div v-if="stats.length > 0" class="cn-card__stats">
					<div v-for="(stat, i) in stats" :key="i" class="cn-card__stat">
						<span class="cn-card__stat-label">{{ stat.label }}:</span>
						<span class="cn-card__stat-value">{{ stat.value }}</span>
					</div>
				</div>
			</slot>
		</div>
	</div>
</template>

<script>
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * CnCard — Generic prop-driven card component.
 *
 * A flexible card for displaying entities with a title, icon, description,
 * labels/badges, stats, and an optional active highlight state. Unlike
 * CnObjectCard (schema-driven), CnCard takes direct props and is ideal
 * for known, fixed-structure entities.
 *
 * @example Basic usage
 * <CnCard
 *   title="My Source"
 *   description="A PostgreSQL data source"
 *   :icon="DatabaseArrowRightOutline"
 *   :stats="[{ label: 'Type', value: 'PostgreSQL' }]">
 *   <template #actions>
 *     <NcActions><NcActionButton @click="edit">Edit</NcActionButton></NcActions>
 *   </template>
 * </CnCard>
 *
 * @example With labels and active state
 * <CnCard
 *   title="My Organisation"
 *   :icon="OfficeBuilding"
 *   :active="isActive"
 *   active-variant="success"
 *   :labels="[
 *     { text: 'Default', variant: 'warning' },
 *     { text: 'Active', variant: 'success' },
 *   ]"
 *   :stats="[
 *     { label: 'Members', value: 12 },
 *     { label: 'Owner', value: 'Admin' },
 *   ]" />
 */
export default {
	name: 'CnCard',

	components: {
		CnStatusBadge,
	},

	props: {
		/** Card title text */
		title: {
			type: String,
			default: '',
		},
		/** Description text, displayed with line-clamp truncation */
		description: {
			type: String,
			default: '',
		},
		/** Tooltip text for the title. If not set, falls back to description */
		titleTooltip: {
			type: String,
			default: '',
		},
		/** Icon component (e.g., imported MDI icon). Rendered via <component :is> */
		icon: {
			type: [Object, Function],
			default: null,
		},
		/** Icon size in pixels */
		iconSize: {
			type: Number,
			default: 20,
		},
		/**
		 * Array of badge/label objects displayed inline with the title.
		 * Each entry: { text: string, variant?: string }
		 * Variant maps to CnStatusBadge variants: 'default'|'primary'|'success'|'warning'|'error'|'info'
		 */
		labels: {
			type: Array,
			default: () => [],
		},
		/**
		 * Array of stat rows displayed as label:value pairs.
		 * Each entry: { label: string, value: string|number }
		 */
		stats: {
			type: Array,
			default: () => [],
		},
		/** Maximum lines for description truncation (CSS line-clamp) */
		descriptionLines: {
			type: Number,
			default: 3,
		},
		/** Whether the card is in an active/highlighted state */
		active: {
			type: Boolean,
			default: false,
		},
		/**
		 * Color variant for the active state border and background.
		 * Maps to Nextcloud CSS variables.
		 */
		activeVariant: {
			type: String,
			default: 'success',
			validator: (v) => ['success', 'primary', 'warning', 'error', 'info'].includes(v),
		},
		/** Whether the card is clickable (adds hover effect and cursor pointer) */
		clickable: {
			type: Boolean,
			default: false,
		},
	},

	computed: {
		rootClasses() {
			return {
				'cn-card--active': this.active,
				'cn-card--clickable': this.clickable,
			}
		},

		descriptionStyle() {
			return {
				'-webkit-line-clamp': this.descriptionLines,
				'line-clamp': this.descriptionLines,
			}
		},

		activeStyles() {
			if (!this.active) return {}
			const variantMap = {
				success: { border: 'var(--color-success)', bg: 'var(--color-success-light)' },
				primary: { border: 'var(--color-primary-element)', bg: 'var(--color-primary-element-light)' },
				warning: { border: 'var(--color-warning)', bg: 'var(--color-background-dark)' },
				error: { border: 'var(--color-error)', bg: 'var(--color-background-dark)' },
				info: { border: 'var(--color-info)', bg: 'var(--color-background-dark)' },
			}
			const colors = variantMap[this.activeVariant] || variantMap.success
			return {
				'--cn-card-active-border': colors.border,
				'--cn-card-active-bg': colors.bg,
			}
		},
	},

	methods: {
		onClick(event) {
			if (this.clickable) {
				this.$emit('click', event)
			}
		},
	},
}
</script>

<style scoped lang="scss">
.cn-card {
	padding: 16px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
	height: 100%;
	display: flex;
	flex-direction: column;
}

.cn-card--active {
	border: 2px solid var(--cn-card-active-border);
	background: var(--cn-card-active-bg);
}

.cn-card--clickable {
	cursor: pointer;
	transition: box-shadow 0.2s ease, border-color 0.2s ease;

	&:hover {
		border-color: var(--color-primary-element);
		box-shadow: 0 2px 8px var(--color-box-shadow);
	}
}

.cn-card__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	border-bottom: 1px solid var(--color-border);
    padding-block-end: 1rem;
    margin-block-end: 0.5rem;
}

.cn-card__title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 16px;
	margin: 0;
	flex-wrap: wrap;
}

.cn-card__title-text {
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-card__labels {
	display: inline-flex;
	gap: 4px;
	flex-wrap: wrap;
}

.cn-card__actions {
	flex-shrink: 0;
}

.cn-card__body {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.cn-card__description {
	color: var(--color-text-lighter);
	margin-bottom: 12px;
	word-wrap: break-word;
	overflow-wrap: break-word;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.cn-card__content {
	margin-bottom: 12px;
}

.cn-card__stats {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-card__stat {
	display: flex;
	justify-content: space-between;
}

.cn-card__stat-label {
	color: var(--color-text-lighter);
	font-size: 12px;
}

.cn-card__stat-value {
	font-weight: 600;
	font-size: 12px;
}
</style>
