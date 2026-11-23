<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<fieldset class="cn-condition-list">
		<legend v-if="label" class="cn-condition-list__label">
			{{ label }}
		</legend>
		<p v-if="rows.length === 0" class="cn-condition-list__empty">
			{{ emptyText || t('nextcloud-vue', 'No conditions: the rule always applies.') }}
		</p>
		<CnConditionRow
			v-for="(row, i) in rows"
			:key="i"
			class="cn-condition-list__row"
			:condition="row"
			:fieldOptions="fieldOptions"
			:operatorOptions="operatorOptions(row.field)"
			:valueOptions="valueOptions(row.field)"
			:inputType="inputType(row.field)"
			:showValue="takesValue(row.operator)"
			@field="setField(i, $event)"
			@operator="setOperator(i, $event)"
			@value="setValue(i, valueOptions(row.field) ? $event : typedValue(row.field, $event))"
			@remove="remove(i)" />
		<NcButton variant="tertiary" :disabled="fields.length === 0" @click="add">
			<template #icon>
				<Plus :size="18" />
			</template>
			{{ t('nextcloud-vue', 'Add condition') }}
		</NcButton>
	</fieldset>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnConditionRow from './CnConditionRow.vue'
import { operatorLabel, operatorsForType, operatorTakesValue } from './conditionOperators.js'

/**
 * CnConditionListEditor - the conditions of a rule as rows over an object's
 * own fields: field, operator, value. All rows hold together. The operators
 * follow the field's type (see `operatorsForType`), "is filled in" needs no
 * value, and the value is a choice for a choice or yes/no field.
 *
 * v-model on `{ field, operator, value }[]`, in both dialects (`value`/`input`
 * and `modelValue`/`update:modelValue`). Read a condition back as words with
 * `conditionSentence` from `./conditionOperators.js`.
 */
export default {
	name: 'CnConditionListEditor',

	components: { CnConditionRow, NcButton, Plus },

	props: {
		/**
		 * The conditions.
		 *
		 * @type {Array<{field: string, operator: string, value?: unknown}>}
		 */
		value: { type: Array, default: () => [] },
		/**
		 * The same value under Vue 3's v-model name; wins over `value` when passed.
		 *
		 * @type {Array}
		 */
		modelValue: { type: Array, default: undefined },
		/**
		 * The fields a condition may name: `{ id, label, type, options?, format? }`.
		 * `type` is number, integer, date, boolean, presence or anything else (text);
		 * `options` (`[{ id, label }]`) make the value a choice.
		 *
		 * @type {Array<{id: string, label: string, type?: string, options?: Array}>}
		 */
		fields: { type: Array, default: () => [] },
		/**
		 * The legend above the rows, already translated.
		 *
		 * @type {string}
		 */
		label: { type: String, default: '' },
		/**
		 * What an empty list says, already translated.
		 *
		 * @type {string}
		 */
		emptyText: { type: String, default: '' },
	},

	emits: ['input', 'update:modelValue'],

	data() {
		return {
			rows: this.copy(this.modelValue !== undefined ? this.modelValue : this.value),
		}
	},

	computed: {
		/**
		 * The field choices.
		 *
		 * @return {Array<{id: string, label: string}>}
		 */
		fieldOptions() {
			return this.fields.map((f) => ({ id: f.id, label: f.label || f.id }))
		},
	},

	watch: {
		value(next) {
			if (this.modelValue === undefined) {
				this.rows = this.copy(next)
			}
		},

		modelValue(next) {
			if (next !== undefined) {
				this.rows = this.copy(next)
			}
		},
	},

	methods: {
		t,

		/**
		 * A detached copy of the bound conditions.
		 *
		 * @param {Array} list The conditions.
		 * @return {Array} The copy.
		 */
		copy(list) {
			return (Array.isArray(list) ? list : []).map((row) => ({ ...row }))
		},

		/**
		 * The field with this id.
		 *
		 * @param {string} id The field id.
		 * @return {object|undefined}
		 */
		fieldOf(id) {
			return this.fields.find((f) => f.id === id)
		},

		operatorOptions(fieldId) {
			return operatorsForType(this.fieldOf(fieldId)?.type).map((id) => ({ id, label: operatorLabel(id) }))
		},

		takesValue(operator) {
			return operatorTakesValue(operator)
		},

		/**
		 * The value choices of a field, or null when its value is typed.
		 *
		 * @param {string} fieldId The field id.
		 * @return {Array<{id: string, label: string}>|null}
		 */
		valueOptions(fieldId) {
			const field = this.fieldOf(fieldId)
			if (field?.type === 'boolean') {
				return [
					{ id: true, label: t('nextcloud-vue', 'Yes') },
					{ id: false, label: t('nextcloud-vue', 'No') },
				]
			}
			if (Array.isArray(field?.options) && field.options.length > 0) {
				return field.options.map((o) => (typeof o === 'object'
					? { id: o.id ?? o.value, label: o.label ?? String(o.id ?? o.value) }
					: { id: o, label: String(o) }))
			}
			return null
		},

		inputType(fieldId) {
			const type = this.fieldOf(fieldId)?.type
			if (type === 'number' || type === 'integer') {
				return 'number'
			}
			return type === 'date' ? 'date' : 'text'
		},

		/**
		 * A typed value as stored: a number for a number field.
		 *
		 * @param {string} fieldId The field id.
		 * @param {string} raw What was typed.
		 * @return {string|number}
		 */
		typedValue(fieldId, raw) {
			const type = this.fieldOf(fieldId)?.type
			if ((type === 'number' || type === 'integer') && raw !== '' && !Number.isNaN(Number(raw))) {
				return Number(raw)
			}
			return raw
		},

		setField(i, option) {
			const field = this.fieldOf(option?.id)
			const operators = operatorsForType(field?.type)
			this.rows[i] = { field: option?.id || '', operator: operators[0], value: field?.type === 'boolean' ? true : '' }
			this.emitRows()
		},

		setOperator(i, option) {
			const row = { ...this.rows[i], operator: option?.id || 'eq' }
			if (!operatorTakesValue(row.operator)) {
				delete row.value
			} else if (row.value === undefined) {
				row.value = ''
			}
			this.rows[i] = row
			this.emitRows()
		},

		setValue(i, value) {
			this.rows[i] = { ...this.rows[i], value }
			this.emitRows()
		},

		add() {
			this.rows.push({ field: '', operator: 'eq', value: '' })
			this.emitRows()
		},

		remove(i) {
			this.rows.splice(i, 1)
			this.emitRows()
		},

		/**
		 * Tell the consumer, in both v-model dialects.
		 *
		 * @return {void}
		 */
		emitRows() {
			const next = this.copy(this.rows)
			/**
			 * The conditions changed.
			 *
			 * @event input
			 * @type {Array}
			 */
			this.$emit('input', next)
			/**
			 * The conditions changed (Vue 3 v-model).
			 *
			 * @event update:modelValue
			 * @type {Array}
			 */
			this.$emit('update:modelValue', next)
		},
	},
}
</script>

<style scoped>
.cn-condition-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border: 0;
	margin: 0;
	padding: 0;
	min-width: 0;
}

.cn-condition-list__label {
	font-weight: 600;
	padding: 0;
	margin-bottom: 4px;
}

.cn-condition-list__empty {
	color: var(--color-text-maxcontrast);
	margin: 0;
}
</style>
