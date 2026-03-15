<template>
	<span class="cn-cell-renderer" :class="cellClass">
		<!-- Boolean: icon -->
		<template v-if="propertyType === 'boolean'">
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
 * @example
 * <CnCellRenderer :value="row.status" :property="schema.properties.status" />
 */
export default {
	name: 'CnCellRenderer',

	components: {
		CnStatusBadge,
		CheckBold,
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

		formattedValue() {
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
