<template>
	<!-- Edit mode -->
	<div
		v-if="isEditable && (inputComponent === 'NcCheckboxRadioSwitch' || isEditing)"
		class="cn-advanced-form-dialog__value-input-container"
		@click.stop>
		<div
			v-if="inputComponent === 'NcCheckboxRadioSwitch'"
			class="cn-advanced-form-dialog__boolean-input-row">
			<NcCheckboxRadioSwitch
				:checked="value"
				type="switch"
				class="cn-advanced-form-dialog__boolean-input-row__input"
				@update:checked="emit($event)">
				{{ displayName }}
			</NcCheckboxRadioSwitch>
			<InformationOutline
				v-if="schemaProp && schemaProp.description"
				v-tooltip="schemaProp.description"
				class="cn-advanced-form-dialog__info-icon"
				:size="16" />
		</div>
		<NcDateTimePickerNative
			v-else-if="inputComponent === 'NcDateTimePickerNative'"
			:value="value"
			:type="inputType"
			:label="displayName"
			@update:value="emit($event)" />
		<NcTextField
			v-else
			ref="inputRef"
			:value="stringValue"
			:type="inputType"
			:placeholder="displayName"
			:min="minimum"
			:max="maximum"
			:step="step"
			@update:value="emitConverted($event)" />
	</div>

	<!-- Display mode -->
	<div
		v-else
		:title="editabilityWarning">
		<pre
			v-if="typeof value === 'object' && value !== null"
			class="cn-advanced-form-dialog__json-value">{{ formattedObjectValue }}</pre>
		<span
			v-else-if="inputComponent === 'NcDateTimePickerNative' && isValidDate(value)">{{
			new Date(value).toLocaleString()
		}}</span>
		<span v-else>{{ displayValue }}</span>
	</div>
</template>

<script>
import {
	NcTextField,
	NcCheckboxRadioSwitch,
	NcDateTimePickerNative,
} from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip.js'
import { formatValue } from '../../utils/schema.js'

export default {
	name: 'CnPropertyValueCell',

	directives: { tooltip: Tooltip },

	components: {
		NcTextField,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		InformationOutline,
	},

	props: {
		/** The schema property key */
		propertyKey: { type: String, required: true },
		/** Full JSON schema object */
		schema: { type: Object, default: null },
		/** Resolved current value (formData[key] ?? objectValue) */
		value: { default: null },
		/** Whether this property is editable at all */
		isEditable: { type: Boolean, default: true },
		/** Whether this row is currently selected for editing */
		isEditing: { type: Boolean, default: false },
		/** Display name for the property (used in labels/placeholders) */
		displayName: { type: String, default: '' },
		/** Editability warning message shown as title when not editable */
		editabilityWarning: { type: String, default: null },
	},

	computed: {
		schemaProp() {
			return this.schema?.properties?.[this.propertyKey] || null
		},

		inputComponent() {
			const prop = this.schemaProp
			if (!prop) return 'NcTextField'
			if (prop.type === 'boolean') return 'NcCheckboxRadioSwitch'
			if (prop.type === 'string' && ['date', 'time', 'date-time'].includes(prop.format)) {
				return 'NcDateTimePickerNative'
			}
			return 'NcTextField'
		},

		inputType() {
			const prop = this.schemaProp
			if (!prop) return 'text'
			const fmt = prop.format || ''
			if (prop.type === 'string') {
				if (fmt === 'date') return 'date'
				if (fmt === 'time') return 'time'
				if (fmt === 'date-time') return 'datetime-local'
				if (fmt === 'email') return 'email'
				if (fmt === 'url' || fmt === 'uri') return 'url'
			}
			if (prop.type === 'number' || prop.type === 'integer') return 'number'
			return 'text'
		},

		minimum() {
			return this.schemaProp?.minimum
		},

		maximum() {
			return this.schemaProp?.maximum
		},

		step() {
			const prop = this.schemaProp
			if (prop?.type === 'integer') return '1'
			if (prop?.type === 'number') return 'any'
			return undefined
		},

		stringValue() {
			const v = this.value
			if (v == null) return ''
			if (typeof v === 'string') return v
			if (typeof v === 'object') return JSON.stringify(v)
			return String(v)
		},

		formattedObjectValue() {
			return formatValue(this.value, this.schemaProp || {})
		},

		displayValue() {
			const prop = this.schemaProp
			if (prop?.const !== undefined) return prop.const
			const v = this.value
			if (v === null || v === undefined || v === '') return '—'
			return formatValue(v, prop || {})
		},
	},

	methods: {
		/** Focus the underlying text input (called by parent after row click) */
		focus() {
			const ref = this.$refs.inputRef
			if (!ref) return
			const input = ref.$el?.querySelector('input')
			if (input) {
				input.focus()
				input.select()
			}
		},

		emit(newVal) {
			this.$emit('update:value', newVal)
		},

		emitConverted(newVal) {
			const prop = this.schemaProp
			let converted = newVal
			if (prop) {
				switch (prop.type) {
				case 'number':
					converted = newVal === '' ? null : parseFloat(newVal)
					if (Number.isNaN(converted)) converted = null
					break
				case 'integer':
					converted = newVal === '' ? null : parseInt(newVal, 10)
					if (Number.isNaN(converted)) converted = null
					break
				case 'boolean':
					converted = Boolean(newVal)
					break
				default:
					converted = newVal
				}
			}
			this.$emit('update:value', converted)
		},

		isValidDate(v) {
			if (!v) return false
			const d = new Date(v)
			return d instanceof Date && !Number.isNaN(d.getTime())
		},
	},
}
</script>

<style scoped>
.cn-advanced-form-dialog__value-input-container :deep(.text-field) {
	margin: 0;
	padding: 0;
}

.cn-advanced-form-dialog__boolean-input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

/* patch extreme size in field */
.cn-advanced-form-dialog__boolean-input-row__input > span {
	padding-left: 0;
	padding-block: 0;
}
.cn-advanced-form-dialog__boolean-input-row__input > input {
	margin: 0;
}

.cn-advanced-form-dialog__info-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
	cursor: help;
}

.cn-advanced-form-dialog__json-value {
	max-height: 200px;
	overflow-y: auto;
	white-space: pre-wrap;
	font-family: monospace;
	font-size: 12px;
	background: var(--color-background-dark);
	padding: 8px;
	border-radius: 4px;
	margin: 0;
}
</style>
