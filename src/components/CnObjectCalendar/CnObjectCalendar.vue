<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-object-calendar">
		<header class="cn-object-calendar__header">
			<NcButton :aria-label="prevMonthLabel" @click="goToPreviousMonth">
				<template #icon>
					<ChevronLeft :size="20" />
				</template>
			</NcButton>
			<span class="cn-object-calendar__title">{{ monthLabel }}</span>
			<NcButton :aria-label="nextMonthLabel" @click="goToNextMonth">
				<template #icon>
					<ChevronRight :size="20" />
				</template>
			</NcButton>
		</header>

		<div v-if="loading" class="cn-object-calendar__loading">
			<NcLoadingIcon :size="32" />
		</div>

		<div v-else class="cn-object-calendar__month">
			<div
				v-for="(weekday, idx) in weekdayHeaders"
				:key="'wh-' + idx"
				class="cn-object-calendar__month-header">
				{{ weekday }}
			</div>
			<div
				v-for="day in monthGrid"
				:key="day.iso"
				class="cn-object-calendar__month-cell"
				:class="{ 'is-today': day.isToday, 'is-other-month': day.isOtherMonth }">
				<span class="cn-object-calendar__month-day">{{ day.dayNum }}</span>
				<ul v-if="day.objects.length" class="cn-object-calendar__month-events">
					<li
						v-for="object in day.objects.slice(0, maxEventsPerDay)"
						:key="objectKey(object) + '-' + day.iso"
						class="cn-object-calendar__event"
						:title="objectTitle(object)"
						@click="onObjectClick(object)">
						<!-- @slot day-event Override a single day's event entry. -->
						<!-- @binding {object} object The plotted object. -->
						<!-- @binding {object} day The day cell ({ iso, dayNum, isToday, isOtherMonth }). -->
						<slot name="day-event" :object="object" :day="day">
							{{ objectTitle(object) }}
						</slot>
					</li>
					<li
						v-if="day.objects.length > maxEventsPerDay"
						class="cn-object-calendar__overflow">
						+{{ day.objects.length - maxEventsPerDay }}
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'

/**
 * CnObjectCalendar — plots objects on a month calendar by a date property.
 *
 * Places each object on `dateField`; when `endDateField` is also configured,
 * an object spans every day from `dateField` to `endDateField` inclusive
 * (REQ-VIEW-CAL-04). The component only renders a window it is given —
 * `objects` is expected to already be scoped to the visible range (e.g. via
 * `GET /api/views/{id}/calendar?start=&end=`). Navigating months emits
 * `range-change` with the new window so the host re-fetches; the component
 * does not fetch anything itself.
 *
 * ```vue
 * <CnObjectCalendar
 *   :objects="objects"
 *   date-field="dueDate"
 *   end-date-field="endDate"
 *   v-model:visible-date="visibleDate"
 *   @range-change="fetchCalendarObjects"
 *   @object-click="openObject" />
 * ```
 */
export default {
	name: 'CnObjectCalendar',

	components: {
		NcButton,
		NcLoadingIcon,
		ChevronLeft,
		ChevronRight,
	},

	props: {
		/**
		 * Objects to plot. Expected to already be scoped to the visible range —
		 * e.g. the response of `GET /api/views/{id}/calendar?start=&end=`.
		 *
		 * @type {Array<object>}
		 */
		objects: {
			type: Array,
			default: () => [],
		},
		/** The date property an object is plotted on. */
		dateField: {
			type: String,
			required: true,
		},
		/** Optional end-date property — when set, an object spans `dateField`..`endDateField`. */
		endDateField: {
			type: String,
			default: null,
		},
		/**
		 * Any day within the currently visible month (`.sync`-compatible).
		 * Defaults to today when omitted.
		 *
		 * @type {string|Date|null}
		 */
		visibleDate: {
			type: [String, Date],
			default: null,
		},
		/** Object property used as a title fallback and as each object's identity. */
		titleField: {
			type: String,
			default: null,
		},
		/** Object property used as each object's identity (for `:key` and click payload matching). */
		rowKey: {
			type: String,
			default: 'id',
		},
		/** Loading state (host is (re)fetching the visible range). */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Maximum events shown per day cell before "+N" overflow. */
		maxEventsPerDay: {
			type: Number,
			default: 3,
		},
	},

	emits: ['object-click', 'range-change', 'update:visibleDate'],

	data() {
		return {
			internalDate: this.parseDate(this.visibleDate) || new Date(),
		}
	},

	computed: {
		monthLabel() {
			return this.internalDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
		},

		prevMonthLabel() {
			return t('nextcloud-vue', 'Previous month')
		},

		nextMonthLabel() {
			return t('nextcloud-vue', 'Next month')
		},

		/**
		 * Localised short weekday names (Sun-first, matching CnCalendarWidget).
		 *
		 * @return {string[]}
		 */
		weekdayHeaders() {
			return [
				t('nextcloud-vue', 'Sun'),
				t('nextcloud-vue', 'Mon'),
				t('nextcloud-vue', 'Tue'),
				t('nextcloud-vue', 'Wed'),
				t('nextcloud-vue', 'Thu'),
				t('nextcloud-vue', 'Fri'),
				t('nextcloud-vue', 'Sat'),
			]
		},

		/**
		 * The first/last day of the visible month.
		 *
		 * @return {{from: Date, to: Date}}
		 */
		monthRange() {
			const d = this.internalDate
			const first = new Date(d.getFullYear(), d.getMonth(), 1)
			const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
			return { from: first, to: last }
		},

		/**
		 * The full displayed grid window (month padded to whole Sun–Sat weeks) —
		 * this is the range emitted by `range-change`, since leading/trailing
		 * days from adjacent months are visible and should be requested too.
		 *
		 * @return {{from: Date, to: Date}}
		 */
		gridRange() {
			const { from, to } = this.monthRange
			const gridStart = new Date(from)
			gridStart.setDate(from.getDate() - from.getDay())
			const totalDays = Math.ceil((to.getDate() + from.getDay()) / 7) * 7
			const gridEnd = new Date(gridStart)
			gridEnd.setDate(gridStart.getDate() + totalDays - 1)
			return { from: gridStart, to: gridEnd }
		},

		/**
		 * Objects bucketed by every `YYYY-MM-DD` they occupy — a single day for
		 * a plain `dateField` object, or every day from `dateField` to
		 * `endDateField` inclusive when spanning.
		 *
		 * @return {{[iso: string]: object[]}}
		 */
		objectsByDay() {
			const buckets = {}
			const { from: gridStart, to: gridEnd } = this.gridRange

			for (const object of this.objects) {
				if (!object) continue
				const start = this.parseDate(object[this.dateField])
				if (!start) continue

				const rawEnd = this.endDateField ? this.parseDate(object[this.endDateField]) : null
				const end = rawEnd && rawEnd >= start ? rawEnd : start

				const spanStart = start < gridStart ? gridStart : start
				const spanEnd = end > gridEnd ? gridEnd : end

				for (const iso of this.isoDateRange(spanStart, spanEnd)) {
					if (!buckets[iso]) buckets[iso] = []
					buckets[iso].push(object)
				}
			}

			return buckets
		},

		/**
		 * The 7-column month grid (leading/trailing days padded to whole weeks).
		 *
		 * @return {Array<{iso: string, dayNum: number, isToday: boolean, isOtherMonth: boolean, objects: object[]}>}
		 */
		monthGrid() {
			const { from: gridStart, to: gridEnd } = this.gridRange
			const { from: monthStart } = this.monthRange
			const today = this.toIsoDate(new Date())
			const cells = []
			for (const iso of this.isoDateRange(gridStart, gridEnd)) {
				const cellDate = this.parseDate(iso)
				cells.push({
					iso,
					dayNum: cellDate.getDate(),
					isToday: today === iso,
					isOtherMonth: cellDate.getMonth() !== monthStart.getMonth(),
					objects: this.objectsByDay[iso] || [],
				})
			}
			return cells
		},
	},

	watch: {
		visibleDate(newValue) {
			const parsed = this.parseDate(newValue)
			if (!parsed) return
			if (this.toIsoDate(parsed).slice(0, 7) === this.toIsoDate(this.internalDate).slice(0, 7)) return
			this.internalDate = parsed
			this.emitRangeChange()
		},
	},

	created() {
		this.emitRangeChange()
	},

	methods: {
		t,

		/**
		 * Parse a date-ish value (Date instance, ISO string, or nullish) into a
		 * `Date`, or `null` when it can't be parsed.
		 *
		 * @param {string|Date|null|undefined} value The value to parse.
		 * @return {Date|null}
		 */
		parseDate(value) {
			if (!value) return null
			const date = value instanceof Date ? value : new Date(value)
			return Number.isNaN(date.getTime()) ? null : date
		},

		/**
		 * Format a `Date` as `YYYY-MM-DD` in local time (never UTC, so the grid
		 * and the bucketing agree regardless of timezone offset).
		 *
		 * @param {Date} date The date to format.
		 * @return {string}
		 */
		toIsoDate(date) {
			const y = date.getFullYear()
			const m = String(date.getMonth() + 1).padStart(2, '0')
			const d = String(date.getDate()).padStart(2, '0')
			return `${y}-${m}-${d}`
		},

		/**
		 * Every `YYYY-MM-DD` from `start` to `end` inclusive (both truncated to
		 * whole days), as a plain array — used so day-stepping loops reassign a
		 * counter rather than mutating a `Date` in a `while` condition.
		 *
		 * @param {Date} start The range start (inclusive).
		 * @param {Date} end The range end (inclusive).
		 * @return {string[]}
		 */
		isoDateRange(start, end) {
			const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
			const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
			const dayCount = Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1
			const isoDates = []
			for (let i = 0; i < dayCount; i++) {
				isoDates.push(this.toIsoDate(new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i)))
			}
			return isoDates
		},

		/**
		 * The object's identity, per `rowKey`.
		 *
		 * @param {object} object The object.
		 * @return {*}
		 */
		objectKey(object) {
			return object?.[this.rowKey]
		},

		/**
		 * Best-effort display title: `titleField` when configured, else
		 * `title`/`name`/the row key.
		 *
		 * @param {object} object The object.
		 * @return {string}
		 */
		objectTitle(object) {
			if (this.titleField && object[this.titleField]) return String(object[this.titleField])
			return String(object.title || object.name || object[this.rowKey] || '—')
		},

		/**
		 * Navigate to the previous month.
		 *
		 * @return {void}
		 */
		goToPreviousMonth() {
			const d = this.internalDate
			this.internalDate = new Date(d.getFullYear(), d.getMonth() - 1, 1)
			this.afterNavigate()
		},

		/**
		 * Navigate to the next month.
		 *
		 * @return {void}
		 */
		goToNextMonth() {
			const d = this.internalDate
			this.internalDate = new Date(d.getFullYear(), d.getMonth() + 1, 1)
			this.afterNavigate()
		},

		/**
		 * Sync `.sync` and notify the host to re-fetch after a month navigation.
		 *
		 * @return {void}
		 */
		afterNavigate() {
			// Description goes ABOVE `@event`, not inline after it:
			// vue-docgen-api's event-name splitter stops at the first `:`, so
			// `@event update:visibleDate <description>` is read as one long
			// event NAME and the generated docs show an empty description.
			// Only colon-bearing (`update:*`) names are affected.
			/**
			 * Emitted on month navigation, for `v-model:visible-date` binding.
			 *
			 * @event update:visibleDate
			 * @type {Date}
			 */
			this.$emit('update:visibleDate', this.internalDate)
			this.emitRangeChange()
		},

		/**
		 * Emit the currently visible grid window (padded to whole weeks) as
		 * ISO date strings, matching the OpenRegister calendar endpoint's
		 * `rangeStart`/`rangeEnd` query params.
		 *
		 * @return {void}
		 */
		emitRangeChange() {
			const { from, to } = this.gridRange
			/**
			 * @event range-change Emitted on mount and after every month
			 * navigation so the host can re-fetch objects for the new window.
			 * @type {{ rangeStart: string, rangeEnd: string }}
			 */
			this.$emit('range-change', {
				rangeStart: this.toIsoDate(from),
				rangeEnd: this.toIsoDate(to),
			})
		},

		/**
		 * Handle an event entry click.
		 *
		 * @param {object} object The clicked object.
		 * @return {void}
		 */
		onObjectClick(object) {
			/**
			 * @event object-click Emitted when a plotted object is clicked.
			 * @type {object} The clicked object.
			 */
			this.$emit('object-click', object)
		},
	},
}
</script>

<style scoped>
.cn-object-calendar__header {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 8px 0 16px;
}

.cn-object-calendar__title {
	min-width: 160px;
	text-align: center;
	font-weight: 600;
	font-size: 16px;
	text-transform: capitalize;
}

.cn-object-calendar__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40px;
}

.cn-object-calendar__month {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 1px;
	background: var(--color-border);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 8px);
	overflow: hidden;
}

.cn-object-calendar__month-header {
	background: var(--color-background-dark);
	padding: 6px 8px;
	font-size: 12px;
	font-weight: 600;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-object-calendar__month-cell {
	background: var(--color-main-background);
	min-height: 90px;
	padding: 4px;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-object-calendar__month-cell.is-other-month {
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.cn-object-calendar__month-day {
	font-size: 12px;
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.cn-object-calendar__month-cell.is-today .cn-object-calendar__month-day {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	border-radius: 50%;
}

.cn-object-calendar__month-events {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-object-calendar__event {
	font-size: 11px;
	padding: 1px 4px;
	border-radius: 4px;
	background: var(--color-primary-element-light);
	color: var(--color-main-text);
	cursor: pointer;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-object-calendar__overflow {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	padding: 0 4px;
}
</style>
