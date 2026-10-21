<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div
		v-if="isGroup"
		class="cn-condition-group"
		:class="{
			'cn-condition-group--nested': depth > 0,
			'cn-condition-group--error': ownError,
		}"
		role="group"
		:aria-label="depth === 0 ? t('nextcloud-vue', 'Conditions') : t('nextcloud-vue', 'Group of conditions')"
		:data-testid="`cn-condition-group-${path}`">
		<div class="cn-condition-group__header">
			<NcSelect
				:modelValue="combinatorOption"
				:options="combinatorOptions"
				:inputLabel="t('nextcloud-vue', 'How the conditions combine')"
				label="label"
				:clearable="false"
				:searchable="false"
				class="cn-condition-group__combinator"
				:data-testid="`cn-condition-combinator-${path}`"
				@update:modelValue="emitChange({ ...node, type: ($event && $event.value) || 'AND' })" />
			<NcButton
				v-if="depth > 0"
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove group')"
				:title="t('nextcloud-vue', 'Remove group')"
				:data-testid="`cn-condition-remove-${path}`"
				@click="$emit('remove')">
				<template #icon>
					<TrashCanOutline :size="20" />
				</template>
			</NcButton>
		</div>
		<ol v-if="node.children.length" class="cn-condition-group__list">
			<li
				v-for="(child, index) in node.children"
				:key="index"
				class="cn-condition-group__item">
				<span class="cn-condition-group__connector">
					{{ index === 0 ? t('nextcloud-vue', 'Where') : connectorLabel }}
				</span>
				<CnConditionTreeNode
					class="cn-condition-group__child"
					:node="child"
					:depth="depth + 1"
					:fieldOptions="fieldOptions"
					:operators="operators"
					:errors="errors"
					:path="`${path}.children[${index}]`"
					@update:node="updateChild(index, $event)"
					@remove="removeChild(index)" />
			</li>
		</ol>
		<p v-else class="cn-condition-group__empty">
			{{ depth === 0 ? (emptyText || t('nextcloud-vue', 'No conditions yet. Add a condition.')) : t('nextcloud-vue', 'This group has no conditions yet.') }}
		</p>
		<p v-if="ownError" class="cn-condition__error" role="alert">
			{{ ownError }}
		</p>
		<div class="cn-condition-group__actions">
			<NcButton variant="tertiary" :data-testid="`cn-condition-add-${path}`" @click="addCondition">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add condition') }}
			</NcButton>
			<NcButton variant="tertiary" :data-testid="`cn-condition-add-group-${path}`" @click="addGroup">
				<template #icon>
					<PlusBoxMultipleOutline :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add group') }}
			</NcButton>
		</div>
	</div>
	<div
		v-else
		class="cn-condition"
		:class="{ 'cn-condition--error': ownError }"
		:data-testid="`cn-condition-${path}`">
		<div class="cn-condition__fields">
			<NcSelect
				:modelValue="fieldOption"
				:options="fieldSelectOptions"
				:inputLabel="t('nextcloud-vue', 'Field')"
				:placeholder="t('nextcloud-vue', 'Choose a field')"
				label="label"
				:clearable="false"
				class="cn-condition__field"
				:data-testid="`cn-condition-field-${path}`"
				@update:modelValue="onFieldChange" />
			<NcSelect
				:modelValue="operatorOption"
				:options="operatorOptions"
				:inputLabel="t('nextcloud-vue', 'Condition')"
				:placeholder="t('nextcloud-vue', 'Condition')"
				label="label"
				:clearable="false"
				:searchable="false"
				:disabled="!node.field"
				class="cn-condition__operator"
				:data-testid="`cn-condition-operator-${path}`"
				@update:modelValue="emitChange({ ...node, operator: ($event && $event.value) || '' })" />
			<NcSelect
				v-if="valueKind === 'boolean'"
				:modelValue="booleanOption"
				:options="booleanOptions"
				:inputLabel="t('nextcloud-vue', 'Value')"
				label="label"
				:clearable="false"
				:searchable="false"
				:disabled="!node.field"
				class="cn-condition__value"
				:data-testid="`cn-condition-value-${path}`"
				@update:modelValue="emitChange({ ...node, value: $event ? $event.value : '' })" />
			<NcDateTimePickerNative
				v-else-if="valueKind === 'date'"
				:id="`cn-condition-value-${uid}`"
				:modelValue="dateValue"
				type="date"
				:label="t('nextcloud-vue', 'Value')"
				:disabled="!node.field"
				class="cn-condition__value"
				:data-testid="`cn-condition-value-${path}`"
				@update:modelValue="emitChange({ ...node, value: toDay($event) })" />
			<NcTextField
				v-else
				:modelValue="textValue"
				:type="valueKind === 'number' ? 'number' : 'text'"
				:label="t('nextcloud-vue', 'Value')"
				:disabled="!node.field"
				class="cn-condition__value"
				:data-testid="`cn-condition-value-${path}`"
				@update:modelValue="emitChange({ ...node, value: $event })" />
			<NcButton
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove condition')"
				:title="t('nextcloud-vue', 'Remove condition')"
				:data-testid="`cn-condition-remove-${path}`"
				@click="$emit('remove')">
				<template #icon>
					<TrashCanOutline :size="20" />
				</template>
			</NcButton>
		</div>
		<p v-if="ownError" class="cn-condition__error" role="alert">
			{{ ownError }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDateTimePickerNative, NcSelect, NcTextField } from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import PlusBoxMultipleOutline from 'vue-material-design-icons/PlusBoxMultipleOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { dateOperators, operatorsFor } from './conditionOperators.js'

let nodeUid = 0

/**
 * One node of CnConditionTreeEditor: an AND/OR group of nodes, or one
 * condition (field, operator, value). The tree is edited by emitting a new
 * node; the editor owns the value.
 */
export default {
	name: 'CnConditionTreeNode',

	components: {
		NcButton,
		NcDateTimePickerNative,
		NcSelect,
		NcTextField,
		Plus,
		PlusBoxMultipleOutline,
		TrashCanOutline,
	},

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The node: a group `{ type, children }` or a condition `{ field, operator, value }`.
		 *
		 * @type {object}
		 */
		node: {
			type: Object,
			required: true,
		},

		/**
		 * How deep the node sits; the root group is 0.
		 *
		 * @type {number}
		 */
		depth: {
			type: Number,
			default: 0,
		},

		/**
		 * The fields a condition can test: `[{ value, label, type, format? }]`.
		 *
		 * @type {Array<object>}
		 */
		fieldOptions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Operators per field type, replacing the defaults for the types it names.
		 *
		 * @type {object|null}
		 */
		operators: {
			type: Object,
			default: null,
		},

		/**
		 * Error messages by node path (`$`, `$.children[1]`, ...).
		 *
		 * @type {object}
		 */
		errors: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * This node's path in the tree.
		 *
		 * @type {string}
		 */
		path: {
			type: String,
			default: '$',
		},

		/**
		 * Shown in an empty root group.
		 *
		 * @type {string}
		 */
		emptyText: {
			type: String,
			default: '',
		},
	},

	emits: ['update:node', 'remove'],

	data() {
		nodeUid += 1
		return { uid: nodeUid }
	},

	computed: {
		isGroup() {
			return Array.isArray(this.node && this.node.children)
		},

		ownError() {
			return (this.errors && this.errors[this.path]) || ''
		},

		combinatorOptions() {
			return [
				{ value: 'AND', label: t('nextcloud-vue', 'Match all conditions') },
				{ value: 'OR', label: t('nextcloud-vue', 'Match any condition') },
			]
		},

		combinatorOption() {
			return this.combinatorOptions.find((o) => o.value === this.node.type) || this.combinatorOptions[0]
		},

		connectorLabel() {
			return this.node.type === 'OR' ? t('nextcloud-vue', 'or') : t('nextcloud-vue', 'and')
		},

		/**
		 * The field options, labels translated by the app, plus the stored field
		 * when it is not offered, so a saved rule still shows what it tests.
		 *
		 * @return {Array<object>}
		 */
		fieldSelectOptions() {
			const options = this.fieldOptions.map((o) => ({ ...o, label: this.cnTranslate(o.label || o.value) }))
			if (this.node.field && !options.some((o) => o.value === this.node.field)) {
				options.push({ value: this.node.field, label: this.node.field, type: 'string' })
			}
			return options
		},

		fieldOption() {
			return this.fieldSelectOptions.find((o) => o.value === this.node.field) || null
		},

		fieldType() {
			return (this.fieldOption && this.fieldOption.type) || 'string'
		},

		/**
		 * The operators of the field's type (with before and after for a date),
		 * plus the stored operator when it is not among them.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		operatorOptions() {
			const list = operatorsFor(this.fieldType, this.operators)
				.concat(this.fieldOption && this.fieldOption.format === 'date' ? dateOperators() : [])
			if (this.node.operator && !list.some((o) => o.value === this.node.operator)) {
				list.push({ value: this.node.operator, label: this.node.operator })
			}
			return list
		},

		operatorOption() {
			return this.operatorOptions.find((o) => o.value === this.node.operator) || null
		},

		valueKind() {
			if (this.fieldType === 'boolean') {
				return 'boolean'
			}
			if (this.fieldOption && this.fieldOption.format === 'date') {
				return 'date'
			}
			return (this.fieldType === 'number' || this.fieldType === 'integer') ? 'number' : 'text'
		},

		booleanOptions() {
			return [
				{ value: true, label: t('nextcloud-vue', 'Yes') },
				{ value: false, label: t('nextcloud-vue', 'No') },
			]
		},

		booleanOption() {
			const v = this.node.value
			if (v === '' || v === null || v === undefined) {
				return null
			}
			const truthy = v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'
			return this.booleanOptions[truthy ? 0 : 1]
		},

		dateValue() {
			const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(this.node.value || ''))
			return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
		},

		textValue() {
			return this.node.value === null || this.node.value === undefined ? '' : String(this.node.value)
		},
	},

	methods: {
		t,

		/**
		 * A date as the day it is in the reader's time zone (`YYYY-MM-DD`).
		 *
		 * @param {Date|null} date The date.
		 * @return {string}
		 */
		toDay(date) {
			if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
				return ''
			}
			const pad = (n) => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		},

		updateChild(index, next) {
			const children = [...this.node.children]
			children[index] = next
			this.emitChange({ ...this.node, children })
		},

		removeChild(index) {
			this.emitChange({ ...this.node, children: this.node.children.filter((_, i) => i !== index) })
		},

		addCondition() {
			this.emitChange({ ...this.node, children: [...this.node.children, { field: '', operator: '', value: '' }] })
		},

		addGroup() {
			this.emitChange({
				...this.node,
				children: [...this.node.children, { type: 'AND', children: [{ field: '', operator: '', value: '' }] }],
			})
		},

		/**
		 * A new field resets the condition: the first operator of its type, and
		 * an empty value (true for a yes/no field).
		 *
		 * @param {object|null} option The chosen field.
		 */
		onFieldChange(option) {
			const type = (option && option.type) || 'string'
			const first = operatorsFor(type, this.operators)[0]
			this.emitChange({
				...this.node,
				field: (option && option.value) || '',
				operator: first ? first.value : '',
				value: type === 'boolean' ? true : '',
			})
		},

		emitChange(next) {
			this.$emit('update:node', next)
		},
	},
}
</script>

<style scoped>
.cn-condition-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-condition-group--nested {
	padding: 8px 12px;
	border-inline-start: 3px solid var(--color-border-dark);
	background: var(--color-background-hover);
	border-radius: var(--border-radius-element, 8px);
}

.cn-condition-group--error,
.cn-condition--error {
	border-color: var(--color-error);
}

.cn-condition-group__header,
.cn-condition-group__actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-condition-group__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-condition-group__item {
	display: flex;
	align-items: flex-start;
	gap: 8px;
}

.cn-condition-group__connector {
	min-width: 56px;
	padding-top: 8px;
	color: var(--color-text-maxcontrast);
	font-weight: 600;
}

.cn-condition-group__child {
	flex: 1;
}

.cn-condition-group__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-condition__fields {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-condition__field,
.cn-condition__operator,
.cn-condition__value {
	min-width: 160px;
	flex: 1;
}

.cn-condition__error {
	margin: 4px 0 0;
	color: var(--color-error-text);
}
</style>
