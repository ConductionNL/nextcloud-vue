<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-duration-field">
		<div v-if="!rawMode" class="cn-duration-field__row">
			<NcTextField
				class="cn-duration-field__amount"
				type="number"
				:label="inputLabel"
				:modelValue="amountText"
				:disabled="disabled"
				:error="error"
				@update:modelValue="onAmount" />
			<NcSelect
				class="cn-duration-field__unit"
				:inputLabel="unitLabel"
				:modelValue="unitOption"
				:options="unitOptions"
				:clearable="false"
				:disabled="disabled"
				label="label"
				@update:modelValue="onUnit" />
		</div>
		<div v-else class="cn-duration-field__row">
			<NcTextField
				class="cn-duration-field__iso"
				:label="inputLabel"
				:modelValue="rawText"
				:readonly="!editIso"
				:disabled="disabled"
				:error="error || (editIso && !validIso)"
				@update:modelValue="onIso" />
			<NcButton
				v-if="!disabled"
				data-testid="cn-duration-edit-iso"
				@click="editIso = !editIso">
				{{ t('nextcloud-vue', 'Edit as ISO') }}
			</NcButton>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import { DURATION_UNITS, formatDuration, isIsoDuration, parseDuration } from '../../utils/isoDuration.js'

/**
 * CnDurationField — edits an ISO 8601 duration as a number plus a unit
 * (minutes, hours, days, weeks, months, years). `CnFormDialog` renders it for
 * `type: string, format: duration`.
 *
 * `P56D` shows 56 and days; changing the unit writes the canonical string.
 * A value that is not exactly one unit (`P1DT2H`) shows as read-only ISO text
 * with an "Edit as ISO" toggle, so nothing is rounded. Clearing the number
 * writes `null`.
 *
 * Example:
 * ```vue
 * <CnDurationField v-model="term" input-label="Handling term" />
 * ```
 */
export default {
	name: 'CnDurationField',

	components: { NcButton, NcSelect, NcTextField },

	props: {
		/** ISO 8601 duration string (v-model), or null. */
		modelValue: {
			type: String,
			default: null,
		},

		/** Accessible label of the number input. */
		inputLabel: {
			type: String,
			default: '',
		},

		/** Accessible label of the unit select. */
		unitLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Unit'),
		},

		/** Disable both inputs. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** Show the inputs in their error state. */
		error: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			unit: 'days',
			editIso: false,
			draftIso: null,
		}
	},

	computed: {
		parsed() {
			return parseDuration(this.modelValue)
		},

		hasValue() {
			return this.modelValue !== null && this.modelValue !== undefined && this.modelValue !== ''
		},

		// A non-empty value that is not one unit is shown as ISO text.
		rawMode() {
			return this.editIso || (this.hasValue && this.parsed === null)
		},

		rawText() {
			return this.draftIso !== null ? this.draftIso : (this.modelValue || '')
		},

		validIso() {
			return isIsoDuration(this.rawText)
		},

		currentUnit() {
			return this.parsed ? this.parsed.unit : this.unit
		},

		amountText() {
			return this.parsed ? String(this.parsed.amount) : ''
		},

		unitOptions() {
			const labels = {
				minutes: t('nextcloud-vue', 'minutes'),
				hours: t('nextcloud-vue', 'hours'),
				days: t('nextcloud-vue', 'days'),
				weeks: t('nextcloud-vue', 'weeks'),
				months: t('nextcloud-vue', 'months'),
				years: t('nextcloud-vue', 'years'),
			}
			return DURATION_UNITS.map((u) => ({ id: u, label: labels[u] }))
		},

		unitOption() {
			return this.unitOptions.find((o) => o.id === this.currentUnit) || null
		},
	},

	methods: {
		onAmount(value) {
			/** @event update:modelValue The ISO string for the chosen amount and unit; null when the amount is cleared. */
			this.$emit('update:modelValue', formatDuration(value, this.currentUnit))
		},

		onUnit(option) {
			if (!option) {
				return
			}
			this.unit = option.id
			if (this.parsed) {
				this.$emit('update:modelValue', formatDuration(this.parsed.amount, option.id))
			}
		},

		onIso(value) {
			this.draftIso = value
			if (isIsoDuration(value)) {
				this.$emit('update:modelValue', value)
			} else if (value === '') {
				this.$emit('update:modelValue', null)
			}
		},
	},
}
</script>

<style scoped>
.cn-duration-field__row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.cn-duration-field__amount,
.cn-duration-field__iso {
	flex: 1 1 auto;
}

.cn-duration-field__unit {
	min-width: 140px;
}
</style>
