<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-view-presentation" data-testid="cn-view-presentation-picker">
		<fieldset class="cn-view-presentation__types">
			<legend>{{ t('nextcloud-vue', 'Show as') }}</legend>
			<div v-for="type in types" :key="type.id" class="cn-view-presentation__type">
				<NcCheckboxRadioSwitch
					:modelValue="viewType"
					:value="type.id"
					type="radio"
					name="cn-view-presentation-type"
					:disabled="disabled || type.reason !== ''"
					:data-testid="`cn-view-presentation-type-${type.id}`"
					@update:modelValue="() => pickType(type.id)">
					{{ type.label }}
				</NcCheckboxRadioSwitch>
				<span v-if="type.reason" class="cn-view-presentation__reason" :data-testid="`cn-view-presentation-reason-${type.id}`">{{ type.reason }}</span>
			</div>
		</fieldset>

		<div v-if="viewType === 'kanban'" class="cn-view-presentation__fields" data-testid="cn-view-presentation-kanban">
			<NcSelect
				:inputLabel="t('nextcloud-vue', 'Group by')"
				:modelValue="groupOption"
				:options="candidates.group"
				:clearable="false"
				:disabled="disabled"
				label="label"
				data-testid="cn-view-presentation-group"
				@update:modelValue="pickGroup" />
			<p v-if="errors['kanban.groupByField']"
				class="cn-view-presentation__error"
				role="alert"
				data-testid="cn-view-presentation-error-kanban.groupByField">
				{{ errors['kanban.groupByField'] }}
			</p>
			<NcSelect
				:inputLabel="t('nextcloud-vue', 'Card fields (at most {max})', { max: maxCardFields })"
				:modelValue="cardOptions"
				:options="cardChoices"
				:multiple="true"
				:disabled="disabled"
				label="label"
				data-testid="cn-view-presentation-cards"
				@update:modelValue="pickCards" />
			<div v-if="orderedColumns.length > 0" class="cn-view-presentation__order" data-testid="cn-view-presentation-order">
				<span class="cn-view-presentation__order-label">{{ t('nextcloud-vue', 'Column order') }}</span>
				<ol>
					<li v-for="(column, index) in orderedColumns" :key="column">
						<span>{{ column }}</span>
						<NcButton
							variant="tertiary"
							:disabled="disabled || index === 0"
							:aria-label="t('nextcloud-vue', 'Move {column} up', { column })"
							data-testid="cn-view-presentation-up"
							@click="moveColumn(index, -1)">
							<template #icon>
								<ChevronUp :size="20" />
							</template>
						</NcButton>
						<NcButton
							variant="tertiary"
							:disabled="disabled || index === orderedColumns.length - 1"
							:aria-label="t('nextcloud-vue', 'Move {column} down', { column })"
							data-testid="cn-view-presentation-down"
							@click="moveColumn(index, 1)">
							<template #icon>
								<ChevronDown :size="20" />
							</template>
						</NcButton>
					</li>
				</ol>
			</div>
		</div>

		<div v-if="viewType === 'calendar'" class="cn-view-presentation__fields" data-testid="cn-view-presentation-calendar">
			<NcSelect
				:inputLabel="t('nextcloud-vue', 'Date field')"
				:modelValue="dateOption('dateField')"
				:options="candidates.date"
				:clearable="false"
				:disabled="disabled"
				label="label"
				data-testid="cn-view-presentation-date"
				@update:modelValue="(o) => pickDate('dateField', o)" />
			<p v-if="errors['calendar.dateField']"
				class="cn-view-presentation__error"
				role="alert"
				data-testid="cn-view-presentation-error-calendar.dateField">
				{{ errors['calendar.dateField'] }}
			</p>
			<NcSelect
				:inputLabel="t('nextcloud-vue', 'End date field (optional)')"
				:modelValue="dateOption('endDateField')"
				:options="candidates.date"
				:clearable="true"
				:disabled="disabled"
				label="label"
				data-testid="cn-view-presentation-end-date"
				@update:modelValue="(o) => pickDate('endDateField', o)" />
			<p v-if="errors['calendar.endDateField']"
				class="cn-view-presentation__error"
				role="alert"
				data-testid="cn-view-presentation-error-calendar.endDateField">
				{{ errors['calendar.endDateField'] }}
			</p>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import { MAX_CARD_FIELDS, presentationCandidates } from '../../utils/presentationCandidates.js'

/**
 * CnViewPresentationPicker — choose how a saved view shows: a table, a board
 * grouped by a status field, or a calendar by a date field.
 *
 * Takes the view's JSON `schema` and a presentation `value`, and emits `input`
 * with a presentation in OpenRegister's shape only: `{ viewType: "table" }`,
 * `{ viewType: "kanban", kanban: { groupByField, cardFields?, columnOrder? } }`
 * or `{ viewType: "calendar", calendar: { dateField, endDateField? } }`. Each
 * field picker offers only the schema properties that can serve its role; a
 * type whose required role has no candidate is disabled with the reason.
 * Switching type drops the other type's settings, so a board turned back into
 * a table emits `{ viewType: "table" }`. `CnSaveViewDialog` and the saved-view
 * presentation dialog carry it.
 *
 * Example:
 * ```vue
 * <CnViewPresentationPicker :schema="schema" :value="presentation" @input="presentation = $event" />
 * ```
 */
export default {
	name: 'CnViewPresentationPicker',

	components: { ChevronDown, ChevronUp, NcButton, NcCheckboxRadioSwitch, NcSelect },

	props: {
		/** The view's JSON Schema (with `properties`), which decides what each role offers. */
		schema: {
			type: Object,
			default: null,
		},

		/**
		 * The current presentation, in OpenRegister's shape. Empty reads as a table.
		 *
		 * @type {{viewType: string, kanban?: object, calendar?: object}}
		 */
		value: {
			type: Object,
			default: () => ({ viewType: 'table' }),
		},

		/** Disable every control. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/**
		 * A refusal message per path, shown under the picker it is about:
		 * `kanban.groupByField`, `calendar.dateField`, `calendar.endDateField`.
		 *
		 * @type {{[path: string]: string}}
		 */
		errors: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['input'],

	computed: {
		maxCardFields() {
			return MAX_CARD_FIELDS
		},

		candidates() {
			return presentationCandidates(this.schema)
		},

		viewType() {
			const type = this.value && this.value.viewType
			return type === 'kanban' || type === 'calendar' ? type : 'table'
		},

		types() {
			return [
				{ id: 'table', label: t('nextcloud-vue', 'Table'), reason: '' },
				{ id: 'kanban', label: t('nextcloud-vue', 'Board'), reason: this.candidates.reasons.kanban },
				{ id: 'calendar', label: t('nextcloud-vue', 'Calendar'), reason: this.candidates.reasons.calendar },
			]
		},

		kanban() {
			return (this.value && this.value.kanban) || {}
		},

		calendar() {
			return (this.value && this.value.calendar) || {}
		},

		groupOption() {
			return this.candidates.group.find((g) => g.key === this.kanban.groupByField) || null
		},

		cardOptions() {
			const chosen = Array.isArray(this.kanban.cardFields) ? this.kanban.cardFields : []
			return chosen.map((key) => this.candidates.card.find((c) => c.key === key)).filter(Boolean)
		},

		// Once four are chosen, no further option is offered.
		cardChoices() {
			return this.cardOptions.length >= MAX_CARD_FIELDS ? [] : this.candidates.card.filter((c) => !this.cardOptions.some((o) => o.key === c.key))
		},

		// The columns of the chosen group field, in the stored order (new values last).
		orderedColumns() {
			const values = this.groupOption && this.groupOption.values ? this.groupOption.values : []
			const stored = Array.isArray(this.kanban.columnOrder) ? this.kanban.columnOrder.filter((v) => values.includes(v)) : []
			return [...stored, ...values.filter((v) => !stored.includes(v))]
		},
	},

	methods: {
		t,

		emitValue(value) {
			/** @event input The presentation in OpenRegister's shape. */
			this.$emit('input', value)
		},

		pickType(id) {
			if (id === this.viewType) {
				return
			}
			if (id === 'kanban') {
				const first = this.candidates.group[0]
				this.emitValue({ viewType: 'kanban', kanban: first ? { groupByField: first.key } : {} })
			} else if (id === 'calendar') {
				const first = this.candidates.date[0]
				this.emitValue({ viewType: 'calendar', calendar: first ? { dateField: first.key } : {} })
			} else {
				this.emitValue({ viewType: 'table' })
			}
		},

		pickGroup(option) {
			if (!option) {
				return
			}
			// A new group field has other columns: card fields stay, the order does not.
			const kanban = { groupByField: option.key }
			if (Array.isArray(this.kanban.cardFields) && this.kanban.cardFields.length > 0) {
				kanban.cardFields = this.kanban.cardFields
			}
			this.emitValue({ viewType: 'kanban', kanban })
		},

		pickCards(options) {
			const keys = (Array.isArray(options) ? options : []).map((o) => o.key).slice(0, MAX_CARD_FIELDS)
			const kanban = { ...this.kanban }
			if (keys.length > 0) {
				kanban.cardFields = keys
			} else {
				delete kanban.cardFields
			}
			this.emitValue({ viewType: 'kanban', kanban })
		},

		moveColumn(index, delta) {
			const order = [...this.orderedColumns]
			const target = index + delta
			if (target < 0 || target >= order.length) {
				return
			}
			const [moved] = order.splice(index, 1)
			order.splice(target, 0, moved)
			this.emitValue({ viewType: 'kanban', kanban: { ...this.kanban, columnOrder: order } })
		},

		dateOption(role) {
			return this.candidates.date.find((d) => d.key === this.calendar[role]) || null
		},

		pickDate(role, option) {
			const calendar = { ...this.calendar }
			if (option) {
				calendar[role] = option.key
			} else {
				delete calendar[role]
			}
			this.emitValue({ viewType: 'calendar', calendar })
		},
	},
}
</script>

<style scoped>
.cn-view-presentation {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-view-presentation__types {
	border: 0;
	margin: 0;
	padding: 0;
}

.cn-view-presentation__reason {
	margin-inline-start: 36px;
	color: var(--color-text-maxcontrast);
}

.cn-view-presentation__fields {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-view-presentation__error {
	margin: 0;
	color: var(--color-error-text);
}

.cn-view-presentation__order ol {
	list-style: none;
	margin: 4px 0 0;
	padding: 0;
}

.cn-view-presentation__order li {
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-view-presentation__order li > span {
	flex: 1 1 auto;
}
</style>
