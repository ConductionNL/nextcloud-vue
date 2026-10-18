<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-ordered-list-field" data-testid="cn-ordered-list-field">
		<p v-if="label" :id="labelId" class="cn-ordered-list-field__label">
			{{ label }}
		</p>
		<ol
			v-if="rows.length > 0"
			class="cn-ordered-list-field__rows"
			:aria-labelledby="label ? labelId : null"
			:aria-label="label ? null : listLabel">
			<li
				v-for="(row, index) in rows"
				:key="row.value"
				class="cn-ordered-list-field__row"
				:data-testid="`cn-ordered-list-row-${row.value}`">
				<span class="cn-ordered-list-field__position" aria-hidden="true">{{ index + 1 }}</span>
				<span v-if="row.icon" class="cn-ordered-list-field__tile" aria-hidden="true">
					<CnIcon :name="row.icon" :size="18" />
				</span>
				<span class="cn-ordered-list-field__text">
					<span class="cn-ordered-list-field__name">{{ row.label }}</span>
					<span v-if="row.description"
						:id="descriptionId(row)"
						class="cn-ordered-list-field__description"
						:data-testid="`cn-ordered-list-description-${row.value}`">{{ row.description }}</span>
				</span>
				<span class="cn-ordered-list-field__actions">
					<button
						type="button"
						class="cn-ordered-list-field__button"
						:disabled="disabled || index === 0"
						:aria-label="t('nextcloud-vue', 'Move {item} up', { item: row.label })"
						:data-testid="`cn-ordered-list-up-${row.value}`"
						:aria-describedby="row.description ? descriptionId(row) : null"
						@click="move(index, index - 1)">
						<ChevronUp :size="20" />
					</button>
					<button
						type="button"
						class="cn-ordered-list-field__button"
						:disabled="disabled || index === rows.length - 1"
						:aria-label="t('nextcloud-vue', 'Move {item} down', { item: row.label })"
						:data-testid="`cn-ordered-list-down-${row.value}`"
						:aria-describedby="row.description ? descriptionId(row) : null"
						@click="move(index, index + 1)">
						<ChevronDown :size="20" />
					</button>
					<button
						type="button"
						class="cn-ordered-list-field__button"
						:disabled="disabled"
						:aria-label="t('nextcloud-vue', 'Remove {item}', { item: row.label })"
						:data-testid="`cn-ordered-list-remove-${row.value}`"
						:aria-describedby="row.description ? descriptionId(row) : null"
						@click="remove(index)">
						<Close :size="20" />
					</button>
				</span>
			</li>
		</ol>
		<p v-else class="cn-ordered-list-field__empty" data-testid="cn-ordered-list-empty">
			{{ emptyText || t('nextcloud-vue', 'Nothing added yet.') }}
		</p>
		<div v-if="!disabled" class="cn-ordered-list-field__add">
			<NcSelect
				:modelValue="null"
				:options="available"
				label="label"
				:inputLabel="addLabel || t('nextcloud-vue', 'Add')"
				:placeholder="addPlaceholder"
				:loading="loading"
				:clearable="false"
				:filterable="!searchable"
				data-testid="cn-ordered-list-add"
				@search="onSearch"
				@update:modelValue="add">
				<template #option="option">
					<span class="cn-ordered-list-field__option">
						<span v-if="option.icon" class="cn-ordered-list-field__tile" aria-hidden="true">
							<CnIcon :name="option.icon" :size="18" />
						</span>
						<span class="cn-ordered-list-field__text">
							<span class="cn-ordered-list-field__name">{{ option.label }}</span>
							<span v-if="option.description" class="cn-ordered-list-field__description">{{ option.description }}</span>
						</span>
					</span>
				</template>
			</NcSelect>
		</div>
		<p class="hidden-visually" aria-live="polite" data-testid="cn-ordered-list-live">
			{{ announcement }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Close from 'vue-material-design-icons/Close.vue'
import CnIcon from '../CnIcon/CnIcon.vue'

let orderedListUid = 0

/**
 * CnOrderedListField - an ordered list a user keeps for themselves: rows in
 * their order with a move up, a move down and a remove button each, and a
 * search-as-you-type picker under it that adds a row (board
 * DqPersoonlijkeInstellingen, "Zaaktypen in mijn menu").
 *
 * The app supplies the choices (`options`) and keeps the value: every change
 * emits `update:modelValue` with the new list of values. With `searchable`
 * the picker emits `search` as the user types, so the app can fetch matching
 * choices itself; otherwise it filters `options`. Every move is announced in a
 * polite live region, so reordering works with the keyboard and a screen
 * reader, not by dragging.
 *
 * ```vue
 * <CnOrderedListField
 *   v-model="menuCaseTypes"
 *   label="Case types in my menu"
 *   add-label="Add case type"
 *   :options="caseTypes" />
 * ```
 *
 * @spec openspec/changes/ordered-list-field/specs/ordered-list-field/spec.md#requirement-a-user-keeps-an-ordered-list-with-the-keyboard
 */
export default {
	name: 'CnOrderedListField',

	components: { ChevronDown, ChevronUp, Close, CnIcon, NcSelect },

	props: {
		/** The values in their order. */
		modelValue: {
			type: Array,
			default: () => [],
		},

		/**
		 * The choices, `{ value, label, description?, icon? }` (a plain string
		 * is its own label). `description` is a muted second line ("19 open
		 * cases"), in the row and in the picker; `icon` an MDI name drawn in a
		 * small tile before the label. A value in `modelValue` without a
		 * choice shows the value itself.
		 */
		options: {
			type: Array,
			default: () => [],
		},

		/** The list's label, also its accessible name. */
		label: {
			type: String,
			default: '',
		},

		/** The picker's label. */
		addLabel: {
			type: String,
			default: '',
		},

		/** Placeholder in the picker. */
		addPlaceholder: {
			type: String,
			default: '',
		},

		/** Shown when the list is empty. */
		emptyText: {
			type: String,
			default: '',
		},

		/** Whether the app searches (`search` event) instead of the picker filtering `options`. */
		searchable: {
			type: Boolean,
			default: false,
		},

		/** Whether the app is fetching choices. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** A read-only list: no buttons and no picker. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue', 'search'],

	data() {
		orderedListUid += 1
		return {
			labelId: `cn-ordered-list-label-${orderedListUid}`,
			announcement: '',
		}
	},

	computed: {
		/** @return {Array<{value: string, label: string}>} The choices in one shape. */
		choices() {
			return (Array.isArray(this.options) ? this.options : [])
				.map((option) => (option && typeof option === 'object'
					? {
							value: String(option.value ?? option.id ?? ''),
							label: String(option.label ?? option.title ?? option.value ?? ''),
							description: typeof option.description === 'string' ? option.description : '',
							icon: typeof option.icon === 'string' ? option.icon : '',
						}
					: { value: String(option), label: String(option), description: '', icon: '' }))
				.filter((option) => option.value !== '')
		},

		/** @return {Array<{value: string, label: string, description: string, icon: string}>} The rows, in order. */
		rows() {
			return (Array.isArray(this.modelValue) ? this.modelValue : []).map((value) => {
				const key = String(value)
				const choice = this.choices.find((option) => option.value === key)
				return choice || { value: key, label: key, description: '', icon: '' }
			})
		},

		/** @return {Array<{value: string, label: string}>} The choices not in the list yet. */
		available() {
			const taken = new Set(this.rows.map((row) => row.value))
			return this.choices.filter((option) => !taken.has(option.value))
		},

		/** @return {string} The list's accessible name without a label. */
		listLabel() {
			return t('nextcloud-vue', 'Ordered list')
		},
	},

	methods: {
		t,

		/**
		 * The id of a row's description, which its buttons name as their description.
		 *
		 * @param {{value: string}} row The row.
		 * @return {string}
		 */
		descriptionId(row) {
			return `${this.labelId}-desc-${String(row.value).replace(/[^\w-]/g, '-')}`
		},

		/**
		 * Emit the new order.
		 *
		 * @param {Array<string>} values The values.
		 */
		emitValue(values) {
			/**
			 * @event update:modelValue The list changed. Payload: the values in their order.
			 */
			this.$emit('update:modelValue', values)
		},

		/**
		 * Move a row to another place and keep focus on the pressed button
		 * where it still makes sense.
		 *
		 * @param {number} from Its index.
		 * @param {number} to The index it moves to.
		 */
		move(from, to) {
			if (to < 0 || to >= this.rows.length) {
				return
			}
			const values = this.rows.map((row) => row.value)
			const [value] = values.splice(from, 1)
			values.splice(to, 0, value)
			const row = this.rows[from]
			this.emitValue(values)
			this.announcement = t('nextcloud-vue', '{item} moved to position {position} of {total}', { item: row.label, position: to + 1, total: values.length })
			this.$nextTick(() => {
				const direction = to < from ? 'up' : 'down'
				const atEdge = (direction === 'up' && to === 0) || (direction === 'down' && to === values.length - 1)
				const target = this.$el.querySelector(`[data-testid="cn-ordered-list-${atEdge ? (direction === 'up' ? 'down' : 'up') : direction}-${row.value}"]`)
				if (target && !target.disabled) {
					target.focus()
				}
			})
		},

		/**
		 * Remove a row.
		 *
		 * @param {number} index Its index.
		 */
		remove(index) {
			const row = this.rows[index]
			this.emitValue(this.rows.filter((_, i) => i !== index).map((r) => r.value))
			this.announcement = t('nextcloud-vue', '{item} removed', { item: row.label })
		},

		/**
		 * Add the picked choice at the end.
		 *
		 * @param {{value: string, label: string}|null} option The choice.
		 */
		add(option) {
			if (!option) {
				return
			}
			this.emitValue([...this.rows.map((row) => row.value), option.value])
			this.announcement = t('nextcloud-vue', '{item} added', { item: option.label })
		},

		/**
		 * Pass the typed text on when the app searches.
		 *
		 * @param {string} query The text.
		 */
		onSearch(query) {
			if (this.searchable) {
				/**
				 * @event search The user typed in the picker (with `searchable`). Payload: the text.
				 */
				this.$emit('search', query)
			}
		},
	},
}
</script>

<style scoped>
.cn-ordered-list-field {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.cn-ordered-list-field__label {
	margin: 0;
	font-weight: 600;
}

.cn-ordered-list-field__rows {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-element, 8px);
	list-style: none;
}

.cn-ordered-list-field__row {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: 44px;
	padding: 2px 6px 2px 12px;
}

.cn-ordered-list-field__row + .cn-ordered-list-field__row {
	border-top: 1px solid var(--color-border);
}

.cn-ordered-list-field__position {
	flex: none;
	min-width: 18px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	font-variant-numeric: tabular-nums;
}

.cn-ordered-list-field__text {
	flex: 1 1 auto;
	min-width: 0;
	overflow-wrap: anywhere;
}

.cn-ordered-list-field__actions {
	display: flex;
	flex: none;
	gap: 2px;
}

.cn-ordered-list-field__button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	min-width: 40px;
	height: 40px;
	min-height: 40px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: var(--border-radius-element, 8px);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-ordered-list-field__button:hover:not(:disabled) {
	background: var(--color-background-hover);
}

.cn-ordered-list-field__button:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 1px;
}

.cn-ordered-list-field__button:disabled {
	opacity: 0.4;
	cursor: default;
}

.cn-ordered-list-field__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-ordered-list-field__tile {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-background-dark);
	color: var(--color-main-text);
}

.cn-ordered-list-field__name {
	display: block;
}

.cn-ordered-list-field__description {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-ordered-list-field__option {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}
</style>
