<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-cron-field">
		<NcSelect
			:model-value="presetOption"
			:options="presetOptions"
			:input-label="label"
			:disabled="disabled"
			:clearable="false"
			@update:model-value="onPreset" />

		<!-- Only the controls the chosen schedule actually uses. A "every day"
		     schedule has no weekday to pick, and showing one greyed out invites
		     the user to wonder what it would do. -->
		<div v-if="preset !== 'custom'" class="cn-cron-field__parts">
			<NcSelect
				v-if="usesMinute"
				:model-value="minuteOption"
				:options="minuteOptions"
				:input-label="t('nextcloud-vue', 'Minute')"
				:disabled="disabled"
				:clearable="false"
				@update:model-value="onPart('minute', $event)" />

			<NcSelect
				v-if="usesHour"
				:model-value="hourOption"
				:options="hourOptions"
				:input-label="t('nextcloud-vue', 'Hour')"
				:disabled="disabled"
				:clearable="false"
				@update:model-value="onPart('hour', $event)" />

			<NcSelect
				v-if="preset === 'weekly'"
				:model-value="weekdayOption"
				:options="weekdayOptions"
				:input-label="t('nextcloud-vue', 'Day of the week')"
				:disabled="disabled"
				:clearable="false"
				@update:model-value="onPart('weekday', $event)" />

			<NcSelect
				v-if="preset === 'monthly'"
				:model-value="monthdayOption"
				:options="monthdayOptions"
				:input-label="t('nextcloud-vue', 'Day of the month')"
				:disabled="disabled"
				:clearable="false"
				@update:model-value="onPart('monthday', $event)" />
		</div>

		<!-- The expression itself is always reachable, and is the only control
		     in `custom` mode. A builder that hides the value it produces cannot
		     express the schedules cron can, and cannot be checked by someone who
		     already knows what they want. -->
		<NcTextField
			:model-value="modelValue"
			:label="t('nextcloud-vue', 'Cron expression')"
			:disabled="disabled"
			:error="error !== null"
			:helper-text="error || summary"
			@update:model-value="onExpression" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcTextField } from '@nextcloud/vue'
import { describeCron, isValidCron, parseCron } from '../../utils/cron.js'

/**
 * A schedule builder that writes a standard five-field cron expression.
 *
 * Cron is a precise notation and an unreadable one. `0 9 * * 1` is exact, and
 * nobody reads it at a glance — so a bare text box asks every author to know a
 * syntax in order to say "every Monday morning", and gives no feedback until
 * the schedule fails to fire at a time nobody is watching.
 *
 * This renders the common schedules as choices, keeps the expression visible
 * and editable, and describes whatever is in it in plain language. The three
 * are the same value: picking a preset rewrites the expression, and typing an
 * expression re-selects the preset it matches (or `custom`, which is not a
 * failure state — it is every schedule the presets cannot name).
 *
 * The output is always five fields. `@daily` and friends are deliberately not
 * produced: what accepts them varies by scheduler, and a schedule that
 * validates and never fires is worse than one that is refused.
 *
 * ```vue
 * <CnCronField v-model="config.cron" :label="t('myapp', 'Runs')" />
 * ```
 */
export default {
	name: 'CnCronField',

	components: { NcSelect, NcTextField },

	props: {
		/** The cron expression, as five space-separated fields. */
		modelValue: {
			type: String,
			default: '',
		},
		/** Label for the schedule picker. */
		label: {
			type: String,
			default: '',
		},
		/** Whether every control is disabled. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			/** Which named schedule the current expression matches. */
			preset: 'custom',
		}
	},

	computed: {
		/**
		 * @return {Array<object>} The named schedules offered.
		 */
		presetOptions() {
			return [
				{ id: 'hourly', label: t('nextcloud-vue', 'Every hour') },
				{ id: 'daily', label: t('nextcloud-vue', 'Every day') },
				{ id: 'weekly', label: t('nextcloud-vue', 'Every week') },
				{ id: 'monthly', label: t('nextcloud-vue', 'Every month') },
				{ id: 'custom', label: t('nextcloud-vue', 'Custom…') },
			]
		},

		/**
		 * @return {object} The selected preset, as NcSelect wants it.
		 */
		presetOption() {
			return this.presetOptions.find((o) => o.id === this.preset) || this.presetOptions[4]
		},

		/**
		 * @return {boolean} Whether the chosen schedule needs a minute.
		 */
		usesMinute() {
			return ['hourly', 'daily', 'weekly', 'monthly'].includes(this.preset)
		},

		/**
		 * @return {boolean} Whether the chosen schedule needs an hour.
		 */
		usesHour() {
			return ['daily', 'weekly', 'monthly'].includes(this.preset)
		},

		/**
		 * @return {Array<object>} Minute choices, every five minutes.
		 */
		minuteOptions() {
			return Array.from({ length: 12 }, (_, i) => ({
				id: String(i * 5),
				label: String(i * 5).padStart(2, '0'),
			}))
		},

		/**
		 * @return {Array<object>} Hour choices, 0-23.
		 */
		hourOptions() {
			return Array.from({ length: 24 }, (_, i) => ({
				id: String(i),
				label: `${String(i).padStart(2, '0')}:00`,
			}))
		},

		/**
		 * @return {Array<object>} Weekday choices. Cron counts Sunday as 0.
		 */
		weekdayOptions() {
			return [
				{ id: '1', label: t('nextcloud-vue', 'Monday') },
				{ id: '2', label: t('nextcloud-vue', 'Tuesday') },
				{ id: '3', label: t('nextcloud-vue', 'Wednesday') },
				{ id: '4', label: t('nextcloud-vue', 'Thursday') },
				{ id: '5', label: t('nextcloud-vue', 'Friday') },
				{ id: '6', label: t('nextcloud-vue', 'Saturday') },
				{ id: '0', label: t('nextcloud-vue', 'Sunday') },
			]
		},

		/**
		 * @return {Array<object>} Day-of-month choices, 1-28.
		 */
		monthdayOptions() {
			// Stops at 28 on purpose: a schedule on the 31st silently skips the
			// months that do not have one, which is a bug the author cannot see
			// until February.
			return Array.from({ length: 28 }, (_, i) => ({
				id: String(i + 1),
				label: String(i + 1),
			}))
		},

		/**
		 * @return {object|null} The selected minute.
		 */
		minuteOption() {
			return this.minuteOptions.find((o) => o.id === this.parts.minute) || null
		},

		/**
		 * @return {object|null} The selected hour.
		 */
		hourOption() {
			return this.hourOptions.find((o) => o.id === this.parts.hour) || null
		},

		/**
		 * @return {object|null} The selected weekday.
		 */
		weekdayOption() {
			return this.weekdayOptions.find((o) => o.id === this.parts.weekday) || null
		},

		/**
		 * @return {object|null} The selected day of the month.
		 */
		monthdayOption() {
			return this.monthdayOptions.find((o) => o.id === this.parts.monthday) || null
		},

		/**
		 * @return {object} The current expression split into named fields.
		 */
		parts() {
			return parseCron(this.modelValue)
		},

		/**
		 * @return {string|null} Why the expression is refused, or null.
		 */
		error() {
			if (String(this.modelValue || '').trim() === '') {
				return null
			}

			return isValidCron(this.modelValue)
				? null
				: t('nextcloud-vue', 'Not a valid cron expression. Five fields: minute, hour, day of the month, month, day of the week.')
		},

		/**
		 * @return {string} The expression in plain language.
		 */
		summary() {
			return describeCron(this.modelValue) || t('nextcloud-vue', 'For example 0 9 * * 1 — 09:00 every Monday.')
		},
	},

	watch: {
		modelValue: {
			immediate: true,
			handler() {
				this.preset = this.detectPreset()
			},
		},
	},

	methods: {
		t,

		/**
		 * Which named schedule the current expression is, if any.
		 *
		 * @return {string} The preset id, or `custom`.
		 */
		detectPreset() {
			const p = this.parts
			if (isValidCron(this.modelValue) === false) {
				return 'custom'
			}

			const numeric = (v) => /^\d+$/.test(v)
			if (numeric(p.minute) === false) {
				return 'custom'
			}

			if (p.hour === '*' && p.monthday === '*' && p.month === '*' && p.weekday === '*') {
				return 'hourly'
			}
			if (numeric(p.hour) && p.monthday === '*' && p.month === '*' && p.weekday === '*') {
				return 'daily'
			}
			if (numeric(p.hour) && p.monthday === '*' && p.month === '*' && numeric(p.weekday)) {
				return 'weekly'
			}
			if (numeric(p.hour) && numeric(p.monthday) && p.month === '*' && p.weekday === '*') {
				return 'monthly'
			}

			return 'custom'
		},

		/**
		 * Switch to a named schedule, keeping the time already chosen.
		 *
		 * @param {object|null} option The chosen preset.
		 * @return {void}
		 */
		onPreset(option) {
			const id = option?.id || 'custom'
			this.preset = id
			if (id === 'custom') {
				return
			}

			const p = this.parts
			// Carry the time across rather than resetting it. Someone who set
			// 09:00 and then switched from daily to weekly meant "weekly, at the
			// time I already picked", not "weekly, at midnight".
			const minute = /^\d+$/.test(p.minute) ? p.minute : '0'
			const hour = /^\d+$/.test(p.hour) ? p.hour : '9'

			const built = {
				hourly: `${minute} * * * *`,
				daily: `${minute} ${hour} * * *`,
				weekly: `${minute} ${hour} * * ${/^\d+$/.test(p.weekday) ? p.weekday : '1'}`,
				monthly: `${minute} ${hour} ${/^\d+$/.test(p.monthday) ? p.monthday : '1'} * *`,
			}[id]

			/**
			 * @event update:modelValue The cron expression changed. Always five
			 *   space-separated fields, never a `@shortcut` — which scheduler
			 *   resolves those varies, and a schedule that validates and never
			 *   fires is worse than one that is refused.
			 * @type {string}
			 */
			this.$emit('update:modelValue', built)
		},

		/**
		 * Change one field of the built expression.
		 *
		 * @param {string} which  Which part — minute, hour, weekday, monthday.
		 * @param {object|null} option The chosen value.
		 * @return {void}
		 */
		onPart(which, option) {
			if (option === null || option === undefined) {
				return
			}

			const p = { ...this.parts, [which]: option.id }
			this.$emit('update:modelValue', `${p.minute} ${p.hour} ${p.monthday} ${p.month} ${p.weekday}`)
		},

		/**
		 * Take a hand-typed expression verbatim.
		 *
		 * Emitted even when invalid: rejecting keystrokes makes the field
		 * impossible to type in, since almost every prefix of a valid
		 * expression is itself invalid. The error text says what is wrong and
		 * the caller decides whether to save it.
		 *
		 * @param {string} value The typed expression.
		 * @return {void}
		 */
		onExpression(value) {
			this.$emit('update:modelValue', value)
		},
	},
}
</script>

<style scoped>
.cn-cron-field {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-cron-field__parts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-cron-field__parts > * {
	flex: 1 1 140px;
}
</style>
