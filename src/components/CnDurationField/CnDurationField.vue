<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-duration-field">
		<div v-if="timer" class="cn-duration-field__row cn-duration-field__row--timer">
			<NcTextField
				class="cn-duration-field__clock"
				:label="inputLabel"
				:modelValue="clockText"
				:disabled="disabled"
				:error="error || clockInvalid"
				:helperText="clockInvalid ? t('nextcloud-vue', 'Enter minutes, or minutes and seconds as 04:23.') : hint"
				data-testid="cn-duration-clock"
				@update:modelValue="onClock" />
			<div
				class="cn-duration-field__controls"
				role="group"
				:aria-label="timerLabel">
				<NcButton
					v-if="!running"
					:disabled="disabled"
					data-testid="cn-duration-start"
					@click="start">
					{{ t('nextcloud-vue', 'Start') }}
				</NcButton>
				<NcButton
					v-else
					:disabled="disabled"
					data-testid="cn-duration-stop"
					@click="stop">
					{{ t('nextcloud-vue', 'Stop') }}
				</NcButton>
				<NcButton
					variant="tertiary"
					:disabled="disabled"
					data-testid="cn-duration-reset"
					@click="reset">
					{{ t('nextcloud-vue', 'Reset') }}
				</NcButton>
			</div>
			<span
				class="cn-duration-field__state"
				:class="{ 'cn-duration-field__state--running': running }"
				role="status"
				data-testid="cn-duration-state">{{ stateText }}</span>
		</div>
		<div v-else-if="!rawMode" class="cn-duration-field__row">
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
		<div
			v-if="timer && normSeconds"
			class="cn-duration-field__norm"
			:class="`cn-duration-field__norm--${normLevel}`"
			data-testid="cn-duration-norm">
			<div class="cn-duration-field__norm-line">
				<span>{{ normText }}</span>
				<span>{{ normPercent }}%</span>
				<span v-if="normWords" data-testid="cn-duration-norm-words">{{ normWords }}</span>
			</div>
			<NcProgressBar
				:value="Math.min(normPercent, 100)"
				:error="normLevel === 'over'"
				:aria-label="normText" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcProgressBar, NcSelect, NcTextField } from '@nextcloud/vue'
import {
	DURATION_UNITS,
	durationSeconds,
	formatClock,
	formatDuration,
	isIsoDuration,
	parseClock,
	parseDuration,
	secondsToDuration,
} from '../../utils/isoDuration.js'

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
 * With `timer` the field is a clock: Start, Stop and Reset run it, and it writes
 * the running time into the value every second, so a form saved mid-run holds it.
 * Typing a time stops the clock and keeps what was typed. `autoStart` starts it
 * when the field holds no value yet. `norm` shows the time against a length.
 *
 * Example:
 * ```vue
 * <CnDurationField v-model="term" input-label="Handling term" />
 * <CnDurationField v-model="length" input-label="Duration" timer auto-start norm="PT5M" />
 * ```
 */
export default {
	name: 'CnDurationField',

	components: { NcButton, NcProgressBar, NcSelect, NcTextField },

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

		/** Draw the field as a clock with Start, Stop and Reset. */
		timer: {
			type: Boolean,
			default: false,
		},

		/** With `timer`: start the clock when the field holds no value yet. */
		autoStart: {
			type: Boolean,
			default: false,
		},

		/** With `timer`: an ISO 8601 length to show the time against. */
		norm: {
			type: String,
			default: null,
		},

		/** Percentage of `norm` from which the bar warns. */
		normWarningPercent: {
			type: Number,
			default: 80,
		},

		/** Words before the time on the norm line. */
		normLabel: {
			type: String,
			default: '',
		},

		/** Accessible name of the Start, Stop and Reset group. */
		timerLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Timer'),
		},

		/** With `timer`: a line under the clock. */
		hint: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue', 'started', 'stopped', 'reset'],

	data() {
		return {
			unit: 'days',
			editIso: false,
			draftIso: null,
			running: false,
			hasRun: false,
			startedAt: 0,
			secondsBefore: 0,
			elapsed: 0,
			clockDraft: null,
			interval: null,
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

		clockInvalid() {
			return this.clockDraft !== null && this.clockDraft.trim() !== '' && parseClock(this.clockDraft) === null
		},

		clockText() {
			if (this.clockDraft !== null) {
				return this.clockDraft
			}
			return this.running || this.hasValue ? formatClock(this.elapsed) : ''
		},

		stateText() {
			if (this.running) {
				return t('nextcloud-vue', 'Running')
			}
			return this.hasRun ? t('nextcloud-vue', 'Stopped') : ''
		},

		normSeconds() {
			return this.norm ? durationSeconds(this.norm) : null
		},

		normPercent() {
			return this.normSeconds ? Math.round((this.elapsed / this.normSeconds) * 100) : 0
		},

		normLevel() {
			if (this.normPercent >= 100) {
				return 'over'
			}
			return this.normPercent >= this.normWarningPercent ? 'near' : 'within'
		},

		normWords() {
			if (this.normLevel === 'over') {
				return t('nextcloud-vue', 'Over the norm')
			}
			return this.normLevel === 'near' ? t('nextcloud-vue', 'Close to the norm') : ''
		},

		normText() {
			const amount = t('nextcloud-vue', '{elapsed} of {norm}', {
				elapsed: formatClock(this.elapsed),
				norm: formatClock(this.normSeconds),
			})
			return this.normLabel ? `${this.normLabel} ${amount}` : amount
		},
	},

	watch: {
		// The clock owns the value while it runs; the echo of its own write is ignored.
		modelValue: {
			immediate: true,
			handler(value) {
				if (!this.running) {
					this.elapsed = durationSeconds(value) ?? 0
				}
				if (this.clockDraft !== null && secondsToDuration(parseClock(this.clockDraft)) !== value) {
					this.clockDraft = null
				}
			},
		},

		autoStart() {
			this.maybeAutoStart()
		},
	},

	mounted() {
		this.maybeAutoStart()
	},

	beforeUnmount() {
		clearInterval(this.interval)
	},

	methods: {
		t,

		maybeAutoStart() {
			if (this.timer && this.autoStart && !this.disabled && !this.hasRun && !this.hasValue) {
				this.start()
			}
		},

		/**
		 * Run the clock from the time it shows now.
		 *
		 * @spec openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-duration-field-can-run-as-a-clock
		 */
		start() {
			if (this.running) {
				return
			}
			this.clockDraft = null
			this.secondsBefore = this.elapsed
			this.startedAt = Date.now()
			this.running = true
			this.hasRun = true
			this.interval = setInterval(this.tick, 1000)
			/** @event started The clock started. */
			this.$emit('started')
		},

		// Counted from the start time, because a background tab throttles intervals.
		tick() {
			this.elapsed = this.secondsBefore + Math.floor((Date.now() - this.startedAt) / 1000)
			this.$emit('update:modelValue', secondsToDuration(this.elapsed))
		},

		halt() {
			clearInterval(this.interval)
			this.interval = null
			this.running = false
		},

		/**
		 * Stop the clock and write the final time.
		 *
		 * @spec openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-duration-field-can-run-as-a-clock
		 */
		stop() {
			if (!this.running) {
				return
			}
			this.tick()
			this.halt()
			const value = secondsToDuration(this.elapsed)
			/** @event stopped The clock stopped; carries the ISO string of the time. */
			this.$emit('stopped', value)
		},

		/**
		 * Stop the clock and clear the value.
		 *
		 * @spec openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-duration-field-can-run-as-a-clock
		 */
		reset() {
			this.halt()
			this.elapsed = 0
			this.clockDraft = null
			this.hasRun = false
			this.$emit('update:modelValue', null)
			/** @event reset The clock stopped and the value was cleared. */
			this.$emit('reset')
		},

		onClock(text) {
			const seconds = parseClock(text)
			this.clockDraft = text
			if (String(text).trim() === '') {
				this.halt()
				this.elapsed = 0
				this.$emit('update:modelValue', null)
			} else if (seconds !== null) {
				this.halt()
				this.elapsed = seconds
				this.$emit('update:modelValue', secondsToDuration(seconds))
			}
		},

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

.cn-duration-field__row--timer {
	flex-wrap: wrap;
}

.cn-duration-field__clock {
	flex: 0 1 160px;
	font-variant-numeric: tabular-nums;
}

.cn-duration-field__controls {
	display: flex;
	gap: 4px;
}

.cn-duration-field__state {
	align-self: center;
	color: var(--color-text-maxcontrast);
}

.cn-duration-field__state--running {
	color: var(--color-success-text);
	font-weight: bold;
}

.cn-duration-field__norm {
	margin-top: 8px;
}

.cn-duration-field__norm-line {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: space-between;
	margin-bottom: 4px;
	font-variant-numeric: tabular-nums;
}

.cn-duration-field__norm--near .cn-duration-field__norm-line {
	color: var(--color-warning-text);
}

.cn-duration-field__norm--over .cn-duration-field__norm-line {
	color: var(--color-error-text);
}
</style>
