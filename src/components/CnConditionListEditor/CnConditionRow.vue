<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-condition-row" :class="{ 'cn-condition-row--error': !!error }">
		<div class="cn-condition-row__controls">
			<NcSelect
				class="cn-condition-row__field"
				:modelValue="fieldOption"
				:options="fieldOptions"
				label="label"
				v-bind="selectLabel(labels.field)"
				:clearable="false"
				@update:modelValue="$emit('field', $event)" />
			<NcSelect
				class="cn-condition-row__operator"
				:modelValue="operatorOption"
				:options="operatorOptions"
				label="label"
				v-bind="selectLabel(labels.operator)"
				:clearable="false"
				:disabled="!condition.field"
				@update:modelValue="$emit('operator', $event)" />
			<template v-if="showValue">
				<NcSelect
					v-if="valueOptions"
					class="cn-condition-row__value"
					:modelValue="valueOption"
					:options="valueOptions"
					label="label"
					v-bind="selectLabel(labels.value)"
					:clearable="false"
					:disabled="!condition.field"
					@update:modelValue="$emit('value', $event ? $event.id : '')" />
				<NcTextField
					v-else
					class="cn-condition-row__value"
					:type="inputType"
					:modelValue="textValue"
					:label="labels.value"
					:disabled="!condition.field"
					@update:modelValue="$emit('value', $event)" />
			</template>
			<NcButton
				class="cn-condition-row__remove"
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove condition')"
				:title="t('nextcloud-vue', 'Remove condition')"
				@click="$emit('remove')">
				<template #icon>
					<!-- @slot The remove button's icon; a close cross by default. -->
					<slot name="remove-icon">
						<Close :size="18" />
					</slot>
				</template>
			</NcButton>
		</div>
		<p v-if="error" class="cn-condition-row__error" role="alert">
			{{ error }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'

/**
 * CnConditionRow - one condition as a row of field, operator and value, with
 * a remove button. Shared by CnConditionListEditor and CnConditionGroupEditor;
 * the editor owns the condition and decides the options, the row only draws
 * them and reports what the user picked.
 */
export default {
	name: 'CnConditionRow',

	components: { NcButton, NcSelect, NcTextField, Close },

	props: {
		/**
		 * The condition drawn.
		 *
		 * @type {{field: string, operator: string, value?: unknown}}
		 */
		condition: { type: Object, required: true },
		/**
		 * The field choices, `[{ id, label }]`.
		 *
		 * @type {Array<{id: string, label: string}>}
		 */
		fieldOptions: { type: Array, default: () => [] },
		/**
		 * The operator choices for the condition's field, `[{ id, label }]`.
		 *
		 * @type {Array<{id: string, label: string}>}
		 */
		operatorOptions: { type: Array, default: () => [] },
		/**
		 * The value choices, or null when the value is typed.
		 *
		 * @type {Array<{id: unknown, label: string}>|null}
		 */
		valueOptions: { type: Array, default: null },
		/**
		 * The input type of a typed value: text, number or date.
		 *
		 * @type {string}
		 */
		inputType: { type: String, default: 'text' },
		/**
		 * Whether the operator takes a value.
		 *
		 * @type {boolean}
		 */
		showValue: { type: Boolean, default: true },
		/**
		 * Keep the field, operator and value labels for screen readers only.
		 *
		 * @type {boolean}
		 */
		hideLabels: { type: Boolean, default: false },
		/**
		 * The labels of the three controls, already translated. Missing keys
		 * read Field, Operator and Value.
		 *
		 * @type {{field?: string, operator?: string, value?: string}}
		 */
		controlLabels: { type: Object, default: () => ({}) },
		/**
		 * A message shown under the row, already translated.
		 *
		 * @type {string}
		 */
		error: { type: String, default: '' },
	},

	emits: ['field', 'operator', 'value', 'remove'],

	computed: {
		labels() {
			return {
				field: this.controlLabels.field || t('nextcloud-vue', 'Field'),
				operator: this.controlLabels.operator || t('nextcloud-vue', 'Operator'),
				value: this.controlLabels.value || t('nextcloud-vue', 'Value'),
			}
		},

		fieldOption() {
			return this.fieldOptions.find((o) => o.id === this.condition.field) || null
		},

		operatorOption() {
			return this.operatorOptions.find((o) => o.id === this.condition.operator) || null
		},

		valueOption() {
			return (this.valueOptions || []).find((o) => String(o.id) === String(this.condition.value)) || null
		},

		textValue() {
			const value = this.condition.value
			return value === undefined || value === null ? '' : String(value)
		},
	},

	methods: {
		t,

		/**
		 * The label binding of a select: shown above it, or for screen
		 * readers only.
		 *
		 * @param {string} text The label.
		 * @return {object} The props.
		 */
		selectLabel(text) {
			return this.hideLabels ? { ariaLabelCombobox: text } : { inputLabel: text }
		},
	},
}
</script>

<style scoped>
.cn-condition-row {
	min-width: 0;
}

.cn-condition-row__controls {
	display: grid;
	grid-template-columns: var(--cn-condition-row-columns, minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 1.6fr) auto);
	gap: 8px;
	align-items: var(--cn-condition-row-align, end);
}

.cn-condition-row__controls > :nth-child(3):last-child {
	grid-column: 4;
}

.cn-condition-row__field,
.cn-condition-row__operator,
.cn-condition-row__value {
	width: 100%;
	min-width: 0;
	margin: 0;
}

.cn-condition-row--error .cn-condition-row__controls :deep(input),
.cn-condition-row--error .cn-condition-row__controls :deep(.vs__dropdown-toggle) {
	border-color: var(--color-border-error, var(--color-error));
}

.cn-condition-row__error {
	margin: 4px 0 0;
	color: var(--color-text-error, var(--color-error));
	font-size: 0.9em;
}

@media (max-width: 640px) {
	.cn-condition-row__controls {
		grid-template-columns: minmax(0, 1fr) auto;
	}
}
</style>
