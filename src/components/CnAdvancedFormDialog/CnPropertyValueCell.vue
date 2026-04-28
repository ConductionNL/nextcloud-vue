<template>
	<!-- Edit mode -->
	<div
		v-if="isEditable && (resolvedWidget === 'boolean' || isEditing)"
		class="cn-advanced-form-dialog__value-input-container"
		@click.stop>
		<div
			v-if="resolvedWidget === 'boolean'"
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
			v-else-if="resolvedWidget === 'datetime'"
			:value="value"
			:type="inputType"
			:label="displayName"
			@update:value="emit($event)" />
		<NcTextArea
			v-else-if="resolvedWidget === 'textarea'"
			ref="inputRef"
			:value="stringValue"
			:placeholder="displayName"
			:rows="textareaRows"
			@update:value="emit($event)" />
		<div
			v-else-if="resolvedWidget === 'array'"
			class="cn-advanced-form-dialog__array-input-row">
			<NcTextField
				ref="inputRef"
				:value="arrayStringValue"
				:placeholder="displayName"
				@update:value="emitArray($event)" />
			<InformationOutline
				v-tooltip="t('nextcloud-vue', 'Array values should be separated by commas')"
				class="cn-advanced-form-dialog__info-icon"
				:size="16" />
		</div>
		<NcSelect
			v-else-if="resolvedWidget === 'select'"
			:value="selectValue"
			:options="selectOptions || []"
			:multiple="selectMultiple"
			:input-label="displayName"
			:placeholder="displayName"
			@input="emitSelect($event)" />
		<CnJsonViewer
			v-else-if="resolvedWidget === 'object'"
			:value="objectJsonString"
			:height="objectEditorHeight"
			language="json"
			@update:value="emitObject($event)" />
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
			v-else-if="resolvedWidget === 'datetime' && isValidDate(value)">{{
			new Date(value).toLocaleString()
		}}</span>
		<span v-else>{{ displayValue }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcTextField,
	NcTextArea,
	NcCheckboxRadioSwitch,
	NcDateTimePickerNative,
	NcSelect,
} from '@nextcloud/vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip.js'
import { formatValue } from '../../utils/schema.js'
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'

const SUPPORTED_WIDGETS = ['text', 'number', 'boolean', 'datetime', 'textarea', 'array', 'select', 'object']

/** String formats that map to HTML5 `<input type="url">`. */
const URL_FORMATS = new Set([
	'url', 'uri', 'uri-reference', 'iri', 'iri-reference', 'uri-template',
	'accessUrl', 'shareUrl', 'downloadUrl',
])

/** String formats that should render with HTML5 `<input type="color">`. */
const COLOR_FORMATS = new Set(['color', 'color-hex', 'color-hex-alpha'])

export default {
	name: 'CnPropertyValueCell',

	directives: { tooltip: Tooltip },

	components: {
		NcTextField,
		NcTextArea,
		NcCheckboxRadioSwitch,
		NcDateTimePickerNative,
		NcSelect,
		InformationOutline,
		CnJsonViewer,
	},

	props: {
		/** The schema property key */
		propertyKey: { type: String, required: true },
		/** Full JSON schema object */
		schema: { type: Object, default: null },
		/** Resolved current value (formData[key] ?? objectValue) */
		value: { type: [String, Number, Boolean, Object, Array], default: null },
		/** Whether this property is editable at all */
		isEditable: { type: Boolean, default: true },
		/** Whether this row is currently selected for editing */
		isEditing: { type: Boolean, default: false },
		/** Display name for the property (used in labels/placeholders) */
		displayName: { type: String, default: '' },
		/** Editability warning message shown as title when not editable */
		editabilityWarning: { type: String, default: null },
		/**
		 * Override the auto-detected widget for this cell. When null (default),
		 * the widget is derived from the schema (boolean/datetime/text/number),
		 * with auto-detection for `format: 'text'` (textarea) and `type: 'array'`.
		 * Accepted: 'text', 'number', 'boolean', 'datetime', 'textarea', 'array', 'select'.
		 */
		widget: {
			type: String,
			default: null,
			validator: (v) => v === null || SUPPORTED_WIDGETS.includes(v),
		},
		/** Options for the `select` widget. Each option may be a string, or `{ id, label }`. */
		selectOptions: { type: Array, default: null },
		/** Whether the `select` widget allows multiple values. */
		selectMultiple: { type: Boolean, default: true },
		/** Number of rows for the `textarea` widget. */
		textareaRows: { type: Number, default: 4 },
		/** CSS height for the `object` widget's CodeMirror editor. */
		objectEditorHeight: { type: String, default: '300px' },
	},

	computed: {
		schemaProp() {
			return this.schema?.properties?.[this.propertyKey] || null
		},

		/**
		 * Resolved widget after applying explicit override + schema auto-detection.
		 * @return {string} one of SUPPORTED_WIDGETS
		 */
		resolvedWidget() {
			if (this.widget) return this.widget
			const prop = this.schemaProp
			if (!prop) return 'text'
			if (prop.type === 'boolean') return 'boolean'
			if (prop.type === 'array') return 'array'
			if (prop.type === 'object') return 'object'
			if (prop.type === 'string') {
				if (['date', 'time', 'date-time'].includes(prop.format)) return 'datetime'
				if (prop.format === 'text' || prop.format === 'html') return 'textarea'
			}
			if (prop.type === 'number' || prop.type === 'integer') return 'number'
			return 'text'
		},

		inputType() {
			const prop = this.schemaProp
			if (!prop) return 'text'
			const fmt = prop.format || ''
			if (prop.type === 'string') {
				if (fmt === 'date') return 'date'
				if (fmt === 'time') return 'time'
				if (fmt === 'date-time') return 'datetime-local'
				if (fmt === 'email' || fmt === 'idn-email') return 'email'
				if (URL_FORMATS.has(fmt)) return 'url'
				if (fmt === 'password') return 'password'
				if (fmt === 'telephone') return 'tel'
				if (COLOR_FORMATS.has(fmt)) return 'color'
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

		arrayStringValue() {
			const v = this.value
			if (Array.isArray(v)) return v.join(',')
			if (v == null) return ''
			return String(v)
		},

		objectJsonString() {
			const v = this.value
			if (v == null) return ''
			if (typeof v === 'string') return v
			try {
				return JSON.stringify(v, null, 2)
			} catch {
				return ''
			}
		},

		selectValue() {
			const v = this.value
			const opts = this.selectOptions || []
			const lookup = (id) => opts.find((o) => (typeof o === 'object' ? o.id : o) === id) || id
			if (this.selectMultiple) {
				if (!Array.isArray(v)) return []
				return v.map(lookup)
			}
			if (v == null || v === '') return null
			return lookup(v)
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
		t,

		/** Focus the underlying text input (called by parent after row click) */
		focus() {
			const ref = this.$refs.inputRef
			if (!ref) return
			const el = ref.$el || ref
			const input = el?.querySelector?.('input,textarea')
			if (input) {
				input.focus()
				if (typeof input.select === 'function') input.select()
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

		emitArray(newVal) {
			if (typeof newVal !== 'string') {
				this.$emit('update:value', newVal)
				return
			}
			const parts = newVal.split(/ *, */g).filter(Boolean)
			this.$emit('update:value', parts)
		},

		emitObject(jsonString) {
			if (typeof jsonString !== 'string') {
				this.$emit('update:value', jsonString)
				return
			}
			const trimmed = jsonString.trim()
			if (trimmed === '') {
				this.$emit('update:value', null)
				return
			}
			try {
				this.$emit('update:value', JSON.parse(trimmed))
			} catch {
				// Invalid JSON: keep the raw string so the user sees what they typed.
				// CnJsonViewer surfaces a parse error inline; the parent's save path
				// can refuse non-object values if it requires structured data.
				this.$emit('update:value', jsonString)
			}
		},

		emitSelect(selected) {
			const toId = (item) => (item && typeof item === 'object' ? item.id : item)
			if (this.selectMultiple) {
				const arr = Array.isArray(selected) ? selected : []
				this.$emit('update:value', arr.map(toId))
				return
			}
			this.$emit('update:value', selected == null ? null : toId(selected))
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

.cn-advanced-form-dialog__array-input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-advanced-form-dialog__array-input-row > :first-child {
	flex: 1;
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
