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

			<div v-else-if="events.length === 0" class="cn-calendar-widget__state">
				{{ emptyMessage }}
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

const VIEW_MODES = ['agenda', 'upcoming']
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
			return mode === 'upcoming' ? t('nextcloud-vue', 'Upcoming') : t('nextcloud-vue', 'Agenda')
		},

		/**
		 * Compute the inclusive look-ahead window.
		 *
		 * @return {{from: Date, to: Date}} the window.
		 */
		computeRange() {
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
