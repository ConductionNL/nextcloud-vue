<template>
	<div class="cn-advanced-form-dialog__table-container">
		<table class="cn-advanced-form-dialog__table">
			<thead>
				<tr class="cn-advanced-form-dialog__table-row">
					<th class="cn-advanced-form-dialog__table-col-constrained">
						{{ t('nextcloud-vue', 'Property') }}
					</th>
					<th class="cn-advanced-form-dialog__table-col-expanded">
						{{ t('nextcloud-vue', 'Value') }}
					</th>
					<th
						v-if="hasRowActionsSlot"
						class="cn-advanced-form-dialog__table-col-actions">
						<slot name="row-actions-header" />
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
						'cn-advanced-form-dialog__table-row--edited': isValueChanged(key),
						'cn-advanced-form-dialog__table-row--non-editable': !isPropertyEditable(key, resolvedValue(key, value)),
						[getPropertyValidationClass(key, value)]: validationDisplay === 'indicator',
					}"
					@click="handleRowClick(key, $event)">
					<td class="cn-advanced-form-dialog__table-col-constrained cn-advanced-form-dialog__prop-cell"
						:style="getPropCellStyle(key, value)">
						<div class="cn-advanced-form-dialog__prop-cell-content">
							<AlertCircle
								v-if="validationDisplay === 'indicator' && getPropertyValidationState(key, resolvedValue(key, value)) === 'invalid'"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--error"
								:size="16"
								:title="getPropertyErrorMessage(key, resolvedValue(key, value))" />
							<Alert
								v-else-if="validationDisplay === 'indicator' && isValueChanged(key) && getPropertyValidationState(key, resolvedValue(key, value)) !== 'invalid'"
								class="cn-advanced-form-dialog__validation-icon cn-advanced-form-dialog__validation-icon--edited"
								:size="16"
								:title="t('nextcloud-vue', 'This field has been changed')" />
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
							<span
								v-if="isRequired(key)"
								class="cn-advanced-form-dialog__required-indicator"
								:title="t('nextcloud-vue', 'Required')"
								aria-label="required">*</span>
							<span
								v-if="isImmutableHint(key)"
								class="cn-advanced-form-dialog__immutable-badge"
								:title="t('nextcloud-vue', 'This value can be set on creation but cannot be changed afterwards.')">
								{{ t('nextcloud-vue', 'Set once') }}
							</span>
						</div>
					</td>
					<td class="cn-advanced-form-dialog__table-col-expanded cn-advanced-form-dialog__value-cell">
						<slot
							name="value-cell"
							:property-key="key"
							:value="value"
							:resolved-value="resolvedValue(key, value)"
							:is-editing="selectedProperty === key"
							:is-editable="isPropertyEditable(key, resolvedValue(key, value))"
							:display-name="getPropertyDisplayName(key)"
							:schema-prop="schema && schema.properties && schema.properties[key]"
							:editability-warning="getPropertyEditabilityWarning(key, resolvedValue(key, value))"
							:on-update="(v) => onPropertyValueUpdate(key, v)">
							<CnPropertyValueCell
								:ref="'cell-' + key"
								:property-key="key"
								:schema="schema"
								:value="resolvedValue(key, value)"
								:is-editable="isPropertyEditable(key, resolvedValue(key, value))"
								:is-editing="selectedProperty === key"
								:display-name="getPropertyDisplayName(key)"
								:editability-warning="getPropertyEditabilityWarning(key, resolvedValue(key, value))"
								:widget="(propertyOverrides[key] && propertyOverrides[key].widget) || null"
								:select-options="(propertyOverrides[key] && propertyOverrides[key].selectOptions) || null"
								:select-multiple="propertyOverrides[key] ? propertyOverrides[key].selectMultiple !== false : true"
								:textarea-rows="(propertyOverrides[key] && propertyOverrides[key].textareaRows) || 4"
								@update:value="onPropertyValueUpdate(key, $event)" />
						</slot>
					</td>
					<td
						v-if="hasRowActionsSlot"
						class="cn-advanced-form-dialog__table-col-actions"
						@click.stop>
						<slot
							name="row-actions"
							:property-key="key"
							:value="value"
							:resolved-value="resolvedValue(key, value)"
							:is-editable="isPropertyEditable(key, resolvedValue(key, value))"
							:is-schema-property="!!(schema && schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, key))" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
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
		editableTypes: { type: Array, default: () => ['string', 'number', 'integer', 'boolean', 'array', 'object'] },
		validationDisplay: { type: String, default: 'indicator' },
		excludeFields: { type: Array, default: () => [] },
		includeFields: { type: Array, default: null },
		/**
		 * When false (default), properties whose schema entry has `const`
		 * set are filtered out of the list — the user can't change them so
		 * they only add noise. Set to `true` to render them anyway (e.g. for
		 * debugging or admin views). `immutable` / `readOnly` properties are
		 * always rendered regardless of this flag; they're just non-editable
		 * once they have a value.
		 */
		showConstantProperties: { type: Boolean, default: false },
		/**
		 * Per-property overrides forwarded to CnPropertyValueCell. Keyed by property key.
		 * Each entry may contain: `{ widget, selectOptions, selectMultiple, textareaRows }`.
		 */
		propertyOverrides: { type: Object, default: () => ({}) },
		/**
		 * Override the left-edge indicator color on the property-name cell.
		 * When null (default) the CSS default is used (var(--color-primary)).
		 * Pass "none" to remove the indicator and let the per-row validation
		 * colors (green/yellow/red) on the <tr> show through instead.
		 * Any other CSS color string is applied directly.
		 */
		propCellColor: { type: String, default: null },
	},

	computed: {
		propCellStyle() {
			if (this.propCellColor === null) return undefined
			if (this.propCellColor === 'none') return { boxShadow: 'none' }
			return { boxShadow: `inset 3px 0 0 0 ${this.propCellColor}` }
		},
		objectProperties() {
			const schemaProps = this.schema?.properties || {}
			const obj = this.item || {}
			const exclude = this.excludeFields || []
			const include = this.includeFields
			const filterKey = (k) => {
				if (k === '@self' || k === 'id') return false
				if (exclude.includes(k)) return false
				if (include && !include.includes(k)) return false
				if (schemaProps[k]?.hideOnForm === true) return false
				return true
			}
			const existing = Object.entries(obj).filter(([k]) => filterKey(k))
			const missing = []
			for (const [key, prop] of Object.entries(schemaProps)) {
				if (!filterKey(key)) continue
				if (!Object.prototype.hasOwnProperty.call(obj, key)) {
					missing.push([key, this.defaultForProperty(prop)])
				}
			}
			const all = [...existing, ...missing]
			const filtered = this.showConstantProperties
				? all
				: all.filter(([key]) => !this.isConstantOrImmutableKey(key))
			// Sort: schema `order` ascending (0 first), unspecified last; preserve
			// schema/property declaration order as a stable tiebreaker.
			const indexFor = (key) => {
				const i = Object.keys(schemaProps).indexOf(key)
				return i === -1 ? Number.MAX_SAFE_INTEGER : i
			}
			const orderFor = (key) => {
				const o = schemaProps[key]?.order
				return typeof o === 'number' ? o : Number.MAX_SAFE_INTEGER
			}
			return filtered
				.map(([k, v], i) => ({ k, v, order: orderFor(k), idx: indexFor(k), insertion: i }))
				.sort((a, b) => (a.order - b.order) || (a.idx - b.idx) || (a.insertion - b.insertion))
				.map(({ k, v }) => [k, v])
		},

		/**
		 * True when at least one property in the (unfiltered) list is constant or immutable.
		 * Useful for parents that want to render a show/hide-toggle button only when relevant.
		 */
		hasConstantOrImmutableProperties() {
			const schemaProps = this.schema?.properties || {}
			const obj = this.item || {}
			const exclude = this.excludeFields || []
			const include = this.includeFields
			const keys = new Set([
				...Object.keys(obj),
				...Object.keys(schemaProps),
			])
			for (const k of keys) {
				if (k === '@self' || k === 'id') continue
				if (exclude.includes(k)) continue
				if (include && !include.includes(k)) continue
				if (schemaProps[k]?.hideOnForm === true) continue
				if (this.isConstantOrImmutableKey(k)) return true
			}
			return false
		},

		hasRowActionsSlot() {
			return !!this.$scopedSlots['row-actions']
		},
	},

	methods: {
		t,

		getPropCellStyle(key, value) {
			if (this.validationDisplay !== 'indicator') {
				return this.propCellStyle
			}
			const resolvedVal = this.resolvedValue(key, value)
			const state = this.getPropertyValidationState(key, resolvedVal)
			if (state === 'invalid') {
				return { boxShadow: 'inset 3px 0 0 0 var(--color-error)' }
			}
			if (this.isValueChanged(key)) {
				return { boxShadow: 'inset 3px 0 0 0 var(--color-warning)' }
			}
			if (state === 'valid') {
				return { boxShadow: 'inset 3px 0 0 0 var(--color-success)' }
			}
			if (state === 'warning') {
				return { boxShadow: 'inset 3px 0 0 0 var(--color-warning)' }
			}
			if (state === 'new') {
				return { boxShadow: 'inset 3px 0 0 0 var(--color-primary-element)' }
			}
			return this.propCellStyle
		},

		isValueChanged(key) {
			if (this.formData[key] === undefined) return false
			const original = this.item ? this.item[key] : undefined
			const current = this.formData[key]
			if (typeof current === 'object' || typeof original === 'object') {
				return JSON.stringify(current) !== JSON.stringify(original)
			}
			return current !== original
		},

		/**
		 * The effective value for a key: formData override or the object's own value
		 * @param {string} key - The property key to look up
		 * @param {*} objectValue - The fallback value from the object
		 */
		resolvedValue(key, objectValue) {
			return this.formData[key] !== undefined ? this.formData[key] : objectValue
		},

		/**
		 * Initial display value for a schema property that doesn't yet exist on the
		 * object. Honors `default` and `const` first, then falls back to the
		 * type-appropriate empty value.
		 * @param {object} prop - The schema property entry.
		 */
		defaultForProperty(prop) {
			if (!prop) return ''
			if (prop.default !== undefined) return prop.default
			if (prop.const !== undefined) return prop.const
			switch (prop.type) {
			case 'string': return ''
			case 'number':
			case 'integer': return 0
			case 'boolean': return false
			case 'array': return []
			case 'object': return {}
			default: return ''
			}
		},

		onPropertyValueUpdate(key, value) {
			this.$emit('update:property-value', { key, value })
		},

		/**
		 * Whether a property is marked required either via `schema.required: [...]`
		 * (the JSON-Schema-canonical place) or via `prop.required: true` on the
		 * property entry itself (a non-standard but commonly seen variant).
		 * @param {string} key - Property key.
		 * @return {boolean}
		 */
		isRequired(key) {
			if ((this.schema?.required || []).includes(key)) return true
			const prop = this.schema?.properties?.[key]
			return !!(prop && prop.required === true)
		},

		/**
		 * Whether the property's value is fixed by the schema (`const`) and
		 * should be hide-able via the show/hide toggle. Note: `immutable` /
		 * `readOnly` are NOT considered constant — they're set on creation
		 * and locked afterward, but should remain visible in the form.
		 * @param {string} key - Property key.
		 * @return {boolean}
		 */
		/**
		 * True when an "immutable" / "readOnly" hint badge should be shown
		 * for this property — i.e. the prop is settable on creation but
		 * locks once persisted, AND it isn't already locked. Once locked the
		 * lock icon takes over and the badge would be redundant.
		 * @param {string} key - Property key.
		 * @return {boolean}
		 */
		isImmutableHint(key) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return false
			if (prop.const !== undefined) return false
			const lockOnce = prop.immutable === true || prop.readOnly === true
			if (!lockOnce) return false
			return this.isPropertyEditable(key, null)
		},

		isConstantOrImmutableKey(key) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return false
			return prop.const !== undefined
		},

		// `value` is intentionally unused — kept in the signature for callers
		// that already pass it (slot consumers, the cell, the row click
		// handler). Editability is now driven by the persisted `item`.
		// eslint-disable-next-line no-unused-vars
		isPropertyEditable(key, value) {
			const prop = this.schema?.properties?.[key]
			if (!prop) return true
			if (prop.const !== undefined) return false
			// `immutable` / `readOnly` mean "settable on creation, locked
			// once persisted". Use the persisted `item` (not the live value
			// the user is typing) as the source of truth — otherwise the
			// field would lock the moment the first character is entered.
			const lockOnce = prop.immutable === true || prop.readOnly === true
			if (lockOnce) {
				const persisted = this.item && this.item[key]
				if (persisted != null && persisted !== '') return false
			}
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
				if (schemaProperty?.format === 'email' && !this.isValidEmail(value)) return false
				if (schemaProperty?.format === 'uri' && !this.isValidUri(value)) return false
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
			if (prop.format === 'email' && !this.isValidEmail(value)) {
				return `Property '${key}' should be a valid email address.`
			}
			if (prop.format === 'uri' && !this.isValidUri(value)) {
				return `Property '${key}' should be a valid URI.`
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

		isValidEmail(v) {
			if (!v) return false
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
		},

		isValidUri(v) {
			if (!v) return false
			try {
				return !!new URL(v)
			} catch {
				return false
			}
		},
	},
}
</script>

<style scoped>
.cn-advanced-form-dialog__table-container {
	background: var(--color-main-background);
	border-radius: var(--border-radius);
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

/* Selected (editing) row: align the constrained label cell to the top of the
   value cell so tall inputs (textarea, JSON editor) do not visually overflow
   into the next row. */
.cn-advanced-form-dialog__table-row--selected td {
	vertical-align: top;
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
	background-color: var(--color-warning-light);
}

.cn-advanced-form-dialog__table-row--non-editable {
	background-color: var(--color-background-dark);
	cursor: not-allowed;
	opacity: 0.7;
}

.cn-advanced-form-dialog__table-row--non-editable * {
	cursor: not-allowed !important;
}

.cn-advanced-form-dialog__table-row--invalid {
	background-color: var(--color-error-light);
}

.cn-advanced-form-dialog__table-row--warning {
	background-color: var(--color-warning-light);
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

.cn-advanced-form-dialog__table-col-actions {
	width: 56px;
	text-align: right;
	white-space: nowrap;
}

.cn-advanced-form-dialog__prop-cell {
	width: 30%;
	font-weight: 600;
}

.cn-advanced-form-dialog__value-cell {
	width: 70%;
	word-break: break-word;
	border-radius: 4px;
}

.cn-advanced-form-dialog__value-cell > * {
	max-width: 100%;
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

.cn-advanced-form-dialog__validation-icon--edited {
	color: var(--color-warning);
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

.cn-advanced-form-dialog__required-indicator {
	color: var(--color-error-text);
	font-weight: bold;
	cursor: help;
}

.cn-advanced-form-dialog__immutable-badge {
	display: inline-block;
	padding: 1px 6px;
	border-radius: 10px;
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
	font-size: 0.75em;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	cursor: help;
	white-space: nowrap;
}
</style>
