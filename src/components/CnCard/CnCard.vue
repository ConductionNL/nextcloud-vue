<template>
	<div
		class="cn-card"
		:class="rootClasses"
		:style="activeStyles"
		@click="onClick">
		<div class="cn-card__header">
			<h2 class="cn-card__title">
				<slot name="icon">
					<component :is="icon" v-if="icon" :size="iconSize" />
				</slot>
				<span ref="titleText" v-tooltip.bottom="computedTooltip" class="cn-card__title-text">{{ title }}</span>
			</h2>
			<div v-if="$slots.actions || $scopedSlots.actions" class="cn-card__actions">
				<slot name="actions" />
			</div>
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

		<!-- Footer -->
		<slot name="footer">
			<div v-if="hasFooterContent" class="cn-card__footer">
				<a
					v-for="(link, i) in footerLinks"
					:key="'link-' + i"
					:href="link.url"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-card__footer-link">
					<slot :name="'footer-link-icon-' + i" />
					{{ link.label || link.url }}
				</a>
				<CnStatusBadge
					v-for="(tag, i) in normalizedTags"
					:key="'tag-' + i"
					:label="tag.text"
					:variant="tag.variant || 'default'"
					size="small" />
			</div>
		</slot>
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
 * Basic usage
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
 * With labels and active state
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
		 * For labels with icons, use the #labels slot override and render CnStatusBadge
		 * manually with its #icon slot.
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
		/**
		 * Array of footer link objects. Each entry: { url: string, label?: string }
		 * Links are rendered as clickable anchors. Use the #footer-link-icon-{index} slot
		 * to add an icon before a specific link.
		 */
		footerLinks: {
			type: Array,
			default: () => [],
		},
		/**
		 * Array of tag items for the footer. Accepts either strings or objects.
		 * String entries are converted to { text: string, variant: 'default' }.
		 * Object entries: { text: string, variant?: string }
		 */
		tags: {
			type: Array,
			default: () => [],
		},
	},

	data() {
		return {
			isTitleEllipsized: false,
		}
	},

	computed: {
		computedTooltip() {
			if (this.titleTooltip) return this.titleTooltip
			return this.isTitleEllipsized ? this.title : ''
		},

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

		normalizedTags() {
			return this.tags.map(tag =>
				typeof tag === 'string' ? { text: tag, variant: 'default' } : tag,
			)
		},

		hasFooterContent() {
			return this.footerLinks.length > 0 || this.tags.length > 0
		},

		activeStyles() {
			if (!this.active) return {}
			const variantMap = {
				success: 'var(--color-success)',
				primary: 'var(--color-primary-element)',
				warning: 'var(--color-warning)',
				error: 'var(--color-error)',
				info: 'var(--color-info)',
			}
			return {
				'--cn-card-active-border': variantMap[this.activeVariant] || variantMap.success,
			}
		},
	},

	mounted() {
		this.checkTitleEllipsis()
		this._resizeObserver = new ResizeObserver(() => this.checkTitleEllipsis())
		this._resizeObserver.observe(this.$el)
	},

	beforeDestroy() {
		if (this._resizeObserver) {
			this._resizeObserver.disconnect()
		}
	},

	methods: {
		onClick(event) {
			if (this.clickable) {
				this.$emit('click', event)
			}
		},

		checkTitleEllipsis() {
			const el = this.$refs.titleText
			this.isTitleEllipsized = el ? el.scrollWidth > el.clientWidth : false
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
	display: grid;
	grid-template-columns: 1fr auto;
	grid-template-rows: auto auto;
	align-items: center;
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
	min-width: 0;
}

.cn-card__title-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-card__labels {
	grid-column: 1 / -1;
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	margin-top: 6px;
}

.cn-card__actions {
	flex-shrink: 0;
	margin-inline-start: 0.25rem;
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

.cn-card__footer {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	padding-top: 8px;
	margin-top: 8px;
	border-top: 1px solid var(--color-border);
}

.cn-card__footer-link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.85em;
	color: var(--color-primary-element);
	text-decoration: none;
	transition: color 0.2s;

	&:hover {
		text-decoration: underline;
	}
}
</style>
