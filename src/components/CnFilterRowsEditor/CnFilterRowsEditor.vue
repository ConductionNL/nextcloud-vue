<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-filter-rows">
		<label class="cn-filter-rows__label">{{ t('nextcloud-vue', 'Filter') }}</label>
		<div
			v-for="(row, i) in rows"
			:key="i"
			class="cn-filter-rows__row">
			<CnFieldPicker
				:value="row.key"
				:label="t('nextcloud-vue', 'Property')"
				:options="fields"
				placeholder="status"
				@update="update(i, 'key', $event)" />
			<NcSelect
				:model-value="row.op"
				:options="opIds"
				:input-label="t('nextcloud-vue', 'Operator')"
				:clearable="false"
				@update:model-value="update(i, 'op', $event)">
				<template #option="{ label: opId }">
					{{ opLabel(opId) }}
				</template>
				<template #selected-option="{ label: opId }">
					{{ opLabel(opId) }}
				</template>
			</NcSelect>
			<NcTextField
				:model-value="row.value"
				:label="t('nextcloud-vue', 'Value')"
				placeholder="won"
				@update:model-value="update(i, 'value', $event)" />
			<NcButton
				type="tertiary"
				:aria-label="t('nextcloud-vue', 'Remove filter')"
				@click="remove(i)">
				<template #icon>
					<Close :size="18" />
				</template>
			</NcButton>
		</div>
		<NcButton type="tertiary" @click="add">
			<template #icon>
				<Plus :size="18" />
			</template>
			{{ t('nextcloud-vue', 'Add filter') }}
		</NcButton>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import CnFieldPicker from '../CnFieldPicker/CnFieldPicker.vue'
import { FILTER_OPERATORS } from './filterRows.js'

/**
 * CnFilterRowsEditor — a reusable operator-aware filter editor shared by the
 * widget config forms (stat / chart / object-list). Renders one row per filter
 * condition (`property` + operator `= ≠ > < ≥ ≤` + `value`) with add / remove,
 * and emits the full rows array on every change via `input` (v-model friendly).
 * Use `rowsToFilter` / `filterToRows` from `./filterRows.js` to convert to and
 * from the OpenRegister filter object.
 */
export default {
	name: 'CnFilterRowsEditor',

	components: { NcTextField, NcSelect, NcButton, Plus, Close, CnFieldPicker },

	props: {
		/**
		 * The current filter rows (`{ key, op, value }[]`).
		 *
		 * @type {Array<{key: string, op: string, value: string}>}
		 */
		value: {
			type: Array,
			default: () => [],
		},
		/**
		 * Available schema field names — when non-empty the Property input
		 * becomes a dropdown instead of free-text.
		 *
		 * @type {string[]}
		 */
		fields: {
			type: Array,
			default: () => [],
		},
	},

	emits: [
		/**
		 * Emitted with the full updated rows array on every edit.
		 *
		 * @event input
		 * @type {Array<{key: string, op: string, value: string}>}
		 */
		'input',
	],

	data() {
		return {
			rows: this.value.map((r) => ({ ...r })),
		}
	},

	computed: {
		/** Operator ids for the select. */
		opIds() {
			return FILTER_OPERATORS.map((o) => o.id)
		},
	},

	methods: {
		t,

		/**
		 * Human label (`=`, `≠`, …) for an operator id.
		 * @param id
		 */
		opLabel(id) {
			const op = FILTER_OPERATORS.find((o) => o.id === id)
			return op ? op.label : id
		},

		/** Append a blank equality row. */
		add() {
			this.rows.push({ key: '', op: 'eq', value: '' })
			this.emit()
		},

		/**
		 * Remove a row by index.
		 * @param i
		 */
		remove(i) {
			this.rows.splice(i, 1)
			this.emit()
		},

		/**
		 * Update one cell of a row and emit.
		 * @param i
		 * @param cell
		 * @param value
		 */
		update(i, cell, value) {
			this.$set(this.rows[i], cell, value)
			this.emit()
		},

		/** Emit the current rows. */
		emit() {
			this.$emit('input', this.rows.map((r) => ({ ...r })))
		},
	},
}
</script>

<style scoped>
.cn-filter-rows {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-filter-rows__label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-filter-rows__row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.cn-filter-rows__row > *:first-child {
	flex: 2;
}

.cn-filter-rows__row > *:nth-child(2) {
	flex: 1;
	min-width: 90px;
}

.cn-filter-rows__row > *:nth-child(3) {
	flex: 2;
}

.cn-filter-rows__row :deep(.button-vue) {
	flex: 0 0 auto;
}
</style>
