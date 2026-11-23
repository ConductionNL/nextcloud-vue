<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-condition-group"
		:class="{
			'cn-condition-group--nested': depth > 0,
			'cn-condition-group--error': !!ownError,
		}">
		<div class="cn-condition-group__header">
			<fieldset class="cn-condition-group__combinator">
				<legend class="cn-condition-group__legend">
					{{ t('nextcloud-vue', 'How the conditions combine') }}
				</legend>
				<NcCheckboxRadioSwitch
					v-for="choice in combinators"
					:key="choice.value"
					type="radio"
					:class="{ 'cn-condition-group__choice--checked': node.type === choice.value }"
					:name="radioName"
					:value="choice.value"
					:modelValue="node.type"
					@update:modelValue="setType">
					{{ choice.label }}
				</NcCheckboxRadioSwitch>
			</fieldset>
			<NcButton
				v-if="depth > 0"
				class="cn-condition-group__remove-group"
				variant="tertiary"
				@click="$emit('remove')">
				<template #icon>
					<TrashCanOutline :size="16" />
				</template>
				{{ t('nextcloud-vue', 'Remove group') }}
			</NcButton>
		</div>

		<ol v-if="node.children.length" class="cn-condition-group__rows">
			<li v-for="(child, index) in node.children" :key="index" class="cn-condition-group__item">
				<template v-if="kindOf(child) === 'group'">
					<div class="cn-condition-group__line">
						<span class="cn-condition-group__connector">{{ connector(index) }}</span>
						<span class="cn-condition-group__caption">{{ caption(child) }}</span>
					</div>
					<CnConditionGroup
						class="cn-condition-group__child"
						:node="child"
						:depth="depth + 1"
						:path="childPath(index)"
						:fields="fields"
						:operatorsFor="operatorsFor"
						:maxDepth="maxDepth"
						:errors="errors"
						@update:node="setChild(index, $event)"
						@remove="removeChild(index)" />
				</template>
				<div v-else-if="kindOf(child) === 'locked'" class="cn-condition-group__line">
					<span class="cn-condition-group__connector">{{ connector(index) }}</span>
					<div class="cn-condition-group__locked">
						<Lock :size="16" />
						<span>{{ t('nextcloud-vue', 'These conditions are kept as written') }}</span>
						<NcButton
							class="cn-condition-group__pill"
							variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Remove group')"
							:title="t('nextcloud-vue', 'Remove group')"
							@click="removeChild(index)">
							<template #icon>
								<TrashCanOutline :size="18" />
							</template>
						</NcButton>
					</div>
				</div>
				<div v-else class="cn-condition-group__line">
					<span class="cn-condition-group__connector">{{ connector(index) }}</span>
					<CnConditionRow
						class="cn-condition-group__row"
						:condition="child"
						:fieldOptions="fieldOptionsFor(child)"
						:operatorOptions="operatorOptionsFor(child)"
						:valueOptions="valueOptionsFor(child)"
						:inputType="inputTypeFor(child)"
						:showValue="operatorTakesValue(child.operator)"
						:controlLabels="controlLabels"
						:error="errors[childPath(index)] || ''"
						hideLabels
						@field="setField(index, $event)"
						@operator="setOperator(index, $event)"
						@value="setValue(index, child, $event)"
						@remove="removeChild(index)">
						<template #remove-icon>
							<TrashCanOutline :size="18" />
						</template>
					</CnConditionRow>
				</div>
			</li>
		</ol>
		<p v-else class="cn-condition-group__empty">
			{{ depth === 0 && emptyText ? emptyText : t('nextcloud-vue', 'This group has no conditions yet.') }}
		</p>

		<p v-if="ownError" class="cn-condition-group__error" role="alert">
			{{ ownError }}
		</p>

		<div class="cn-condition-group__actions">
			<NcButton variant="tertiary" :disabled="fields.length === 0" @click="addCondition">
				<template #icon>
					<Plus :size="16" />
				</template>
				{{ t('nextcloud-vue', 'Add condition') }}
			</NcButton>
			<NcButton v-if="depth < maxDepth"
				variant="tertiary"
				:disabled="fields.length === 0"
				@click="addGroup">
				<template #icon>
					<FolderPlusOutline :size="16" />
				</template>
				{{ t('nextcloud-vue', 'Add group') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import FolderPlusOutline from 'vue-material-design-icons/FolderPlusOutline.vue'
import Lock from 'vue-material-design-icons/Lock.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CnConditionRow from '../CnConditionListEditor/CnConditionRow.vue'
import { operatorTakesValue } from '../CnConditionListEditor/conditionOperators.js'

let groupSeq = 0

/**
 * CnConditionGroup - one group of CnConditionGroupEditor: the combinator
 * choice, its rows, and the groups inside it, drawn recursively. Internal to
 * the editor, which owns the tree.
 */
export default {
	name: 'CnConditionGroup',

	components: { CnConditionRow, FolderPlusOutline, Lock, NcButton, NcCheckboxRadioSwitch, Plus, TrashCanOutline },

	props: {
		/** The group: `{ type: 'AND' | 'OR', children }`. */
		node: { type: Object, required: true },
		/** How deep this group sits; the root is 0. */
		depth: { type: Number, default: 0 },
		/** This group's path in validator notation (`$.children[1]`). */
		path: { type: String, default: '$' },
		/** The fields, normalised to `{ id, label, type, format?, options? }`. */
		fields: { type: Array, default: () => [] },
		/** The operators of a field, `(field) => [{ id, label }]`. */
		operatorsFor: { type: Function, required: true },
		/** The deepest group Add group may create. */
		maxDepth: { type: Number, default: 1 },
		/** Messages keyed by node path. */
		errors: { type: Object, default: () => ({}) },
		/** What an empty root says, already translated. */
		emptyText: { type: String, default: '' },
	},

	emits: ['update:node', 'remove'],

	data() {
		groupSeq += 1
		return { radioName: `cn-condition-group-${groupSeq}` }
	},

	computed: {
		combinators() {
			return [
				{ value: 'AND', label: t('nextcloud-vue', 'Match all conditions') },
				{ value: 'OR', label: t('nextcloud-vue', 'Match any condition') },
			]
		},

		controlLabels() {
			return {
				field: t('nextcloud-vue', 'Field'),
				operator: t('nextcloud-vue', 'Condition'),
				value: t('nextcloud-vue', 'Value'),
			}
		},

		ownError() {
			return this.errors[this.path] || ''
		},
	},

	methods: {
		t,
		operatorTakesValue,

		/**
		 * What a child is: a group drawn as a card, a group the editor keeps
		 * as written (NOT), or a condition.
		 *
		 * @param {object} child The child node.
		 * @return {string} group, locked or condition.
		 */
		kindOf(child) {
			if (!Array.isArray(child?.children)) {
				return 'condition'
			}
			return ['AND', 'OR'].includes(String(child.type || 'AND').toUpperCase()) ? 'group' : 'locked'
		},

		/**
		 * The word before a row: Where on the first, then and or or.
		 *
		 * @param {number} index The row index.
		 * @return {string} The word.
		 */
		connector(index) {
			if (index === 0) {
				return t('nextcloud-vue', 'Where')
			}
			return this.node.type === 'OR' ? t('nextcloud-vue', 'or') : t('nextcloud-vue', 'and')
		},

		caption(child) {
			return String(child.type).toUpperCase() === 'OR'
				? t('nextcloud-vue', 'one of these')
				: t('nextcloud-vue', 'all of these')
		},

		childPath(index) {
			return `${this.path}.children[${index}]`
		},

		fieldOf(id) {
			return this.fields.find((f) => f.id === id)
		},

		/**
		 * The field choices, plus a stored field the list does not offer.
		 *
		 * @param {object} child The condition.
		 * @return {Array<{id: string, label: string}>} The choices.
		 */
		fieldOptionsFor(child) {
			const options = this.fields.map((f) => ({ id: f.id, label: f.label || f.id }))
			if (child.field && !options.some((o) => o.id === child.field)) {
				options.push({ id: child.field, label: child.field })
			}
			return options
		},

		/**
		 * The operator choices of the condition's field, plus a stored
		 * operator the list does not offer.
		 *
		 * @param {object} child The condition.
		 * @return {Array<{id: string, label: string}>} The choices.
		 */
		operatorOptionsFor(child) {
			const options = this.operatorsFor(this.fieldOf(child.field))
			if (child.operator && !options.some((o) => o.id === child.operator)) {
				return [...options, { id: child.operator, label: child.operator }]
			}
			return options
		},

		valueOptionsFor(child) {
			const field = this.fieldOf(child.field)
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

		inputTypeFor(child) {
			const field = this.fieldOf(child.field)
			if (field?.type === 'number' || field?.type === 'integer') {
				return 'number'
			}
			return field?.type === 'date' || field?.format === 'date' ? 'date' : 'text'
		},

		emitNode(next) {
			this.$emit('update:node', next)
		},

		setChildren(children) {
			this.emitNode({ ...this.node, children })
		},

		setChild(index, next) {
			const children = [...this.node.children]
			children[index] = next
			this.setChildren(children)
		},

		removeChild(index) {
			this.setChildren(this.node.children.filter((_, i) => i !== index))
		},

		setType(type) {
			this.emitNode({ ...this.node, type: type === 'OR' ? 'OR' : 'AND' })
		},

		addCondition() {
			this.setChildren([...this.node.children, { field: '', operator: '', value: '' }])
		},

		addGroup() {
			this.setChildren([...this.node.children, { type: 'AND', children: [{ field: '', operator: '', value: '' }] }])
		},

		/**
		 * Pick a field: the operator resets to the field's first one and the
		 * value clears, since a value for another field rarely fits.
		 *
		 * @param {number} index The row index.
		 * @param {object} option The field choice.
		 */
		setField(index, option) {
			const field = this.fieldOf(option?.id)
			const first = this.operatorsFor(field)[0]
			this.setChild(index, {
				field: option?.id || '',
				operator: first ? first.id : '',
				value: field?.type === 'boolean' ? true : '',
			})
		},

		setOperator(index, option) {
			const next = { ...this.node.children[index], operator: option?.id || '' }
			if (!operatorTakesValue(next.operator)) {
				delete next.value
			} else if (next.value === undefined) {
				next.value = ''
			}
			this.setChild(index, next)
		},

		/**
		 * Set a value, as a number for a number field.
		 *
		 * @param {number} index The row index.
		 * @param {object} child The condition.
		 * @param {unknown} raw The picked or typed value.
		 */
		setValue(index, child, raw) {
			let value = raw
			if (this.inputTypeFor(child) === 'number' && raw !== '' && !Number.isNaN(Number(raw))) {
				value = Number(raw)
			}
			this.setChild(index, { ...child, value })
		},
	},
}
</script>

<style scoped>
.cn-condition-group {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
	padding: 14px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	--cn-condition-row-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1.25fr) auto;
	--cn-condition-row-align: center;
}

.cn-condition-group--nested {
	margin-inline-start: 52px;
	padding: 12px 12px 8px;
	border-color: var(--color-border);
	border-inline-start: 3px solid var(--color-primary-element);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-background-hover);
}

.cn-condition-group--error {
	border-color: var(--color-border-error, var(--color-error));
}

.cn-condition-group__header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.cn-condition-group__combinator {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 18px;
	margin: 0;
	padding: 0;
	border: 0;
	min-width: 0;
}

.cn-condition-group__legend {
	float: inline-start;
	margin-inline-end: 6px;
	padding: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-condition-group__choice--checked :deep(.checkbox-radio-switch__text) {
	font-weight: 600;
}

.cn-condition-group__remove-group {
	color: var(--color-text-error, var(--color-error));
}

.cn-condition-group__rows {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-condition-group__item {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
}

.cn-condition-group__line {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.cn-condition-group__connector {
	flex: 0 0 44px;
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-condition-group__caption {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-condition-group__row {
	flex: 1 1 auto;
}

.cn-condition-group__locked {
	display: flex;
	flex: 1 1 auto;
	align-items: center;
	gap: 8px;
	min-height: var(--default-clickable-area);
	padding: 0 0 0 10px;
	border: 1px dashed var(--color-border-dark);
	border-radius: var(--border-radius-element, 8px);
	color: var(--color-text-maxcontrast);
}

.cn-condition-group__locked > span {
	flex: 1 1 auto;
}

.cn-condition-group__pill,
.cn-condition-group__row :deep(.cn-condition-row__remove) {
	border-radius: var(--border-radius-pill, 17px);
}

.cn-condition-group__empty {
	margin: 0;
	padding: 12px;
	border: 1px dashed var(--color-border-dark);
	border-radius: var(--border-radius-large);
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-condition-group__error {
	margin: 0;
	color: var(--color-text-error, var(--color-error));
	font-size: 0.9em;
}

.cn-condition-group__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding-inline-start: 44px;
}

@media (max-width: 640px) {
	.cn-condition-group--nested {
		margin-inline-start: 12px;
	}

	.cn-condition-group__line {
		flex-wrap: wrap;
	}

	.cn-condition-group__actions {
		padding-inline-start: 0;
	}
}
</style>
