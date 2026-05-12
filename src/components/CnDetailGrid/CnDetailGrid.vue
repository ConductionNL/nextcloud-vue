<!--
  CnDetailGrid — Data-driven label-value grid for detail/info sections.

  Supports two layout modes:
  - grid (default): Responsive card grid with label stacked above value
  - horizontal: Vertical list of rows with label on left, value on right

  Items can be data-driven via the `items` prop, or customized per-item
  via named scoped slots (#item-{index}, #label-{index}, #item-actions-{index}).
-->
<template>
	<div
		class="cn-detail-grid"
		:class="rootClasses"
		:style="rootStyles">
		<!-- Empty state -->
		<div v-if="!items.length && !$scopedSlots.default" class="cn-detail-grid__empty">
			<slot name="empty">
				{{ emptyLabel }}
			</slot>
		</div>

		<!-- Data-driven items -->
		<div
			v-for="(item, index) in items"
			:key="index"
			class="cn-detail-grid__item"
			:class="itemClasses">
			<!-- Label -->
			<div class="cn-detail-grid__label">
				<slot :name="'label-' + index" :item="item" :index="index">
					{{ item.label }}
				</slot>
			</div>

			<!-- Value -->
			<div class="cn-detail-grid__value">
				<slot :name="'item-' + index" :item="item" :index="index">
					<!-- referenceType (AD-18): render the integration's
					     single-entity widget instead of a raw value. A
					     consumer-supplied #item-<index> slot still wins. -->
					<component
						:is="resolveReferenceWidget(item)"
						v-if="resolveReferenceWidget(item)"
						v-bind="referenceWidgetProps(item)" />
					<template v-else>
						{{ item.value !== undefined && item.value !== null ? item.value : '-' }}
					</template>
				</slot>
			</div>

			<!-- Optional per-item actions -->
			<div v-if="$scopedSlots['item-actions-' + index]" class="cn-detail-grid__actions">
				<slot :name="'item-actions-' + index" :item="item" :index="index" />
			</div>
		</div>

		<!-- Append slot for manual items -->
		<slot />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

/**
 * CnDetailGrid — Data-driven label-value grid for detail/info sections.
 *
 * Simple data-driven grid
 * ```vue
 * <CnDetailGrid :items="[
 *   { label: 'ID', value: '12345' },
 *   { label: 'Status', value: 'Active' },
 *   { label: 'Created', value: '2024-01-15' },
 * ]" />
 * ```
 *
 * Grid with custom slot content
 * ```vue
 * <CnDetailGrid :items="[
 *   { label: 'ID', value: item.id },
 *   { label: 'Action' },
 * ]">
 *   <template #item-1>
 *     <CnStatusBadge :label="item.action" />
 *   </template>
 * </CnDetailGrid>
 * ```
 *
 * Horizontal row layout
 * ```vue
 * <CnDetailGrid layout="horizontal" :items="fields" />
 * ```
 */
export default {
	name: 'CnDetailGrid',

	setup() {
		// Pluggable integration registry — used to render items that
		// declare `referenceType: '<integration-id>'` (AD-18) via the
		// integration's single-entity widget. Cheap when no such
		// items exist.
		const { resolveWidget, getById } = useIntegrationRegistry()
		return {
			resolveRegistryWidget: resolveWidget,
			getRegistryIntegration: getById,
		}
	},

	props: {
		/**
		 * Array of detail items to render.
		 *
		 * An item may carry `referenceType: '<integration-id>'` (AD-18)
		 * to render the integration's single-entity widget for its
		 * value instead of a plain string; `value` then acts as the
		 * widget's input value.
		 *
		 * @type {Array<{ label: string, value: string|number, referenceType?: string }>}
		 */
		items: {
			type: Array,
			default: () => [],
		},
		/**
		 * Object context forwarded to integration single-entity
		 * widgets rendered for items that declare a `referenceType`:
		 * `{ register, schema, objectId }`. Optional.
		 *
		 * @type {object|null}
		 */
		referenceContext: {
			type: Object,
			default: null,
		},
		/**
		 * Layout mode.
		 * - 'grid': Responsive card grid, label stacked above value
		 * - 'horizontal': Vertical list of rows, label on left, value on right
		 */
		layout: {
			type: String,
			default: 'grid',
			validator: (v) => ['grid', 'horizontal'].includes(v),
		},
		/**
		 * Number of fixed grid columns. Set to 0 (default) for responsive auto-fit.
		 * Only applies to layout="grid".
		 */
		columns: {
			type: Number,
			default: 0,
		},
		/**
		 * Minimum width (px) for auto-fit grid items.
		 * Only applies when columns is 0 and layout is 'grid'.
		 */
		minItemWidth: {
			type: Number,
			default: 250,
		},
		/**
		 * Minimum width (px) for labels in horizontal mode.
		 */
		labelWidth: {
			type: Number,
			default: 150,
		},
		/**
		 * Whether to show the left accent border on items.
		 */
		accent: {
			type: Boolean,
			default: true,
		},
		/**
		 * Text shown when the items array is empty.
		 */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No details available'),
		},
	},

	computed: {
		rootClasses() {
			return {
				'cn-detail-grid--grid': this.layout === 'grid',
				'cn-detail-grid--horizontal': this.layout === 'horizontal',
				'cn-detail-grid--accent': this.accent,
			}
		},
		rootStyles() {
			if (this.layout === 'grid') {
				if (this.columns > 0) {
					return { 'grid-template-columns': `repeat(${this.columns}, 1fr)` }
				}
				return { 'grid-template-columns': `repeat(auto-fit, minmax(${this.minItemWidth}px, 1fr))` }
			}
			if (this.layout === 'horizontal') {
				return { '--cn-detail-grid-label-width': this.labelWidth + 'px' }
			}
			return {}
		},
		itemClasses() {
			return {
				'cn-detail-grid__item--horizontal': this.layout === 'horizontal',
			}
		},
	},

	methods: {
		/**
		 * Resolve an item's reference integration widget, if any.
		 * Returns the integration's single-entity widget component
		 * (AD-19 fallback to its main `widget`) when the item declares
		 * a `referenceType` mapping to a registered integration; null
		 * otherwise.
		 *
		 * @param {object} item A detail item.
		 * @return {object|null} Vue component, or null.
		 */
		resolveReferenceWidget(item) {
			if (!item || typeof item.referenceType !== 'string' || item.referenceType === '') {
				return null
			}
			if (typeof this.getRegistryIntegration === 'function' && this.getRegistryIntegration(item.referenceType) === null) {
				return null
			}
			return this.resolveRegistryWidget(item.referenceType, 'single-entity')
		},

		/**
		 * Props passed to a reference integration widget: the item's
		 * value, the rendering surface, the item itself, and the
		 * object context (from `referenceContext`).
		 *
		 * @param {object} item A detail item.
		 * @return {object} Props object for the widget component.
		 */
		referenceWidgetProps(item) {
			return {
				surface: 'single-entity',
				value: item.value,
				item,
				...(this.referenceContext || {}),
			}
		},
	},
}
</script>

<style scoped>
/* ===== Grid layout (default) ===== */
.cn-detail-grid--grid {
	display: grid;
	gap: calc(4 * var(--default-grid-baseline, 4px));
}

/* ===== Horizontal layout ===== */
.cn-detail-grid--horizontal {
	display: flex;
	flex-direction: column;
	gap: calc(3 * var(--default-grid-baseline, 4px));
}

/* ===== Item (card style) ===== */
.cn-detail-grid__item {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline, 4px);
	padding: calc(2 * var(--default-grid-baseline, 4px)) calc(3 * var(--default-grid-baseline, 4px));
	background: var(--color-background-hover);
	border-radius: 0 var(--border-radius) var(--border-radius) 0;
}

/* Accent border */
.cn-detail-grid--accent .cn-detail-grid__item {
	border-left: 3px solid var(--color-primary-element);
}

/* Horizontal item: row direction */
.cn-detail-grid__item--horizontal {
	flex-direction: row;
	align-items: center;
	gap: calc(4 * var(--default-grid-baseline, 4px));
	border-radius: var(--border-radius);
}

/* ===== Label ===== */
.cn-detail-grid__label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	font-weight: 500;
}

.cn-detail-grid--horizontal .cn-detail-grid__label {
	min-width: var(--cn-detail-grid-label-width, 150px);
	flex-shrink: 0;
}

/* ===== Value ===== */
.cn-detail-grid__value {
	font-size: 1em;
	color: var(--color-main-text);
	word-break: break-word;
	margin: 0.5rem;
}

.cn-detail-grid--horizontal .cn-detail-grid__value {
	flex: 1;
}

/* ===== Actions ===== */
.cn-detail-grid__actions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

/* ===== Empty state ===== */
.cn-detail-grid__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
	.cn-detail-grid--grid {
		grid-template-columns: 1fr !important;
	}

	.cn-detail-grid__item--horizontal {
		flex-direction: column;
		align-items: flex-start;
	}
}
</style>
