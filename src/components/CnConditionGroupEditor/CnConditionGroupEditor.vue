<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-condition-group-editor">
		<CnConditionGroup
			:node="tree"
			:depth="0"
			path="$"
			:fields="fieldList"
			:operatorsFor="operatorsFor"
			:maxDepth="maxDepth"
			:errors="errors"
			:emptyText="emptyText"
			@update:node="onUpdate" />
	</div>
</template>

<script>
import CnConditionGroup from './CnConditionGroup.vue'
import { operatorLabel, operatorsForType } from '../CnConditionListEditor/conditionOperators.js'

/**
 * A rule value as a group: a group keeps its shape with `type` upper-cased; a
 * bare condition, a list of nodes, or `children` without a `type` read as an
 * AND group of them; anything else reads as an empty AND group.
 *
 * @param {unknown} value The bound value.
 * @return {{type: string, children: Array}} A detached group.
 */
function toGroup(value) {
	let copy
	try {
		copy = JSON.parse(JSON.stringify(value ?? null))
	} catch {
		copy = null
	}
	if (Array.isArray(copy)) {
		return { type: 'AND', children: copy }
	}
	if (!copy || typeof copy !== 'object') {
		return { type: 'AND', children: [] }
	}
	if (Array.isArray(copy.children)) {
		return { ...copy, type: copy.type ? String(copy.type).toUpperCase() : 'AND' }
	}
	if ('field' in copy || 'operator' in copy) {
		return { type: 'AND', children: [copy] }
	}
	return { type: 'AND', children: [] }
}

/**
 * CnConditionGroupEditor - the conditions of a rule in groups: each group
 * chooses whether all or any of its conditions must hold, and the root may
 * hold inner groups ("this, and one of these"). Rows are CnConditionRow, the
 * same field, operator and value row as CnConditionListEditor.
 *
 * v-model on `{ type: 'AND' | 'OR', children }`, where a child is a
 * condition `{ field, operator, value }` or another group, in both dialects
 * (`value`/`input` and `modelValue`/`update:modelValue`). Add group shows
 * only on groups above `maxDepth`; a deeper tree still renders every level.
 * A group of another type (NOT) shows as a locked row that can only be
 * removed.
 */
export default {
	name: 'CnConditionGroupEditor',

	components: { CnConditionGroup },

	props: {
		/**
		 * The group tree.
		 *
		 * @type {{type: string, children: Array}}
		 */
		value: { type: [Object, Array], default: () => ({ type: 'AND', children: [] }) },
		/**
		 * The same value under Vue 3's v-model name; wins over `value` when passed.
		 *
		 * @type {object}
		 */
		modelValue: { type: [Object, Array], default: undefined },
		/**
		 * The fields a condition may name: `{ id | value, label, type?, format?, options? }`.
		 * `type` number or integer types a number, `type` or `format` date picks a
		 * date, `type` boolean or `options` (`[{ id, label }]`) make the value a choice.
		 *
		 * @type {Array<object>}
		 */
		fields: { type: Array, default: () => [] },
		/**
		 * The operators, in the host's own names: a map from field type to
		 * `[{ value, label }]` (`default` for any other type), or a function
		 * `(field) => [{ value, label }]`. Without it, the operators of
		 * CnConditionListEditor are offered.
		 *
		 * @type {object|function(object): Array<{value: string, label: string}>}
		 */
		operators: { type: [Object, Function], default: null },
		/**
		 * The deepest level Add group may build; 1 lets the root hold groups
		 * of conditions.
		 *
		 * @type {number}
		 */
		maxDepth: { type: Number, default: 1 },
		/**
		 * Messages keyed by node path (`$.children[1].children[0]`), already
		 * translated, shown on that row or group.
		 *
		 * @type {object}
		 */
		errors: { type: Object, default: () => ({}) },
		/**
		 * What an empty root says, already translated.
		 *
		 * @type {string}
		 */
		emptyText: { type: String, default: '' },
	},

	emits: ['input', 'update:modelValue'],

	data() {
		return {
			tree: toGroup(this.modelValue !== undefined ? this.modelValue : this.value),
		}
	},

	computed: {
		fieldList() {
			return this.fields.map((f) => ({ ...f, id: f.id ?? f.value }))
		},
	},

	watch: {
		value(next) {
			if (this.modelValue === undefined) {
				this.take(next)
			}
		},

		modelValue(next) {
			if (next !== undefined) {
				this.take(next)
			}
		},
	},

	methods: {
		take(next) {
			const group = toGroup(next)
			if (JSON.stringify(group) !== JSON.stringify(this.tree)) {
				this.tree = group
			}
		},

		/**
		 * The operator choices of a field, as `[{ id, label }]`.
		 *
		 * @param {object|undefined} field The field.
		 * @return {Array<{id: string, label: string}>} The choices.
		 */
		operatorsFor(field) {
			let list
			if (typeof this.operators === 'function') {
				list = this.operators(field)
			} else if (this.operators) {
				list = this.operators[field?.type] || this.operators.default || []
			} else {
				return operatorsForType(field?.type).map((id) => ({ id, label: operatorLabel(id) }))
			}
			return (list || []).map((o) => ({ id: o.id ?? o.value, label: o.label ?? String(o.id ?? o.value) }))
		},

		/**
		 * Keep the edited tree and tell the consumer, in both v-model dialects.
		 *
		 * @param {object} next The edited tree.
		 * @return {void}
		 */
		onUpdate(next) {
			this.tree = next
			const copy = JSON.parse(JSON.stringify(next))
			/**
			 * The tree changed.
			 *
			 * @event input
			 * @type {object}
			 */
			this.$emit('input', copy)
			/**
			 * The tree changed (Vue 3 v-model).
			 *
			 * @event update:modelValue
			 * @type {object}
			 */
			this.$emit('update:modelValue', copy)
		},
	},
}
</script>

<style scoped>
.cn-condition-group-editor {
	min-width: 0;
}
</style>
