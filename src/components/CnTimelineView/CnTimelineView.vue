<template>
	<div class="cn-timeline-view" data-testid="cn-timeline-view">
		<header v-if="title || description || $slots.header" class="cn-timeline-view__header">
			<!-- @slot header Replaces the default title + description block in the timeline header. -->
			<slot name="header">
				<h3 v-if="title" class="cn-timeline-view__title">
					{{ title }}
				</h3>
				<p v-if="description" class="cn-timeline-view__description">
					{{ description }}
				</p>
			</slot>
		</header>

		<!-- Empty state. -->
		<p v-if="groupedEvents.length === 0" class="cn-timeline-view__empty">
			{{ emptyLabel }}
		</p>

		<!-- Date-grouped event list. -->
		<ol v-else class="cn-timeline-view__groups">
			<li v-for="group in groupedEvents"
				:key="group.key"
				class="cn-timeline-view__group">
				<header class="cn-timeline-view__group-header">
					<span class="cn-timeline-view__group-label">{{ group.label }}</span>
					<span v-if="!hideCounts" class="cn-timeline-view__group-count">{{ group.events.length }}</span>
				</header>
				<ol class="cn-timeline-view__group-events">
					<li v-for="evt in group.events"
						:key="evt.id || (evt.start + ':' + (evt.title || ''))"
						class="cn-timeline-view__event"
						:class="eventClass(evt)"
						@click="onEventClick(evt)">
						<!-- @slot event Per-event body. Scope: { event,
						     formattedTime }. Replaces the default
						     time + title + description layout. -->
						<slot name="event" :event="evt" :formatted-time="formatTimeRange(evt)">
							<span class="cn-timeline-view__event-time">{{ formatTimeRange(evt) }}</span>
							<span class="cn-timeline-view__event-title">{{ evt.title || untitledLabel }}</span>
							<small v-if="evt.location" class="cn-timeline-view__event-location">{{ evt.location }}</small>
							<small v-if="evt.description" class="cn-timeline-view__event-description">{{ evt.description }}</small>
						</slot>
					</li>
				</ol>
			</li>
		</ol>
	</div>
</template>

<script>
/**
 * CnTimelineView — Date-grouped session / event timeline.
 *
 * Renders an `events[]` array grouped by day (or a custom `groupBy`
 * function) with a sticky group label per day, the event time range
 * + title + optional location/description per event. Click-emits
 * the event for drilldown.
 *
 * Intentionally NOT a calendar grid (month / week view) — that's a
 * separate widget (`CnCalendarGrid`, future). This component is
 * the chronological-list view consumers usually want for
 * "cohort timetable" / "user's day" / "activity feed".
 *
 * ```vue
 * <CnTimelineView
 *   title="Cohort timetable"
 *   :events="[
 *     { id: 'a', title: 'Math 101', start: '2026-05-21T09:00:00Z', end: '2026-05-21T10:30:00Z', location: 'Room 12' },
 *     { id: 'b', title: 'Physics',  start: '2026-05-21T11:00:00Z', end: '2026-05-21T12:00:00Z' },
 *     { id: 'c', title: 'Lab',      start: '2026-05-22T09:00:00Z', end: '2026-05-22T11:00:00Z' },
 *   ]"
 *   @event-click="openSession" />
 * ```
 */
export default {
	name: 'CnTimelineView',
	props: {
		/**
		 * Events to render. Each entry:
		 * `{ id?, title?, start, end?, location?, description?, kind? }`.
		 * `start` MUST parse to a valid Date.
		 *
		 * @type {Array<{id?:string,title?:string,start:string,end?:string,location?:string,description?:string,kind?:string}>}
		 */
		events: { type: Array, default: () => [] },
		/** Optional title rendered above the timeline. */
		title: { type: String, default: '' },
		/** Optional description rendered under the title. */
		description: { type: String, default: '' },
		/** Empty-state label when events[] is empty. */
		emptyLabel: { type: String, default: 'No events scheduled.' },
		/** Fallback label for events without a title. */
		untitledLabel: { type: String, default: 'Untitled' },
		/** Hide the per-group event count badge. */
		hideCounts: { type: Boolean, default: false },
		/**
		 * Custom grouping function. Receives an event; returns
		 * `{ key, label }` for the group it belongs to.
		 * Default groups by ISO date (YYYY-MM-DD) with a locale
		 * `toLocaleDateString` label.
		 *
		 * @type {(event: object) => { key: string, label: string }}
		 */
		groupBy: { type: Function, default: null },
		/**
		 * Sort direction for groups: `'asc'` (oldest first) or
		 * `'desc'` (newest first).
		 *
		 * @type {'asc'|'desc'}
		 */
		sort: {
			type: String,
			default: 'asc',
			validator: (v) => v === 'asc' || v === 'desc',
		},
		/**
		 * Optional `kind` → CSS-class-suffix map. Each event's
		 * `kind` becomes `cn-timeline-view__event--<class>` so
		 * consumers can colour-code (`session`, `break`, `holiday`,
		 * etc.). When omitted no kind-specific class is added.
		 *
		 * @type {Record<string,string>}
		 */
		kindClassMap: { type: Object, default: () => ({}) },
		/**
		 * Locale string passed to `Date.toLocaleDateString` for the
		 * default group label. Defaults to the browser locale.
		 *
		 * @type {string}
		 */
		locale: { type: String, default: undefined },
	},
	emits: ['event-click'],
	computed: {
		/**
		 * Events grouped by `groupBy` (defaults to ISO date),
		 * sorted by the prop, with each group's events also sorted
		 * by start time.
		 *
		 * @return {Array<{key:string,label:string,events:Array}>}
		 */
		groupedEvents() {
			const groups = new Map()
			for (const evt of this.events) {
				const { key, label } = this.resolveGroup(evt)
				if (!groups.has(key)) {
					groups.set(key, { key, label, events: [] })
				}
				groups.get(key).events.push(evt)
			}
			const arr = Array.from(groups.values())
			arr.sort((a, b) => (this.sort === 'desc' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)))
			for (const g of arr) {
				g.events.sort((x, y) => new Date(x.start) - new Date(y.start))
			}
			return arr
		},
	},
	methods: {
		/**
		 * Pick the `{key,label}` for an event using the consumer's
		 * `groupBy` if provided, else the default ISO-date logic.
		 *
		 * @param {object} evt The event.
		 * @return {{key:string,label:string}} Group key+label.
		 */
		resolveGroup(evt) {
			if (typeof this.groupBy === 'function') {
				const out = this.groupBy(evt)
				if (out && typeof out.key === 'string') return out
			}
			return this.defaultGroup(evt)
		},
		/**
		 * Default grouping — by ISO date (YYYY-MM-DD).
		 *
		 * @param {object} evt The event.
		 * @return {{key:string,label:string}} Group key+label.
		 */
		defaultGroup(evt) {
			const d = new Date(evt.start)
			if (Number.isNaN(d.getTime())) return { key: 'invalid', label: 'Unknown date' }
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			const label = d.toLocaleDateString(this.locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
			return { key, label }
		},
		/**
		 * Render a single event's start (and optional end) time as
		 * `HH:MM` (or `HH:MM – HH:MM`).
		 *
		 * @param {object} evt The event.
		 * @return {string} The rendered time string.
		 */
		formatTimeRange(evt) {
			const s = new Date(evt.start)
			if (Number.isNaN(s.getTime())) return ''
			const start = s.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' })
			if (!evt.end) return start
			const e = new Date(evt.end)
			if (Number.isNaN(e.getTime())) return start
			return `${start} – ${e.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' })}`
		},
		/**
		 * Resolve the event's BEM modifier from `kindClassMap`.
		 *
		 * @param {object} evt The event.
		 * @return {string|null} BEM modifier class, or null.
		 */
		eventClass(evt) {
			if (!evt.kind || !this.kindClassMap[evt.kind]) return null
			return `cn-timeline-view__event--${this.kindClassMap[evt.kind]}`
		},
		/**
		 * Forward an event click upward.
		 *
		 * @param {object} evt The clicked event.
		 * @return {void}
		 */
		onEventClick(evt) {
			/**
			 * @event event-click Emitted on event row click.
			 *   Payload is the original event object.
			 * @type {object}
			 */
			this.$emit('event-click', evt)
		},
	},
}
</script>

<style scoped>
.cn-timeline-view {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-timeline-view__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-timeline-view__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-view__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}

.cn-timeline-view__groups {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-timeline-view__group-header {
	display: flex;
	gap: 8px;
	align-items: baseline;
	padding-bottom: 6px;
	border-bottom: 1px solid var(--color-border);
}

.cn-timeline-view__group-label {
	font-weight: 600;
}

.cn-timeline-view__group-count {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-view__group-events {
	margin: 0;
	padding: 8px 0 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-timeline-view__event {
	display: grid;
	grid-template-columns: 110px 1fr;
	gap: 12px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
	align-items: center;
}

.cn-timeline-view__event:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-timeline-view__event-time {
	font-family: monospace;
	font-weight: 600;
	color: var(--color-primary-element);
}

.cn-timeline-view__event-title {
	font-weight: 500;
}

.cn-timeline-view__event-location,
.cn-timeline-view__event-description {
	color: var(--color-text-maxcontrast);
	display: block;
}

.cn-timeline-view__event--break {
	opacity: 0.65;
}

.cn-timeline-view__event--holiday {
	background: var(--color-warning-hover, var(--color-background-hover));
}
</style>
