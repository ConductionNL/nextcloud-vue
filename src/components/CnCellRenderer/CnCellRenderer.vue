<template>
	<span class="cn-cell-renderer" :class="cellClass">
		<!-- Consumer-registered cell widget (cnCellWidgets[column.widget]) -->
		<component
			:is="widgetComponent"
			v-if="widgetComponent"
			:value="value"
			:row="row"
			:property="property"
			:formatted="formattedValue"
			v-bind="widgetProps" />

		<!-- Built-in "badge" widget — renders the (possibly formatter-shaped) value as a status pill -->
		<template v-else-if="widget === 'badge'">
			<CnStatusBadge v-if="hasValue" :label="String(formattedValue)" :variant="badgeVariant" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Explicit column formatter — overrides the type-aware paths below -->
		<template v-else-if="hasFormatter">
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>

		<!-- Boolean: icon -->
		<template v-else-if="propertyType === 'boolean'">
			<CheckBold v-if="value" :size="16" class="cn-cell-renderer__icon cn-cell-renderer__icon--success" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Enum: status badge -->
		<template v-else-if="isEnum">
			<CnStatusBadge v-if="value" :label="String(value)" />
			<span v-else class="cn-cell-renderer__dash">—</span>
		</template>

		<!-- Array: comma-joined or count -->
		<template v-else-if="propertyType === 'array'">
			<span v-if="!value || !value.length" class="cn-cell-renderer__dash">—</span>
			<span v-else :title="Array.isArray(value) ? value.join(', ') : ''">
				{{ formattedValue }}
			</span>
		</template>

		<!-- Default: formatted text -->
		<template v-else>
			<span :title="rawTitle">{{ formattedValue }}</span>
		</template>
	</span>
</template>

<script>
import { formatValue } from '../../utils/schema.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'
import CheckBold from 'vue-material-design-icons/CheckBold.vue'

/**
 * CnCellRenderer — Type-aware cell renderer for schema-driven tables.
 *
 * Renders a single cell value based on its schema property definition.
 * Booleans render as icons, enums as status badges, dates as formatted strings,
 * and everything else as truncated text via `formatValue()`.
 *
 * ```vue
 * <CnCellRenderer :value="row.status" :property="schema.properties.status" />
 * ```
 */
export default {
	name: 'CnCellRenderer',

	components: {
		CnStatusBadge,
		CheckBold,
	},

	inject: {
		/**
		 * Cell-formatter registry, provided by CnAppRoot (`cnFormatters`).
		 * Map of formatter-id → `(value, row, property) => string|number`.
		 * Defaults to an empty object so standalone use (no CnAppRoot
		 * ancestor) is unaffected.
		 */
		cnFormatters: { default: () => ({}) },
		/**
		 * Cell-widget registry, provided by CnAppRoot (`cnCellWidgets`).
		 * Map of widget-id → Vue component. Resolves a column's `widget` id;
		 * the built-in `"badge"` is handled inline (no registry entry needed).
		 * Defaults to an empty object.
		 */
		cnCellWidgets: { default: () => ({}) },
	},

	props: {
		/** The raw cell value */
		value: {
			type: [String, Number, Boolean, Array, Object],
			default: null,
		},
		/** Schema property definition: { type, format, enum, items, title } */
		property: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Optional cell-formatter id (e.g. `currency`, `automationTrigger`).
		 * When set and resolvable in the injected `cnFormatters` registry,
		 * the cell renders `cnFormatters[formatter](value, row, property)`
		 * as text — an explicit override of the type-aware rendering below.
		 */
		formatter: {
			type: String,
			default: null,
		},
		/**
		 * Optional cell-widget id (e.g. `badge`, or a consumer-registered
		 * name). When it resolves in `cnCellWidgets` the cell renders that
		 * component with `{ value, row, property, formatted, ...widgetProps }`;
		 * the built-in id `"badge"` renders `CnStatusBadge`. Takes precedence
		 * over `formatter`/the type-aware rendering, but the value handed to
		 * the widget is the formatter-shaped `formatted` when `formatter` is
		 * also set.
		 */
		widget: {
			type: String,
			default: null,
		},
		/** Extra props spread onto the resolved cell-widget component. */
		widgetProps: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * The full row object — passed so a formatter can be a function of
		 * the whole record (e.g. "days since `@self.updated`"), not just
		 * this one cell value.
		 */
		row: {
			type: Object,
			default: () => ({}),
		},
		/** Maximum string length before truncation */
		truncate: {
			type: Number,
			default: 100,
		},
	},

	computed: {
		propertyType() {
			return this.property?.type || (typeof this.value)
		},

		isEnum() {
			return !!(this.property?.enum && this.property.enum.length > 0)
		},

		/** True when the cell has a renderable value (not null/undefined/empty string). */
		hasValue() {
			return this.value !== null && this.value !== undefined && this.value !== ''
		},

		/**
		 * Resolved cell-widget component for this column, or `null`. A column's
		 * `widget` id resolves against the injected `cnCellWidgets` registry;
		 * the built-in `"badge"` is NOT resolved here (handled inline in the
		 * template) so apps can still override `"badge"` via the registry.
		 *
		 * @return {object|Function|null}
		 */
		widgetComponent() {
			if (!this.widget) return null
			const c = this.cnCellWidgets && this.cnCellWidgets[this.widget]
			return c || null
		},

		/** Variant for the built-in `badge` widget — `widgetProps.variant` or `'default'`. */
		badgeVariant() {
			return (this.widgetProps && this.widgetProps.variant) || 'default'
		},

		/**
		 * Resolved formatter function for this cell, or `null`. A column's
		 * `formatter` id resolves against the injected `cnFormatters` registry.
		 *
		 * @return {Function|null}
		 */
		formatterFn() {
			const fn = this.formatter && this.cnFormatters && this.cnFormatters[this.formatter]
			return typeof fn === 'function' ? fn : null
		},

		/** True when an explicit formatter is in play for this cell. */
		hasFormatter() {
			return this.formatterFn !== null
		},

		formattedValue() {
			if (this.formatterFn) {
				try {
					return this.formatterFn(this.value, this.row, this.property)
				} catch (e) {
					// eslint-disable-next-line no-console
					console.warn(`[CnCellRenderer] formatter "${this.formatter}" threw; falling back`, e)
				}
			}
			return formatValue(this.value, this.property, { truncate: this.truncate })
		},

		rawTitle() {
			// Show full value on hover if it was truncated
			const raw = this.value
			if (typeof raw === 'string' && raw.length > this.truncate) {
				return raw
			}
			return undefined
		},

		cellClass() {
			const classes = []
			if (this.propertyType === 'boolean') classes.push('cn-cell-renderer--boolean')
			if (this.isEnum) classes.push('cn-cell-renderer--enum')
			if (this.property?.format === 'date-time' || this.property?.format === 'date') {
				classes.push('cn-cell-renderer--date')
			}
			if (this.property?.format === 'uuid') classes.push('cn-cell-renderer--uuid')
			if (this.propertyType === 'integer' || this.propertyType === 'number') {
				classes.push('cn-cell-renderer--number')
			}
			return classes
		},
	},
}
</script>

<style scoped>
.cn-cell-renderer--uuid {
	font-family: monospace;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer--number {
	font-variant-numeric: tabular-nums;
}

.cn-cell-renderer--date {
	white-space: nowrap;
}

.cn-cell-renderer__dash {
	color: var(--color-text-maxcontrast);
}

.cn-cell-renderer__icon--success {
	color: var(--color-success);
}
</style>
