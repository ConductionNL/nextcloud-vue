<template>
	<div class="cn-advanced-form-dialog__table-container">
		<table class="cn-advanced-form-dialog__table">
			<thead>
				<tr class="cn-advanced-form-dialog__table-row">
					<th class="cn-advanced-form-dialog__table-col-constrained">
						Property
					</th>
					<th class="cn-advanced-form-dialog__table-col-expanded">
						Value
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="([key, value]) in objectProperties"
					:key="key"
					class="cn-advanced-form-dialog__table-row"
					:class="{
						'cn-advanced-form-dialog__table-row--selected': selectedProperty === key,
						'cn-advanced-form-dialog__table-row--edited': formData[key] !== undefined,
						'cn-advanced-form-dialog__table-row--non-editable': !isPropertyEditable(key, resolvedValue(key, value)),
						[getPropertyValidationClass(key, value)]: validationDisplay === 'indicator',
					}"
					@click="handleRowClick(key, $event)">
					<td class="cn-advanced-form-dialog__table-col-constrained cn-advanced-form-dialog__prop-cell">
						<div class="cn-advanced-form-dialog__prop-cell-content">
							<AlertCircle
								v-if="validationDisplay === 'indicator' && getPropertyValidationState(key, resolvedValue(key, value)) === 'invalid'"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--error"
								:size="16"
								:title="getPropertyErrorMessage(key, resolvedValue(key, value))" />
							<Alert
								v-else-if="validationDisplay === 'indicator' && getPropertyValidationState(key, resolvedValue(key, value)) === 'warning'"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--warning"
								:size="16"
								:title="getPropertyWarningMessage(key, resolvedValue(key, value))" />
							<Plus
								v-else-if="validationDisplay === 'indicator' && getPropertyValidationState(key, resolvedValue(key, value)) === 'new'"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--new"
								:size="16"
								:title="getPropertyNewMessage(key)" />
							<LockOutline
								v-else-if="!isPropertyEditable(key, resolvedValue(key, value))"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--lock"
								:size="16"
								:title="getEditabilityWarning(key, resolvedValue(key, value)) || ''" />
							<span :title="getPropertyTooltip(key)">{{ getPropertyDisplayName(key) }}</span>
						</div>
					</td>
					<td class="cn-advanced-form-dialog__table-col-expanded cn-advanced-form-dialog__value-cell">
						<CnPropertyValueCell
							:ref="'cell-' + key"
							:property-key="key"
							:schema="schema"
							:value="resolvedValue(key, value)"
							:is-editable="isPropertyEditable(key, resolvedValue(key, value))"
							:is-editing="selectedProperty === key"
							:display-name="getPropertyDisplayName(key)"
							:editability-warning="getPropertyEditabilityWarning(key, resolvedValue(key, value))"
							@update:value="onPropertyValueUpdate(key, $event)" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import AlertCircle from 'vue-material-design-icons/AlertCircle.vue'
import Alert from 'vue-material-design-icons/Alert.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnPropertyValueCell from './CnPropertyValueCell.vue'

export default {
	name: 'CnPropertiesTab',

	components: {
		AlertCircle,
		Alert,
		LockOutline,
		Plus,
		CnPropertyValueCell,
	},

	props: {
		schema: { type: Object, default: null },
		item: { type: Object, default: null },
		formData: { type: Object, default: () => ({}) },
		selectedProperty: { type: String, default: null },
		editableTypes: { type: Array, default: () => ['string', 'number', 'integer', 'boolean'] },
		validationDisplay: { type: String, default: 'indicator' },
		excludeFields: { type: Array, default: () => [] },
		includeFields: { type: Array, default: null },
	},

	computed: {
		objectProperties() {
			const schemaProps = this.schema?.properties || {}
			const obj = this.item || {}
			const exclude = this.excludeFields || []
			const include = this.includeFields
			const filterKey = (k) => {
				if (k === '@self' || k === 'id') return false
				if (exclude.includes(k)) return false
				if (include && !include.includes(k)) return false
				return true
			}
			const existing = Object.entries(obj).filter(([k]) => filterKey(k))
			const missing = []
			for (const [key, prop] of Object.entries(schemaProps)) {
				if (!filterKey(key)) continue
				if (!Object.prototype.hasOwnProperty.call(obj, key)) {
					let def
					switch (prop.type) {
					case 'string': def = prop.const ?? ''; break
					case 'number':
					case 'integer': def = 0; break
					case 'boolean': def = false; break
					case 'array': def = []; break
					case 'object': def = {}; break
					default: def = ''
					}
					missing.push([key, def])
				}
			}
			return [...existing, ...missing]
		},
	},

	methods: {
		/**
		 * The effective value for a key: formData override or the object's own value
		 * @param {string} key Property key to resolve
		 * @param {*} objectValue Fallback value from the object
		 */
		resolvedValue(key, objectValue) {
			return this.formData[key] !== undefined ? this.formData[key] : objectValue
		},

		onPropertyValueUpdate(key, value) {
			this.$emit('update:property-value', { key, value })
		},

		isPropertyEditable(key, value) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return true
			if (prop.const !== undefined) return false
			if (prop.immutable && value != null && value !== '') return false
			const type = prop.type || 'string'
			return this.editableTypes.includes(type)
		},

		getPropertyDisplayName(key) {
			return (this.schema?.properties?.[key]?.title) || key
		},

		getPropertyTooltip(key) {
			const prop = this.schema?.properties?.[key]
			if (prop?.description) {
				if (prop.title && prop.title !== key) {
					return `${prop.title}: ${prop.description}`
				}
				return prop.description
			}
			return `Property: ${key}`
		},

		getPropertyValidationClass(key, value) {
			const state = this.getPropertyValidationState(key, value)
			switch (state) {
			case 'invalid': return 'cn-advanced-form-dialog__table-row--invalid'
			case 'warning': return 'cn-advanced-form-dialog__table-row--warning'
			case 'new': return 'cn-advanced-form-dialog__table-row--new'
			case 'valid': return 'cn-advanced-form-dialog__table-row--valid'
			default: return ''
			}
		},

		getPropertyValidationState(key, value) {
			const prop = this.schema?.properties?.[key]
			const existsInObject = this.item ? Object.prototype.hasOwnProperty.call(this.item, key) : false
			if (!prop) return 'warning'
			if (!existsInObject) return 'new'
			if (this.isValidPropertyValue(key, value, prop)) return 'valid'
			return 'invalid'
		},

		isValidPropertyValue(key, value, schemaProperty) {
			if (value === null || value === undefined || value === '') {
				const required = (this.schema?.required || []).includes(key) || schemaProperty?.required
				return !required
			}
			const type = schemaProperty?.type || 'string'
			switch (type) {
			case 'string':
				if (typeof value !== 'string') return false
				if (schemaProperty?.format === 'date-time' && !this.isValidDate(value)) return false
				if (schemaProperty?.const && value !== schemaProperty.const) return false
				return true
			case 'number':
				return typeof value === 'number' && !Number.isNaN(value)
			case 'boolean':
				return typeof value === 'boolean'
			case 'array':
				return Array.isArray(value)
			case 'object':
				return typeof value === 'object' && value !== null && !Array.isArray(value)
			default:
				return true
			}
		},

		getPropertyErrorMessage(key, value) {
			const prop = this.schema?.properties?.[key]
			if (!prop) {
				return `Property '${key}' is not defined in the current schema. This property exists in the object but is not part of the schema definition.`
			}
			const isRequired = (this.schema?.required || []).includes(key) || prop.required
			if ((value === null || value === undefined || value === '') && isRequired) {
				return `Required property '${key}' is missing or empty.`
			}
			const expectedType = prop.type
			const actualType = Array.isArray(value) ? 'array' : typeof value
			if (expectedType && expectedType !== actualType) {
				return `Property '${key}' should be ${expectedType} but is ${actualType}.`
			}
			if (prop.format === 'date-time' && !this.isValidDate(value)) {
				return `Property '${key}' should be a valid date-time value.`
			}
			if (prop.const && value !== prop.const) {
				return `Property '${key}' should be '${prop.const}' but is '${value}'.`
			}
			return `Property '${key}' has an invalid value.`
		},

		getPropertyWarningMessage(key, value) {
			const displayValue = String(value).length > 100 ? String(value).slice(0, 100) + '…' : String(value)
			return `Property '${key}' exists in the object but is not defined in the current schema. This might happen when property names are changed in the schema. Current value: '${displayValue}'.`
		},

		getPropertyNewMessage(key) {
			return `Property '${key}' is defined in the schema but doesn't have a value yet. Click to add a value.`
		},

		getPropertyEditabilityWarning(key, value) {
			if (!this.isPropertyEditable(key, value)) {
				return 'This property cannot be edited in the Properties tab. Use the Data tab to modify it.'
			}
			return null
		},

		getEditabilityWarning(key, value) {
			const prop = this.schema?.properties?.[key]
			if (prop?.const !== undefined) {
				return `This property is constant and must always be '${prop.const}'. Const properties cannot be modified to maintain data integrity.`
			}
			if (prop?.immutable && (value !== null && value !== undefined && value !== '')) {
				const displayValue = String(value).length > 100 ? String(value).slice(0, 100) + '…' : String(value)
				return `This property is immutable and cannot be changed once it has a value. Current value: '${displayValue}'. Immutable properties preserve data consistency.`
			}
			if (!this.isPropertyEditable(key, value)) {
				return this.getPropertyEditabilityWarning(key, value)
			}
			return null
		},

		handleRowClick(key, event) {
			if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.cn-advanced-form-dialog__value-input-container')) return
			const value = this.resolvedValue(key, this.objectProperties.find(([k]) => k === key)?.[1])
			if (!this.isPropertyEditable(key, value)) return
			const prop = this.schema?.properties?.[key]
			if (prop && !this.editableTypes.includes(prop.type || 'string')) return
			this.$emit('update:selected-property', key)
			this.$nextTick(() => {
				const ref = this.$refs['cell-' + key]
				const cell = ref && (Array.isArray(ref) ? ref[0] : ref)
				if (cell && cell.focus) cell.focus()
			})
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
.cn-advanced-form-dialog__table-container {
	background: var(--color-main-background);
	border-radius: var(--border-radius);
	overflow: hidden;
	box-shadow: 0 2px 4px var(--color-box-shadow);
	border: 1px solid var(--color-border);
	margin-bottom: calc(5 * var(--default-grid-baseline));
}

.cn-advanced-form-dialog__table {
	width: 100%;
	border-collapse: collapse;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table th,
.cn-advanced-form-dialog__table td {
	padding: calc(3 * var(--default-grid-baseline));
	text-align: left;
	border-bottom: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-advanced-form-dialog__table th {
	background: var(--color-background-dark);
	font-weight: 500;
	color: var(--color-text-maxcontrast);
}

.cn-advanced-form-dialog__table-row {
	cursor: pointer;
	transition: background-color 0.2s ease;
	background-color: var(--color-main-background);
}

.cn-advanced-form-dialog__table-row:hover {
	background-color: var(--color-background-hover);
}

/* Active/selected row: light blue; ensure it wins over validation state classes */
.cn-advanced-form-dialog__table-row.cn-advanced-form-dialog__table-row--selected,
.cn-advanced-form-dialog__table-row--selected:hover {
	background-color: var(--color-primary-light);
	box-shadow: inset 3px 0 0 0 var(--color-primary);
}

.cn-advanced-form-dialog__table-row--edited {
	background-color: var(--color-success-light);
	box-shadow: inset 3px 0 0 0 var(--color-success);
}

.cn-advanced-form-dialog__table-row--non-editable {
	background-color: var(--color-background-dark);
	cursor: not-allowed;
	opacity: 0.7;
}

.cn-advanced-form-dialog__table-row--non-editable * {
	cursor: not-allowed !important;
}

.cn-advanced-form-dialog__table-row--valid {
	box-shadow: inset 3px 0 0 0 var(--color-success);
}

.cn-advanced-form-dialog__table-row--invalid {
	background-color: var(--color-error-light);
	box-shadow: inset 3px 0 0 0 var(--color-error);
}

.cn-advanced-form-dialog__table-row--warning {
	background-color: var(--color-warning-light);
	box-shadow: inset 3px 0 0 0 var(--color-warning);
}

.cn-advanced-form-dialog__table-row--new {
	box-shadow: inset 3px 0 0 0 var(--color-primary-element);
}

.cn-advanced-form-dialog__table-col-constrained {
	width: 150px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-advanced-form-dialog__table-col-expanded {
	width: auto;
	min-width: 200px;
}

.cn-advanced-form-dialog__prop-cell {
	width: 30%;
	font-weight: 600;
	box-shadow: inset 3px 0 0 0 var(--color-primary);
}

.cn-advanced-form-dialog__value-cell {
	width: 70%;
	word-break: break-word;
	border-radius: 4px;
}

.cn-advanced-form-dialog__prop-cell-content {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-advanced-form-dialog__validation-icon {
	flex-shrink: 0;
}

.cn-advanced-form-dialog__validation-icon--error {
	color: var(--color-error);
}

.cn-advanced-form-dialog__validation-icon--warning {
	color: var(--color-warning);
}

.cn-advanced-form-dialog__validation-icon--lock {
	color: var(--color-text-lighter);
}

.cn-advanced-form-dialog__validation-icon--new {
	color: var(--color-primary-element);
}
</style>
