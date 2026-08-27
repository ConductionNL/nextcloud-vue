<!--
  CnDateRangePicker — preset-driven date range selector.

  Wraps two NcDateTimePicker instances + a preset NcSelect dropdown
  behind a single v-model. Selecting a preset (other than `custom`)
  auto-fills both pickers to `now − days` → `now`; selecting `custom`
  keeps the pickers manually editable so the user can dial in any
  span.

  Used internally by CnDashboardPage's date-range header and exposed
  publicly so bespoke screens (filter sidebars, report builders) can
  reuse the same control without composing the primitives themselves.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<div class="cn-date-range-picker" data-testid="cn-date-range-picker">
		<NcSelect
			class="cn-date-range-picker__preset"
			:model-value="selectedPresetOption"
			:options="presetOptions"
			:disabled="disabled"
			:clearable="false"
			:searchable="false"
			:aria-label="presetLabel"
			:input-label="presetLabel"
			label="label"
			data-testid="cn-date-range-picker-preset"
			@update:model-value="onPresetInput" />
		<NcDateTimePicker
			class="cn-date-range-picker__from"
			:model-value="fromDate"
			:disabled="disabled"
			:format="dateFormat"
			:aria-label="fromLabel"
			:placeholder="fromLabel"
			data-testid="cn-date-range-picker-from"
			@change="onFromChange" />
		<span class="cn-date-range-picker__separator" aria-hidden="true">→</span>
		<NcDateTimePicker
			class="cn-date-range-picker__to"
			:model-value="toDate"
			:disabled="disabled"
			:format="dateFormat"
			:aria-label="toLabel"
			:placeholder="toLabel"
			data-testid="cn-date-range-picker-to"
			@change="onToChange" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDateTimePicker, NcSelect } from '@nextcloud/vue'

/**
 * Default preset list used when the consumer doesn't provide one.
 * `days: null` marks the preset as a manual / custom range — selecting
 * it keeps the pickers editable without forcing a recomputed window.
 */
export const DEFAULT_DATE_RANGE_PRESETS = Object.freeze([
	{ id: 'last-8h', label: 'Last 8 hours', hours: 8 },
	{ id: 'last-24h', label: 'Last 24 hours', hours: 24 },
	{ id: 'today', label: 'Today', days: 1 },
	{ id: 'last-7', label: 'Last 7 days', days: 7 },
	{ id: 'last-30', label: 'Last 30 days', days: 30 },
	{ id: 'last-90', label: 'Last 90 days', days: 90 },
	{ id: 'custom', label: 'Custom range', days: null },
])

/**
 * Resolve a `period` preset into its calendar-aligned `{ from, to }`
 * window — the CURRENT week / month / quarter / year to date, not a
 * rolling span. ISO week semantics: weeks start on Monday.
 *
 * @param {'week'|'month'|'quarter'|'year'} period The calendar unit.
 * @param {Date} now Reference instant.
 * @return {{ from: string, to: string } | null} ISO-8601 UTC window or null.
 */
function resolveCalendarPeriod(period, now) {
	const y = now.getUTCFullYear()
	const m = now.getUTCMonth()
	const d = now.getUTCDate()
	let start
	if (period === 'week') {
		// getUTCDay() is 0 for Sunday; shift so Monday is the first day.
		const offset = (now.getUTCDay() + 6) % 7
		start = new Date(Date.UTC(y, m, d - offset, 0, 0, 0, 0))
	} else if (period === 'month') {
		start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
	} else if (period === 'quarter') {
		start = new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1, 0, 0, 0, 0))
	} else if (period === 'year') {
		start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0))
	} else {
		return null
	}
	const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999))
	return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * Resolve a preset id into a `{ from, to }` ISO-8601 UTC window
 * ending at end-of-day today. `custom` returns `null` (the caller
 * SHALL preserve the previously selected dates).
 *
 * Three preset kinds, checked in order — a preset SHALL declare only one:
 * `period` (calendar-aligned: current week/month/quarter/year to date),
 * `hours` (rolling window ending now), `days` (rolling window of whole
 * days ending end-of-day today).
 *
 * @param {string|null} presetId Preset id to resolve.
 * @param {Array<{ id: string, days?: number|null, hours?: number, period?: string }>} presets Preset list.
 * @param {Date} [now] Override `now` for deterministic tests.
 * @return {{ from: string, to: string } | null} ISO-8601 UTC window or null.
 */
export function resolvePresetWindow(presetId, presets, now = new Date()) {
	if (!presetId || presetId === 'custom') return null
	const preset = (presets || []).find((p) => p.id === presetId)
	if (!preset) return null
	// Calendar-aligned presets ("Current month") anchor to the start of the
	// calendar unit, NOT to `now − N days`. Checked first so a preset that
	// carries both `period` and a legacy `days` hint resolves as a period.
	if (typeof preset.period === 'string') {
		return resolveCalendarPeriod(preset.period, now)
	}
	// Hour-granularity presets are ROLLING windows ending at the exact
	// current instant — `now − N hours → now` — so "Last 8 hours" means
	// the trailing 8h, not a calendar-day-aligned span.
	if (typeof preset.hours === 'number') {
		const end = new Date(now.getTime())
		const start = new Date(now.getTime() - preset.hours * 3600000)
		return { from: start.toISOString(), to: end.toISOString() }
	}
	if (typeof preset.days !== 'number') return null
	// Day-granularity presets are calendar-aligned: midnight UTC start of
	// the (days-1)-th day back through end-of-day UTC today. `today`
	// (days=1) resolves to "00:00 → 23:59 of today".
	const end = new Date(Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
		23, 59, 59, 999,
	))
	const start = new Date(end)
	start.setUTCDate(start.getUTCDate() - (preset.days - 1))
	start.setUTCHours(0, 0, 0, 0)
	return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * CnDateRangePicker — preset-driven date range selector.
 *
 * ```vue
 * <CnDateRangePicker
 *   v-model="range"
 *   :presets="presets"
 *   :disabled="loading" />
 * ```
 *
 * The component owns layout. Selecting a preset (other than `custom`)
 * auto-fills both pickers from `now − days` → `now`. Selecting
 * `custom` keeps both pickers editable so the user can dial in any
 * arbitrary range; typing in either picker emits a `custom` value.
 *
 * The exported `DEFAULT_DATE_RANGE_PRESETS` list mirrors the defaults
 * applied by `CnDashboardPage` when its `dateRange.presets` is
 * omitted: today / last 7 / last 30 / last 90 / custom.
 */
export default {
	name: 'CnDateRangePicker',

	components: {
		NcDateTimePicker,
		NcSelect,
	},

	props: {
		/**
		 * Current range value. `from` / `to` are ISO-8601 UTC strings;
		 * `preset` is the id of the preset that produced the range (or
		 * `'custom'` when the user typed values by hand).
		 *
		 * @type {{ from: string, to: string, preset: string }|null}
		 */
		value: {
			type: Object,
			default: null,
		},
		/**
		 * The same value as `value`, under Vue 3's own v-model name.
		 *
		 * ⚠️ WITHOUT THIS, `v-model` ON THIS COMPONENT DOES NOTHING. Vue 3
		 * compiles `v-model="x"` to `:modelValue` + `@update:modelValue`, so a
		 * component declaring only `value`/`input` never receives the prop and
		 * its emit is never heard — silently, looking exactly like a component
		 * that works.
		 *
		 * `value` stays the public name; both are accepted. The default is
		 * `undefined` so "not passed" is distinguishable from "passed empty".
		 *
		 * @type {object|string}
		 */
		modelValue: { type: [Object,String], default: undefined },
		/**
		 * Preset list. Each entry declares ONE window kind: `period`
		 * (`'week'|'month'|'quarter'|'year'` — the current calendar unit
		 * to date, e.g. "Current month" = the 1st through today), `hours`
		 * (rolling window ending now), or `days` (rolling whole days
		 * ending today). Use `days: null` to mark a preset as manual (e.g.
		 * the canonical `custom` entry). Defaults to
		 * `DEFAULT_DATE_RANGE_PRESETS`.
		 *
		 * @type {Array<{ id: string, label: string, days?: number|null, hours?: number, period?: 'week'|'month'|'quarter'|'year' }>}
		 */
		presets: {
			type: Array,
			default: () => DEFAULT_DATE_RANGE_PRESETS.map((p) => ({ ...p })),
		},
		/**
		 * When `true`, both pickers AND the preset select are
		 * disabled. Mirrors `NcDateTimePicker.disabled`.
		 *
		 * @type {boolean}
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Date input visual format string, forwarded to the underlying
		 * `NcDateTimePicker`s. Default: `'yyyy-MM-dd'`.
		 *
		 * DATE-FNS TOKENS, not moment's. `@nextcloud/vue` 9 replaced the
		 * picker's moment.js backend with date-fns, which rejects `YYYY`
		 * (year-of-week) and `DD` (day-of-year) where `yyyy` / `dd` are meant —
		 * and it THROWS rather than warning, so the whole picker fails to render.
		 * This default was `'YYYY-MM-DD'`, correct under v8 and broken under v9:
		 * the component threw with its own default props until the real-render
		 * smoke lane surfaced it. A consumer still passing a moment-style string
		 * needs the same substitution.
		 *
		 * @type {string}
		 */
		dateFormat: {
			type: String,
			default: 'yyyy-MM-dd',
		},
		/**
		 * Accessible label for the preset dropdown.
		 *
		 * @type {string}
		 */
		presetLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Range preset'),
		},
		/**
		 * Accessible label for the start-of-range picker.
		 *
		 * @type {string}
		 */
		fromLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'From'),
		},
		/**
		 * Accessible label for the end-of-range picker.
		 *
		 * @type {string}
		 */
		toLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'To'),
		},
	},

	emits: ['input', 'update:modelValue',],

	computed: {
		/**
		 * The value the consumer actually bound, whichever prop they used.
		 *
		 * @return {*} The bound value.
		 */
		boundValue() {
			return this.modelValue !== undefined ? this.modelValue : this.value
		},
		fromDate() {
			return this.boundValue?.from ? new Date(this.boundValue.from) : null
		},
		toDate() {
			return this.boundValue?.to ? new Date(this.boundValue.to) : null
		},
		selectedPresetId() {
			return this.boundValue?.preset || 'custom'
		},
		presetOptions() {
			return this.presets.map((p) => ({ id: p.id, label: p.label, days: p.days }))
		},
		selectedPresetOption() {
			const match = this.presetOptions.find((p) => p.id === this.selectedPresetId)
			// Fall back to the first option if the current preset id
			// isn't in the provided list (e.g. consumer removed `today`).
			return match || this.presetOptions[0] || null
		},
	},

	methods: {
		/**
		 * Tell the consumer the value changed, in both v-model dialects.
		 *
		 * BOTH are emitted, always: a consumer on `@input` and a consumer on
		 * `v-model` are the same consumer as far as this component knows, and
		 * emitting only one silently breaks half of them.
		 *
		 * @param {*} next The new value.
		 * @return {void}
		 */
		emitValue(next) {
			/**
			 * @event input The value changed. Vue 2's v-model dialect, kept for
			 *   existing consumers.
			 * @type {*}
			 */
			this.$emit('input', next)
			/**
			 * @event update:modelValue The value changed. Vue 3's v-model
			 *   dialect — what a plain `v-model` listens for.
			 * @type {*}
			 */
			this.$emit('update:modelValue', next)
		},
		/**
		 * Handle a preset selection. When the preset has a numeric
		 * `days` value we recompute the window; for `custom` (or any
		 * preset with `days: null`) we keep the current `from` / `to`
		 * and only flip `preset` so the parent knows the user opted
		 * into manual editing.
		 *
		 * @param {{ id: string, days: number|null } | null} option
		 *   The selected option (NcSelect emits the full option object).
		 */
		onPresetInput(option) {
			if (!option) return
			const win = resolvePresetWindow(option.id, this.presets)
			if (win) {
				/**
				 * @event input v-model emit. Payload: `{ from, to, preset }` where `from`/`to` are ISO-8601 timestamps (or null) and `preset` is one of the preset ids or `'custom'`.
				 * @type {{ from: string|null, to: string|null, preset: string }}
				 */
				this.emitValue({ from: win.from, to: win.to, preset: option.id })
			} else {
				// Custom or null-days preset → keep the existing window,
				// just change the preset id.
				const from = this.boundValue?.from || null
				const to = this.boundValue?.to || null
				/**
				 * @event input v-model emit. Payload: `{ from, to, preset }` where `from`/`to` are ISO-8601 timestamps (or null) and `preset` is one of the preset ids or `'custom'`.
				 */
				this.emitValue({ from, to, preset: option.id })
			}
		},

		/**
		 * Handle a manual edit of the `from` date input. Typing into
		 * either picker switches the preset id to `custom` so the
		 * parent / dashboard knows the user dialled in a bespoke
		 * window.
		 *
		 * @param {Date|null} date The new date.
		 */
		onFromChange(date) {
			const from = date ? toIsoStartOfDay(date) : null
			const to = this.boundValue?.to || null
			/**
			 * @event input v-model emit. Payload: `{ from, to, preset }` where `from`/`to` are ISO-8601 timestamps (or null) and `preset` is one of the preset ids or `'custom'`.
			 */
			this.emitValue({ from, to, preset: 'custom' })
		},

		/**
		 * Handle a manual edit of the `to` date input.
		 *
		 * @param {Date|null} date The new date.
		 */
		onToChange(date) {
			const from = this.boundValue?.from || null
			const to = date ? toIsoEndOfDay(date) : null
			/**
			 * @event input v-model emit. Payload: `{ from, to, preset }` where `from`/`to` are ISO-8601 timestamps (or null) and `preset` is one of the preset ids or `'custom'`.
			 */
			this.emitValue({ from, to, preset: 'custom' })
		},
	},
}

/**
 * Coerce a JS Date to the ISO-8601 string at start-of-day UTC.
 *
 * @param {Date} date Source date.
 * @return {string} ISO-8601 UTC string at 00:00:00.000Z.
 */
function toIsoStartOfDay(date) {
	const d = new Date(Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		0, 0, 0, 0,
	))
	return d.toISOString()
}

/**
 * Coerce a JS Date to the ISO-8601 string at end-of-day UTC.
 *
 * @param {Date} date Source date.
 * @return {string} ISO-8601 UTC string at 23:59:59.999Z.
 */
function toIsoEndOfDay(date) {
	const d = new Date(Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		23, 59, 59, 999,
	))
	return d.toISOString()
}
</script>

<style scoped>
.cn-date-range-picker {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.cn-date-range-picker__preset {
	min-width: 180px;
}

.cn-date-range-picker__from,
.cn-date-range-picker__to {
	min-width: 160px;
}

.cn-date-range-picker__separator {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}
</style>
