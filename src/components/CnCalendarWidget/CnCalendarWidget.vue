<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-calendar-widget">
		<header class="cn-calendar-widget__header">
			<span class="cn-calendar-widget__title">{{ t('nextcloud-vue', 'Calendar') }}</span>
			<div class="cn-calendar-widget__modes">
				<button
					v-for="mode in viewModes"
					:key="mode"
					type="button"
					class="cn-calendar-widget__mode-btn"
					:class="{ 'is-active': activeMode === mode }"
					@click="setMode(mode)">
					{{ modeLabel(mode) }}
				</button>
			</div>
		</header>

		<div class="cn-calendar-widget__body">
			<div v-if="loading" class="cn-calendar-widget__state">
				{{ t('nextcloud-vue', 'Loading calendars…') }}
			</div>

			<div v-else-if="error" class="cn-calendar-widget__state cn-calendar-widget__state--error">
				<p>{{ t('nextcloud-vue', 'Failed to load events') }}</p>
				<button type="button" class="cn-calendar-widget__retry" @click="fetchEvents">
					{{ t('nextcloud-vue', 'Retry') }}
				</button>
			</div>

			<div v-else-if="!hasSource" class="cn-calendar-widget__state">
				{{ t('nextcloud-vue', 'No calendar available') }}
			</div>

			<div v-else-if="events.length === 0 && activeMode === 'agenda'" class="cn-calendar-widget__state">
				{{ emptyMessage }}
			</div>

			<!-- Month view: 7-column grid padded to whole weeks. -->
			<div v-else-if="activeMode === 'month'" class="cn-calendar-widget__month">
				<div
					v-for="(weekday, idx) in weekdayHeaders"
					:key="'wh-' + idx"
					class="cn-calendar-widget__month-header">
					{{ weekday }}
				</div>
				<div
					v-for="day in monthGrid"
					:key="day.iso"
					class="cn-calendar-widget__month-cell"
					:class="{ 'is-today': day.isToday, 'is-other-month': day.isOtherMonth }">
					<span class="cn-calendar-widget__month-day">{{ day.dayNum }}</span>
					<ul v-if="day.events.length" class="cn-calendar-widget__month-events">
						<li
							v-for="event in day.events.slice(0, 3)"
							:key="event.uid + '-' + event.start"
							class="cn-calendar-widget__month-event"
							:title="event.title"
							:style="eventStyle(event)">
							{{ event.title }}
						</li>
						<li
							v-if="day.events.length > 3"
							class="cn-calendar-widget__month-overflow">
							+{{ day.events.length - 3 }}
						</li>
					</ul>
				</div>
			</div>

			<!-- Week view: 7 day columns. -->
			<div v-else-if="activeMode === 'week'" class="cn-calendar-widget__week">
				<div
					v-for="day in weekDays"
					:key="day.iso"
					class="cn-calendar-widget__week-col"
					:class="{ 'is-today': day.isToday }">
					<header class="cn-calendar-widget__week-day">
						<span class="cn-calendar-widget__week-name">{{ day.weekday }}</span>
						<span class="cn-calendar-widget__week-num">{{ day.dayNum }}</span>
					</header>
					<ul v-if="day.events.length" class="cn-calendar-widget__week-events">
						<li
							v-for="event in day.events"
							:key="event.uid + '-' + event.start"
							class="cn-calendar-widget__week-event"
							:style="eventStyle(event)">
							<span class="cn-calendar-widget__week-time">{{ formatTime(event) }}</span>
							<span class="cn-calendar-widget__week-title">{{ event.title }}</span>
						</li>
					</ul>
					<p v-else class="cn-calendar-widget__week-empty">
						—
					</p>
				</div>
			</div>

			<!-- Agenda view: chronological list grouped by day. -->
			<ul v-else class="cn-calendar-widget__agenda">
				<template v-for="group in agendaGroups">
					<li :key="'h-' + group.iso" class="cn-calendar-widget__agenda-header">
						{{ group.label }}
					</li>
					<li
						v-for="event in group.events"
						:key="event.uid + '-' + event.start"
						class="cn-calendar-widget__agenda-row"
						:style="eventStyle(event)">
						<span class="cn-calendar-widget__agenda-time">{{ formatTime(event) }}</span>
						<span class="cn-calendar-widget__agenda-title">{{ event.title }}</span>
						<span v-if="event.calendarName" class="cn-calendar-widget__agenda-cal">{{ event.calendarName }}</span>
					</li>
				</template>
			</ul>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

const VIEW_MODES = ['month', 'week', 'agenda']
const DEFAULT_DAYS_AHEAD = 14

/**
 * CnCalendarWidget — renders aggregated upcoming events as a chronological,
 * per-day grouped agenda.
 *
 * Data origin (decoupling seam): events are read through a consumer-supplied
 * `dataSource` prop OR the `cnCalendarSource` injection — an object exposing
 * `fetchEvents({ from, to }) => Promise<{ events, failures }>`. The canonical
 * backing is the Nextcloud Calendar app (internal calendars + external ICS
 * feeds) surfaced by the consuming app; this renderer never imports a
 * sibling-app module path nor assumes a backend route. When neither prop nor
 * injection is supplied the widget shows an empty agenda ("No calendar
 * available") and performs no request; an empty result simply renders the
 * "no events" empty state.
 *
 * No event field is ever rendered via `v-html` — all values flow through Vue
 * interpolation, so a malicious ICS feed cannot inject markup.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnCalendarWidget',

	inject: {
		cnCalendarSource: {
			default: null,
		},
	},

	props: {
		/**
		 * Persisted widget content `{viewMode, daysAhead, colorByCalendar}`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Consumer-supplied data source overriding the `cnCalendarSource`
		 * injection. Must expose `fetchEvents({from, to}) => Promise<{events,
		 * failures}>`. When `null` the injection (then the empty state) is used.
		 *
		 * @type {object|null}
		 */
		dataSource: {
			type: Object,
			default: null,
		},
	},

	data() {
		const initialMode = VIEW_MODES.includes(this.content && this.content.viewMode)
			? this.content.viewMode
			: 'agenda'
		return {
			activeMode: initialMode,
			events: [],
			failures: [],
			loading: false,
			error: null,
			today: new Date(),
		}
	},

	computed: {
		/**
		 * The available view modes.
		 *
		 * @return {string[]} the mode keys.
		 */
		viewModes() {
			return VIEW_MODES
		},

		/**
		 * The active data source (prop wins over injection).
		 *
		 * @return {object|null} the resolved source, or `null`.
		 */
		source() {
			const candidate = this.dataSource || this.cnCalendarSource
			return candidate && typeof candidate.fetchEvents === 'function' ? candidate : null
		},

		/**
		 * Whether a usable calendar source is configured.
		 *
		 * @return {boolean} true when a source exists.
		 */
		hasSource() {
			return this.source !== null
		},

		/**
		 * The validated look-ahead window in days.
		 *
		 * @return {number} the days-ahead value.
		 */
		daysAhead() {
			const value = parseInt((this.content && this.content.daysAhead) ?? DEFAULT_DAYS_AHEAD, 10)
			return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAYS_AHEAD
		},

		/**
		 * Whether events are tinted by their calendar colour.
		 *
		 * @return {boolean} the colorByCalendar flag.
		 */
		colorByCalendar() {
			return !(this.content && this.content.colorByCalendar === false)
		},

		/**
		 * The empty-agenda message.
		 *
		 * @return {string} the empty message.
		 */
		emptyMessage() {
			return t('nextcloud-vue', 'No events in the next {n} days').replace('{n}', String(this.daysAhead))
		},

		/**
		 * Localised short weekday names (Sun-first).
		 *
		 * @return {string[]} the weekday labels.
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
		 * The first/last day of the current month (month-view window).
		 *
		 * @return {{from: Date, to: Date}} the month window.
		 */
		monthRange() {
			const today = this.today
			const first = new Date(today.getFullYear(), today.getMonth(), 1)
			const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
			return { from: first, to: last }
		},

		/**
		 * The Sun–Sat window containing today (week-view window).
		 *
		 * @return {{from: Date, to: Date}} the week window.
		 */
		weekRange() {
			const today = this.today
			const start = new Date(today)
			start.setDate(today.getDate() - today.getDay())
			start.setHours(0, 0, 0, 0)
			const end = new Date(start)
			end.setDate(start.getDate() + 6)
			end.setHours(23, 59, 59, 999)
			return { from: start, to: end }
		},

		/**
		 * Events bucketed by `YYYY-MM-DD` for grid lookup.
		 *
		 * @return {Object<string, object[]>} iso-date → events.
		 */
		eventsByDay() {
			const buckets = {}
			for (const event of this.events) {
				const iso = this.toIsoDate(this.parseDate(event.start))
				if (!buckets[iso]) {
					buckets[iso] = []
				}
				buckets[iso].push(event)
			}
			return buckets
		},

		/**
		 * The 7-column month grid (leading/trailing days padded to whole weeks).
		 *
		 * @return {Array<object>} grid cells with day metadata + events.
		 */
		monthGrid() {
			const { from, to } = this.monthRange
			const cells = []
			const gridStart = new Date(from)
			gridStart.setDate(from.getDate() - from.getDay())
			const totalDays = Math.ceil((to.getDate() + from.getDay()) / 7) * 7
			for (let i = 0; i < totalDays; i++) {
				const cellDate = new Date(gridStart)
				cellDate.setDate(gridStart.getDate() + i)
				const iso = this.toIsoDate(cellDate)
				cells.push({
					iso,
					dayNum: cellDate.getDate(),
					isToday: this.toIsoDate(this.today) === iso,
					isOtherMonth: cellDate.getMonth() !== from.getMonth(),
					events: this.eventsByDay[iso] || [],
				})
			}
			return cells
		},

		/**
		 * The 7 day-columns for the week view.
		 *
		 * @return {Array<object>} day columns with metadata + events.
		 */
		weekDays() {
			const { from } = this.weekRange
			const out = []
			for (let i = 0; i < 7; i++) {
				const day = new Date(from)
				day.setDate(from.getDate() + i)
				const iso = this.toIsoDate(day)
				out.push({
					iso,
					weekday: this.weekdayHeaders[day.getDay()],
					dayNum: day.getDate(),
					isToday: this.toIsoDate(this.today) === iso,
					events: this.eventsByDay[iso] || [],
				})
			}
			return out
		},

		/**
		 * Events grouped into per-day buckets in chronological order.
		 *
		 * @return {Array<{iso: string, label: string, events: object[]}>} the groups.
		 */
		agendaGroups() {
			const groups = []
			const seen = {}
			for (const event of this.events) {
				const date = this.parseDate(event.start)
				const iso = this.toIsoDate(date)
				if (!seen[iso]) {
					seen[iso] = { iso, label: this.formatDayHeader(date), events: [] }
					groups.push(seen[iso])
				}
				seen[iso].events.push(event)
			}
			return groups
		},
	},

	watch: {
		content: {
			deep: true,
			handler() {
				this.fetchEvents()
			},
		},
		// Month/week/agenda use different fetch windows — refetch on switch.
		activeMode() {
			this.fetchEvents()
		},
	},

	mounted() {
		this.fetchEvents()
	},

	methods: {
		t,

		/**
		 * Switch the active view mode.
		 *
		 * @param {string} mode the mode to activate.
		 * @return {void}
		 */
		setMode(mode) {
			if (VIEW_MODES.includes(mode)) {
				this.activeMode = mode
			}
		},

		/**
		 * The label for a view mode.
		 *
		 * @param {string} mode the mode key.
		 * @return {string} the localised label.
		 */
		modeLabel(mode) {
			if (mode === 'month') {
				return t('nextcloud-vue', 'Month')
			}
			if (mode === 'week') {
				return t('nextcloud-vue', 'Week')
			}
			return t('nextcloud-vue', 'Agenda')
		},

		/**
		 * Compute the fetch window for the active view: the whole month in
		 * month view, the Sun–Sat week in week view, else the daysAhead
		 * look-ahead (agenda).
		 *
		 * @return {{from: Date, to: Date}} the window.
		 */
		computeRange() {
			if (this.activeMode === 'month') {
				const { from, to } = this.monthRange
				const start = new Date(from)
				start.setHours(0, 0, 0, 0)
				const end = new Date(to)
				end.setHours(23, 59, 59, 999)
				return { from: start, to: end }
			}
			if (this.activeMode === 'week') {
				return this.weekRange
			}
			const from = new Date(this.today)
			from.setHours(0, 0, 0, 0)
			const to = new Date(from)
			to.setDate(from.getDate() + this.daysAhead)
			to.setHours(23, 59, 59, 999)
			return { from, to }
		},

		/**
		 * Load events from the configured source. A missing source or a fetch
		 * failure degrades to the empty / error state without throwing.
		 *
		 * @return {Promise<void>}
		 */
		async fetchEvents() {
			if (!this.source) {
				this.events = []
				this.failures = []
				return
			}
			const { from, to } = this.computeRange()
			this.loading = true
			this.error = null
			try {
				const payload = await this.source.fetchEvents({
					from: from.toISOString(),
					to: to.toISOString(),
				}) || {}
				this.events = Array.isArray(payload.events) ? payload.events : []
				this.failures = Array.isArray(payload.failures) ? payload.failures : []
			} catch (err) {
				this.error = err
				this.events = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Parse a date value, falling back to now on invalid input.
		 *
		 * @param {string|number|Date} value the value to parse.
		 * @return {Date} the parsed date.
		 */
		parseDate(value) {
			if (!value) {
				return new Date()
			}
			const d = new Date(value)
			return Number.isNaN(d.getTime()) ? new Date() : d
		},

		/**
		 * Format a date as `YYYY-MM-DD`.
		 *
		 * @param {Date} date the date.
		 * @return {string} the ISO date string.
		 */
		toIsoDate(date) {
			const yyyy = date.getFullYear()
			const mm = String(date.getMonth() + 1).padStart(2, '0')
			const dd = String(date.getDate()).padStart(2, '0')
			return `${yyyy}-${mm}-${dd}`
		},

		/**
		 * Format an event's start time (or "All day").
		 *
		 * @param {object} event the event.
		 * @return {string} the time label.
		 */
		formatTime(event) {
			if (event.allDay) {
				return t('nextcloud-vue', 'All day')
			}
			const start = this.parseDate(event.start)
			const hh = String(start.getHours()).padStart(2, '0')
			const mm = String(start.getMinutes()).padStart(2, '0')
			return `${hh}:${mm}`
		},

		/**
		 * Format a per-day agenda group header.
		 *
		 * @param {Date} date the group date.
		 * @return {string} the header label.
		 */
		formatDayHeader(date) {
			const month = date.toLocaleString(undefined, { month: 'short' })
			return `${this.weekdayHeaders[date.getDay()]} ${date.getDate()} ${month}`
		},

		/**
		 * Compute the left-border colour style for an event row.
		 *
		 * @param {object} event the event.
		 * @return {object} the style object (empty when colouring is off).
		 */
		eventStyle(event) {
			if (!this.colorByCalendar) {
				return {}
			}
			const color = event.color
			if (typeof color === 'string' && color !== '') {
				return { 'border-left': `3px solid ${color}` }
			}
			return {}
		},
	},
}
</script>

<style scoped>
.cn-calendar-widget {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-calendar-widget__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-calendar-widget__title {
	font-weight: 600;
}

.cn-calendar-widget__modes {
	display: flex;
	gap: 4px;
}

.cn-calendar-widget__mode-btn {
	border: 1px solid var(--color-border);
	background: transparent;
	color: var(--color-main-text);
	border-radius: var(--border-radius);
	padding: 2px 8px;
	font-size: 12px;
	cursor: pointer;
}

.cn-calendar-widget__mode-btn.is-active {
	background: var(--color-primary-element-light, var(--color-primary-element));
	color: var(--color-primary-element-text);
}

.cn-calendar-widget__body {
	flex: 1;
	overflow: auto;
	padding: 8px 12px;
}

.cn-calendar-widget__state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 16px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-widget__retry {
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
	border-radius: var(--border-radius);
}

.cn-calendar-widget__month {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 2px;
}

.cn-calendar-widget__month-header {
	font-size: 11px;
	font-weight: 600;
	text-align: center;
	padding: 4px 0;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-widget__month-cell {
	min-height: 60px;
	padding: 2px 4px;
	border: 1px solid var(--color-border);
	border-radius: 2px;
	background: var(--color-main-background);
}

.cn-calendar-widget__month-cell.is-today {
	background: var(--color-background-hover);
}

.cn-calendar-widget__month-cell.is-other-month {
	opacity: 0.45;
}

.cn-calendar-widget__month-day {
	font-size: 11px;
	font-weight: 600;
}

.cn-calendar-widget__month-events {
	list-style: none;
	margin: 2px 0 0;
	padding: 0;
}

.cn-calendar-widget__month-event {
	font-size: 10px;
	padding: 1px 3px;
	margin-bottom: 1px;
	border-radius: 2px;
	background: var(--color-background-dark);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-calendar-widget__month-overflow {
	font-size: 10px;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-widget__week {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 4px;
}

.cn-calendar-widget__week-col {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 4px;
}

.cn-calendar-widget__week-col.is-today {
	background: var(--color-background-hover);
}

.cn-calendar-widget__week-day {
	display: flex;
	flex-direction: column;
	align-items: center;
	border-bottom: 1px solid var(--color-border);
	padding-bottom: 2px;
	margin-bottom: 4px;
}

.cn-calendar-widget__week-name {
	font-size: 10px;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-widget__week-num {
	font-size: 14px;
	font-weight: 600;
}

.cn-calendar-widget__week-events {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-calendar-widget__week-event {
	font-size: 11px;
	padding: 2px 4px;
	margin-bottom: 2px;
	background: var(--color-background-dark);
	border-radius: 2px;
}

.cn-calendar-widget__week-time {
	font-weight: 600;
	margin-right: 4px;
}

.cn-calendar-widget__week-empty {
	font-size: 11px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-widget__agenda {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-calendar-widget__agenda-header {
	font-size: 12px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	margin-top: 8px;
	margin-bottom: 4px;
}

.cn-calendar-widget__agenda-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 6px;
	margin-bottom: 2px;
	background: var(--color-background-hover);
	border-radius: 2px;
}

.cn-calendar-widget__agenda-time {
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.cn-calendar-widget__agenda-title {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-calendar-widget__agenda-cal {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>
