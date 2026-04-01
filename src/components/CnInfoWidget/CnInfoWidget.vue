<!--
  CnInfoWidget — Renders label-value pairs in a responsive CSS grid.

  Supports two modes:
  1. Manual: provide `fields` prop with `[{ label, value }]` objects
  2. Auto-generated: provide `object` + `schema` props to generate from JSON Schema properties

  Used in dashboard and detail page grid layouts to display entity metadata.
-->
<template>
	<div
		class="cn-info-widget"
		:style="gridStyle">
		<div
			v-for="(field, index) in displayFields"
			:key="index"
			class="cn-info-widget__field">
			<dt class="cn-info-widget__label">
				{{ field.label }}
			</dt>
			<dd class="cn-info-widget__value">
				{{ field.value || '—' }}
			</dd>
		</div>
	</div>
</template>

<script>
/**
 * CnInfoWidget — Renders label-value pairs in a responsive CSS grid.
 *
 * @example Manual fields
 * <CnInfoWidget :fields="[
 *   { label: 'Email', value: 'test@example.com' },
 *   { label: 'Phone', value: '+31 6 12345678' },
 * ]" :columns="2" />
 *
 * @example Auto-generated from schema
 * <CnInfoWidget :object="myObject" :schema="mySchema" :columns="3" />
 */
export default {
	name: 'CnInfoWidget',

	props: {
		/**
		 * Manual field definitions. Array of `{ label, value }` objects.
		 * Takes precedence over object+schema auto-generation.
		 *
		 * @type {{ label: string, value: string|number }[]}
		 */
		fields: {
			type: Array,
			default: null,
		},
		/**
		 * Object data for auto-generation mode. Properties are extracted
		 * based on the schema definition.
		 *
		 * @type {object}
		 */
		object: {
			type: Object,
			default: null,
		},
		/**
		 * JSON Schema for auto-generation mode. Each schema property
		 * generates a label:value pair using the property title as label.
		 *
		 * @type {object}
		 */
		schema: {
			type: Object,
			default: null,
		},
		/**
		 * Number of columns for the grid layout.
		 *
		 * @type {number}
		 */
		columns: {
			type: Number,
			default: 2,
		},
		/**
		 * Fields to include (by key). If provided, only these fields are shown.
		 * Only applies in auto-generation mode.
		 *
		 * @type {string[]}
		 */
		includeFields: {
			type: Array,
			default: null,
		},
		/**
		 * Fields to exclude (by key). Only applies in auto-generation mode.
		 *
		 * @type {string[]}
		 */
		excludeFields: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		/**
		 * Resolved fields to display. Manual fields take precedence;
		 * otherwise generates from object + schema.
		 *
		 * @returns {{ label: string, value: string|number }[]}
		 */
		displayFields() {
			if (this.fields) {
				return this.fields
			}

			if (this.object && this.schema && this.schema.properties) {
				return this.generateFieldsFromSchema()
			}

			return []
		},

		/**
		 * CSS grid style based on column count.
		 *
		 * @returns {object}
		 */
		gridStyle() {
			return {
				gridTemplateColumns: `repeat(${this.columns}, 1fr)`,
			}
		},
	},

	methods: {
		/**
		 * Generate label-value field definitions from object + schema.
		 *
		 * @returns {{ label: string, value: string|number }[]}
		 */
		generateFieldsFromSchema() {
			const properties = this.schema.properties || {}
			const keys = this.includeFields || Object.keys(properties)

			return keys
				.filter(key => !this.excludeFields.includes(key))
				.filter(key => properties[key])
				.map(key => ({
					label: properties[key].title || key,
					value: this.formatFieldValue(this.object[key], properties[key]),
				}))
		},

		/**
		 * Format a field value for display based on its schema type.
		 *
		 * @param {*} value - The raw value.
		 * @param {object} schemaProp - The JSON Schema property definition.
		 * @returns {string} Formatted display value.
		 */
		formatFieldValue(value) {
			if (value === null || value === undefined) {
				return ''
			}

			if (Array.isArray(value)) {
				return value.join(', ')
			}

			if (typeof value === 'object') {
				return JSON.stringify(value)
			}

			if (typeof value === 'boolean') {
				return value ? 'Yes' : 'No'
			}

			return String(value)
		},
	},
}
</script>

<style scoped>
.cn-info-widget {
	display: grid;
	gap: 12px 24px;
}

.cn-info-widget__field {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-info-widget__label {
	font-size: 12px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin: 0;
}

.cn-info-widget__value {
	font-size: 14px;
	color: var(--color-main-text);
	margin: 0;
	word-break: break-word;
}

/* Responsive: single column on small screens */
@media (max-width: 600px) {
	.cn-info-widget {
		grid-template-columns: 1fr !important;
	}
}
</style>
