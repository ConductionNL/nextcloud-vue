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

		<div
			v-else
			class="cn-object-calendar__month"
			role="grid"
			:aria-label="monthLabel">
			<div class="cn-object-calendar__week" role="row">
				<div
					v-for="(weekday, idx) in weekdayHeaders"
					:key="'wh-' + idx"
					class="cn-object-calendar__month-header"
					role="columnheader">
					{{ weekday }}
				</div>
			</div>
			<div
				v-for="(week, w) in weeks"
				:key="'w-' + w"
				class="cn-object-calendar__week"
				role="row">
				<div
					v-for="day in week"
					:key="day.iso"
					class="cn-object-calendar__month-cell"
					:class="{ 'is-today': day.isToday, 'is-other-month': day.isOtherMonth }"
					role="gridcell"
					:data-iso="day.iso"
					:tabindex="day.iso === activeIso ? 0 : -1"
					:aria-label="dayLabel(day)"
					@focus="focusedIso = day.iso"
					@keydown="onCellKeydown($event, day)">
					<span class="cn-object-calendar__month-day">{{ day.dayNum }}</span>
					<ul v-if="day.objects.length" class="cn-object-calendar__month-events">
						<li
							v-for="object in day.objects.slice(0, maxEventsPerDay)"
							:key="objectKey(object) + '-' + day.iso"
							class="cn-object-calendar__event-item">
							<button
								type="button"
								class="cn-object-calendar__event"
								:title="objectTitle(object)"
								@click="onObjectClick(object)">
								<!-- @slot day-event Override a single day's event entry. -->
								<!-- @binding {object} object The plotted object. -->
								<!-- @binding {object} day The day cell ({ iso, dayNum, isToday, isOtherMonth }). -->
								<slot name="day-event" :object="object" :day="day">
									{{ objectTitle(object) }}
								</slot>
							</button>
						</li>
						<li
							v-if="day.objects.length > maxEventsPerDay"
							class="cn-object-calendar__overflow-item">
							<button
								type="button"
								class="cn-object-calendar__overflow"
								:aria-label="overflowLabel(day)"
								@click="$emit('day-select', day.iso)">
								+{{ day.objects.length - maxEventsPerDay }}
							</button>
						</li>
					</ul>
				</div>
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

	emits: [
		'object-click',
		'range-change',
		'update:visibleDate',
		/**
		 * The "+N" button of a busy day was activated. Payload: the day as `YYYY-MM-DD`.
		 *
		 * @event day-select
		 * @type {string}
		 */
		'day-select',
	],

	data() {
		return {
			internalDate: this.parseDate(this.visibleDate) || new Date(),
			// The day cell that holds focus (roving tabindex); empty = today or the 1st.
			focusedIso: '',
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
				if (!object) {
					continue
				}
				const start = this.parseDate(object[this.dateField])
				if (!start) {
					continue
				}

				const rawEnd = this.endDateField ? this.parseDate(object[this.endDateField]) : null
				const end = rawEnd && rawEnd >= start ? rawEnd : start

				const spanStart = start < gridStart ? gridStart : start
				const spanEnd = end > gridEnd ? gridEnd : end

				for (const iso of this.isoDateRange(spanStart, spanEnd)) {
					if (!buckets[iso]) {
						buckets[iso] = []
					}
					buckets[iso].push(object)
				}
			}

			return buckets
		},

		/**
		 * The month grid cut into weeks, for the grid/row roles.
		 *
		 * @return {Array<Array<object>>}
		 */
		weeks() {
			const rows = []
			for (let i = 0; i < this.monthGrid.length; i += 7) {
				rows.push(this.monthGrid.slice(i, i + 7))
			}
			return rows
		},

		/**
		 * The day cell that takes the tab stop: the focused one when it is in
		 * the grid, else today, else the 1st of the month.
		 *
		 * @return {string} `YYYY-MM-DD`.
		 */
		activeIso() {
			const isos = this.monthGrid.map((d) => d.iso)
			if (this.focusedIso && isos.includes(this.focusedIso)) {
				return this.focusedIso
			}
			const today = this.toIsoDate(new Date())
			if (isos.includes(today)) {
				return today
			}
			return this.toIsoDate(this.monthRange.from)
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
			if (!parsed) {
				return
			}
			if (this.toIsoDate(parsed).slice(0, 7) === this.toIsoDate(this.internalDate).slice(0, 7)) {
				return
			}
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
			if (!value) {
				return null
			}
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
		 * @return {unknown}
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
			if (this.titleField && object[this.titleField]) {
				return String(object[this.titleField])
			}
			return String(object.title || object.name || object[this.rowKey] || '—')
		},

		/**
		 * Accessible name of a day cell: the date and how many records it holds.
		 *
		 * @param {{iso: string, objects: object[]}} day The day.
		 * @return {string}
		 */
		dayLabel(day) {
			const date = this.parseDate(day.iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
			return day.objects.length === 0 ? date : `${date}, ${t('nextcloud-vue', '{count} records', { count: day.objects.length })}`
		},

		/**
		 * Accessible name of the "+N" button.
		 *
		 * @param {{iso: string, objects: object[]}} day The day.
		 * @return {string}
		 */
		overflowLabel(day) {
			return t('nextcloud-vue', 'Show all {count} records on {date}', { count: day.objects.length, date: day.iso })
		},

		/**
		 * Move between day cells with the arrow keys, Home and End. Past the
		 * edge of the grid the month moves with it.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @param {{iso: string}} day The focused day.
		 */
		onCellKeydown(event, day) {
			if (event.target !== event.currentTarget) {
				return
			}
			const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
			const here = this.parseDate(day.iso)
			let target = null
			if (event.key in steps) {
				target = new Date(here.getFullYear(), here.getMonth(), here.getDate() + steps[event.key])
			} else if (event.key === 'Home') {
				target = new Date(here.getFullYear(), here.getMonth(), here.getDate() - here.getDay())
			} else if (event.key === 'End') {
				target = new Date(here.getFullYear(), here.getMonth(), here.getDate() + (6 - here.getDay()))
			}
			if (!target) {
				return
			}
			event.preventDefault()
			const iso = this.toIsoDate(target)
			if (!this.monthGrid.some((d) => d.iso === iso)) {
				// Off the edge: move to the month that holds the day.
				this.internalDate = new Date(target.getFullYear(), target.getMonth(), 1)
				this.afterNavigate()
			}
			this.focusedIso = iso
			this.$nextTick(() => {
				const cell = this.$el.querySelector(`[data-iso="${iso}"]`)
				if (cell) {
					cell.focus()
				}
			})
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

.cn-object-calendar__week {
	display: contents;
}

.cn-object-calendar__month-cell:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

button.cn-object-calendar__event,
button.cn-object-calendar__overflow {
	display: block;
	width: 100%;
	min-height: 0;
	border: 0;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	border-radius: var(--border-radius, 4px);
	padding: 1px 6px;
	font: inherit;
	font-size: 12px;
	text-align: start;
	cursor: pointer;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

button.cn-object-calendar__overflow {
	background: transparent;
	color: var(--color-text-maxcontrast);
}
</style>
