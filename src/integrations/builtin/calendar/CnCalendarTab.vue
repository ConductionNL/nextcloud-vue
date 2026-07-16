<!--
  CnCalendarTab — bespoke sidebar tab for the `calendar` integration.

  Tier-2 rewire (additive link-table strategy):
    - "Add meeting" button opens CnCalendarEventCreate modal that POSTs
      to /api/objects/{r}/{s}/{id}/events (writes X-OR-* on the VEVENT
      AND a link-table row).
    - "Link existing meeting" button opens CnCalendarEventPicker modal
      that POSTs to /api/objects/{r}/{s}/{id}/events/link (writes ONLY
      a link-table row — we may not own the VEVENT).
    - Per-row UNLINK action: DELETE /events/{eventUid}/link  — removes
      the link only, the VEVENT survives on the user's calendar.
    - Per-row DELETE action: DELETE /events/{eventId} — destroys the
      VEVENT (legacy semantics — also cleans up the link-table row).

  Read path: GET /api/objects/{r}/{s}/{id}/events returns the UNION of
  link-table rows and the legacy X-OR-* CalDAV scan, deduped by
  (calendarUri, eventUid) and annotated with a `source` field
  (link-table / xor-only / both).

  Visual fidelity (NC Calendar): each row foregrounds a date block (month
  abbreviation + day-of-month, accented like the Calendar app's agenda),
  a start–end time range, a bold event title, the location with a
  map-marker icon, an attendee avatar stack with an overflow count, and a
  CnStatusBadge for the VEVENT status (confirmed / tentative / cancelled).

  ADR-004 modal isolation: every modal lives in its own .vue file under
  `src/components/CnCalendar*/` and is imported here as a child component.
-->
<template>
	<div class="cn-sidebar-tab cn-calendar-tab">
		<!-- Action bar (replaces the inline create form) -->
		<div class="cn-calendar-tab__action-row">
			<NcButton variant="primary" @click="openCreate">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ addEventLabel }}
			</NcButton>
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="20" />
				</template>
				{{ linkExistingLabel }}
			</NcButton>
		</div>

		<!-- Error banner -->
		<div v-if="error" class="cn-calendar-tab__banner cn-calendar-tab__banner--error" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ error }}</span>
		</div>

		<!-- Unavailable banner (503) -->
		<div v-if="degraded" class="cn-calendar-tab__banner" role="status">
			<AlertCircleOutline :size="18" />
			<span>{{ unavailableLabel }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />
		<div v-else-if="sortedEvents.length === 0" class="cn-sidebar-tab__empty cn-calendar-tab__empty">
			{{ noEventsLabel }}
		</div>

		<!-- Agenda -->
		<div v-else class="cn-calendar-tab__agenda">
			<div v-if="upcomingEvents.length > 0" class="cn-calendar-tab__group">
				<h4 class="cn-calendar-tab__group-title">
					{{ upcomingLabel }}
				</h4>
				<div
					v-for="ev in upcomingEvents"
					:key="rowKey(ev)"
					class="cn-calendar-tab__event">
					<!-- Date block (month + day) -->
					<div class="cn-calendar-tab__date" aria-hidden="true">
						<span class="cn-calendar-tab__date-month">{{ monthOf(ev) }}</span>
						<span class="cn-calendar-tab__date-day">{{ dayOf(ev) }}</span>
					</div>

					<!-- Main column: title, time range, location, attendees -->
					<div class="cn-calendar-tab__main">
						<div class="cn-calendar-tab__title-row">
							<span class="cn-calendar-tab__title">{{ ev.summary || untitledLabel }}</span>
							<CnStatusBadge
								v-if="statusLabel(ev)"
								:label="statusLabel(ev)"
								:variant="statusVariant(ev)"
								size="small" />
						</div>

						<div class="cn-calendar-tab__when">
							<ClockOutline :size="14" class="cn-calendar-tab__meta-icon" />
							<span>{{ formatTimeRange(ev) }}</span>
						</div>

						<div v-if="ev.location" class="cn-calendar-tab__location">
							<MapMarkerOutline :size="14" class="cn-calendar-tab__meta-icon" />
							<span class="cn-calendar-tab__location-text">{{ ev.location }}</span>
						</div>

						<div v-if="attendeeList(ev).length > 0" class="cn-calendar-tab__attendees">
							<span
								v-for="(att, idx) in visibleAttendees(ev)"
								:key="idx"
								class="cn-calendar-tab__avatar"
								:title="att.name">
								{{ att.initials }}
							</span>
							<span
								v-if="extraAttendees(ev) > 0"
								class="cn-calendar-tab__avatar cn-calendar-tab__avatar--more"
								:title="attendeeCountLabel(ev)">
								+{{ extraAttendees(ev) }}
							</span>
						</div>
					</div>

					<!-- Row actions -->
					<NcActions :force-menu="true" class="cn-calendar-tab__actions">
						<NcActionButton :disabled="rowBusyKey === rowKey(ev)" @click="unlink(ev)">
							<template #icon>
								<LinkVariantOff :size="20" />
							</template>
							{{ unlinkLabel }}
						</NcActionButton>
						<NcActionButton :disabled="rowBusyKey === rowKey(ev)" @click="deleteEvent(ev)">
							<template #icon>
								<Delete :size="20" />
							</template>
							{{ deleteLabel }}
						</NcActionButton>
					</NcActions>
				</div>
			</div>

			<div v-if="pastEvents.length > 0" class="cn-calendar-tab__group">
				<h4 class="cn-calendar-tab__group-title cn-calendar-tab__group-title--past">
					{{ pastLabel }}
				</h4>
				<div
					v-for="ev in pastEvents"
					:key="rowKey(ev)"
					class="cn-calendar-tab__event cn-calendar-tab__event--past">
					<div class="cn-calendar-tab__date cn-calendar-tab__date--past" aria-hidden="true">
						<span class="cn-calendar-tab__date-month">{{ monthOf(ev) }}</span>
						<span class="cn-calendar-tab__date-day">{{ dayOf(ev) }}</span>
					</div>

					<div class="cn-calendar-tab__main">
						<div class="cn-calendar-tab__title-row">
							<span class="cn-calendar-tab__title">{{ ev.summary || untitledLabel }}</span>
							<CnStatusBadge
								v-if="statusLabel(ev)"
								:label="statusLabel(ev)"
								:variant="statusVariant(ev)"
								size="small" />
						</div>

						<div class="cn-calendar-tab__when">
							<ClockOutline :size="14" class="cn-calendar-tab__meta-icon" />
							<span>{{ formatTimeRange(ev) }}</span>
						</div>

						<div v-if="ev.location" class="cn-calendar-tab__location">
							<MapMarkerOutline :size="14" class="cn-calendar-tab__meta-icon" />
							<span class="cn-calendar-tab__location-text">{{ ev.location }}</span>
						</div>

						<div v-if="attendeeList(ev).length > 0" class="cn-calendar-tab__attendees">
							<span
								v-for="(att, idx) in visibleAttendees(ev)"
								:key="idx"
								class="cn-calendar-tab__avatar"
								:title="att.name">
								{{ att.initials }}
							</span>
							<span
								v-if="extraAttendees(ev) > 0"
								class="cn-calendar-tab__avatar cn-calendar-tab__avatar--more"
								:title="attendeeCountLabel(ev)">
								+{{ extraAttendees(ev) }}
							</span>
						</div>
					</div>

					<NcActions :force-menu="true" class="cn-calendar-tab__actions">
						<NcActionButton :disabled="rowBusyKey === rowKey(ev)" @click="unlink(ev)">
							<template #icon>
								<LinkVariantOff :size="20" />
							</template>
							{{ unlinkLabel }}
						</NcActionButton>
						<NcActionButton :disabled="rowBusyKey === rowKey(ev)" @click="deleteEvent(ev)">
							<template #icon>
								<Delete :size="20" />
							</template>
							{{ deleteLabel }}
						</NcActionButton>
					</NcActions>
				</div>
			</div>
		</div>

		<!-- Picker modal (Tier-2 link existing flow) -->
		<CnCalendarEventPicker
			v-if="showPicker"
			:api-base="apiBase"
			@link="onPickerLink"
			@close="closePicker" />

		<!-- Create modal (Tier-2 create-and-link flow) -->
		<CnCalendarEventCreate
			v-if="showCreate"
			:register="register"
			:schema="schema"
			:object-id="objectId"
			:api-base="apiBase"
			@created="onEventCreated"
			@close="closeCreate" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcActions,
	NcActionButton,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import MapMarkerOutline from 'vue-material-design-icons/MapMarkerOutline.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import { buildHeaders } from '../../../utils/index.js'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnCalendarEventPicker from '../../../components/CnCalendarEventPicker/CnCalendarEventPicker.vue'
import CnCalendarEventCreate from '../../../components/CnCalendarEventCreate/CnCalendarEventCreate.vue'

const MAX_AVATARS = 3

/**
 * CnCalendarTab — bespoke sidebar tab for the calendar integration.
 *
 * Tier-2 wiring: link/create flows are modal-driven (ADR-004 isolation),
 * and per-row actions distinguish UNLINK (preserves the VEVENT) from
 * DELETE (destroys the VEVENT). Rows mirror NC Calendar's agenda look:
 * date block, time range, title, location, attendee avatars + status.
 */
export default {
	name: 'CnCalendarTab',

	components: {
		NcButton,
		NcActions,
		NcActionButton,
		NcLoadingIcon,
		CnStatusBadge,
		Plus,
		AlertCircleOutline,
		LinkVariant,
		LinkVariantOff,
		ClockOutline,
		MapMarkerOutline,
		Delete,
		CnCalendarEventPicker,
		CnCalendarEventCreate,
	},

	props: {
		/** Stable integration id (matches PHP-side provider id, always `calendar`). */
		integrationId: { type: String, default: 'calendar' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL for OpenRegister. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		// --- Pre-translated labels (ADR-007) ---
		addEventLabel: { type: String, default: () => t('nextcloud-vue', 'Add meeting') },
		linkExistingLabel: { type: String, default: () => t('nextcloud-vue', 'Link existing') },
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink') },
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete meeting') },
		noEventsLabel: { type: String, default: () => t('nextcloud-vue', 'No meetings linked yet') },
		untitledLabel: { type: String, default: () => t('nextcloud-vue', '(no title)') },
		upcomingLabel: { type: String, default: () => t('nextcloud-vue', 'Upcoming') },
		pastLabel: { type: String, default: () => t('nextcloud-vue', 'Past') },
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'Nextcloud Calendar is currently unavailable.') },
	},

	emits: ['linked', 'unlinked', 'deleted'],

	data() {
		return {
			events: [],
			loading: false,
			error: '',
			degraded: false,
			rowBusyKey: null,
			showPicker: false,
			showCreate: false,
		}
	},

	computed: {
		sortedEvents() {
			const copy = Array.isArray(this.events) ? [...this.events] : []
			copy.sort((a, b) => {
				const ta = a.dtstart ? new Date(a.dtstart).getTime() : Number.POSITIVE_INFINITY
				const tb = b.dtstart ? new Date(b.dtstart).getTime() : Number.POSITIVE_INFINITY
				return ta - tb
			})
			return copy
		},
		upcomingEvents() {
			const now = Date.now()
			return this.sortedEvents.filter((ev) => {
				if (!ev.dtstart) return true
				return new Date(ev.dtstart).getTime() >= now
			})
		},
		pastEvents() {
			const now = Date.now()
			return this.sortedEvents.filter((ev) => {
				if (!ev.dtstart) return false
				return new Date(ev.dtstart).getTime() < now
			})
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchEvents()
				}
			},
		},
	},

	methods: {
		baseObjectUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}`
		},

		rowKey(ev) {
			// Prefer eventUid (Tier-2 stable identifier across calendars).
			return ev.uid || ev.id || ''
		},

		async fetchEvents() {
			if (!this.register || !this.schema || !this.objectId) return
			this.loading = true
			this.error = ''
			this.degraded = false
			try {
				const response = await fetch(`${this.baseObjectUrl()}/events`, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.events = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.events = []
					this.degraded = true
				} else {
					this.events = []
					this.error = t('nextcloud-vue', 'Could not load meetings.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarTab] failed to fetch events', err)
				this.events = []
				this.error = t('nextcloud-vue', 'Could not load meetings.')
			} finally {
				this.loading = false
			}
		},

		openCreate() {
			this.showCreate = true
		},
		closeCreate() {
			this.showCreate = false
		},
		async onEventCreated() {
			this.closeCreate()
			await this.fetchEvents()
			this.$emit('linked')
		},

		openPicker() {
			this.showPicker = true
		},
		closePicker() {
			this.showPicker = false
		},
		async onPickerLink(payload) {
			// payload: { calendarUri, eventUid }
			this.closePicker()
			this.error = ''
			try {
				const response = await fetch(`${this.baseObjectUrl()}/events/link`, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchEvents()
					this.$emit('linked', payload)
				} else {
					let message = t('nextcloud-vue', 'Could not link the meeting.')
					try {
						const body = await response.json()
						if (body && typeof body.error === 'string') message = body.error
					} catch (_) { /* ignore */ }
					this.error = message
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarTab] failed to link event', err)
				this.error = t('nextcloud-vue', 'Could not link the meeting.')
			}
		},

		async unlink(ev) {
			const key = this.rowKey(ev)
			if (this.rowBusyKey || !key) return
			this.rowBusyKey = key
			this.error = ''
			try {
				// Tier-2 unlink-only endpoint: DELETE /events/{eventUid}/link
				const url = `${this.baseObjectUrl()}/events/${encodeURIComponent(key)}/link`
				const response = await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				if (response.ok || response.status === 204) {
					this.events = this.events.filter((row) => this.rowKey(row) !== key)
					this.$emit('unlinked', key)
				} else if (response.status === 503) {
					this.degraded = true
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink the meeting.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarTab] failed to unlink event', err)
				this.error = t('nextcloud-vue', 'Could not unlink the meeting.')
			} finally {
				this.rowBusyKey = null
			}
		},

		async deleteEvent(ev) {
			const key = this.rowKey(ev)
			const eventUri = ev.id
			if (this.rowBusyKey || !eventUri) return
			this.rowBusyKey = key
			this.error = ''
			try {
				// Legacy destroy endpoint — destroys the VEVENT and cleans the link row.
				const url = `${this.baseObjectUrl()}/events/${encodeURIComponent(eventUri)}`
				const response = await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				if (response.ok || response.status === 204) {
					this.events = this.events.filter((row) => this.rowKey(row) !== key)
					this.$emit('deleted', key)
				} else {
					this.error = t('nextcloud-vue', 'Could not delete the meeting.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarTab] failed to delete event', err)
				this.error = t('nextcloud-vue', 'Could not delete the meeting.')
			} finally {
				this.rowBusyKey = null
			}
		},

		// --- Presentation helpers (NC Calendar agenda look) ---

		parseDate(value) {
			if (!value) return null
			const d = new Date(value)
			return Number.isNaN(d.getTime()) ? null : d
		},

		monthOf(ev) {
			const d = this.parseDate(ev.dtstart)
			if (!d) return '—'
			return d.toLocaleDateString(undefined, { month: 'short' })
		},

		dayOf(ev) {
			const d = this.parseDate(ev.dtstart)
			if (!d) return '?'
			return String(d.getDate())
		},

		formatTimeRange(ev) {
			const start = this.parseDate(ev.dtstart)
			if (!start) {
				return ev.dtstart ? String(ev.dtstart) : t('nextcloud-vue', 'Time not set')
			}
			const end = this.parseDate(ev.dtend)
			const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
			const timeOpts = { hour: '2-digit', minute: '2-digit' }
			const startTime = start.toLocaleTimeString(undefined, timeOpts)
			if (end) {
				const sameDay = start.toDateString() === end.toDateString()
				const endTime = end.toLocaleTimeString(undefined, timeOpts)
				if (sameDay) {
					return `${dateLabel} · ${startTime} – ${endTime}`
				}
				const endDateLabel = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
				return `${dateLabel} ${startTime} – ${endDateLabel} ${endTime}`
			}
			return `${dateLabel} · ${startTime}`
		},

		statusLabel(ev) {
			const status = (ev.status || '').toString().toLowerCase()
			if (status === 'confirmed') return t('nextcloud-vue', 'Confirmed')
			if (status === 'tentative') return t('nextcloud-vue', 'Tentative')
			if (status === 'cancelled') return t('nextcloud-vue', 'Cancelled')
			return ''
		},

		statusVariant(ev) {
			const status = (ev.status || '').toString().toLowerCase()
			if (status === 'confirmed') return 'success'
			if (status === 'tentative') return 'warning'
			if (status === 'cancelled') return 'error'
			return 'default'
		},

		attendeeList(ev) {
			const raw = ev.attendees || ev.participants || []
			if (!Array.isArray(raw)) return []
			return raw.map((att) => {
				if (typeof att === 'string') {
					return { name: att, initials: this.initialsFor(att) }
				}
				const name = att.name || att.displayName || att.cn || att.email || ''
				return { name, initials: this.initialsFor(name) }
			}).filter((a) => a.name)
		},

		visibleAttendees(ev) {
			return this.attendeeList(ev).slice(0, MAX_AVATARS)
		},

		extraAttendees(ev) {
			const total = this.attendeeList(ev).length
			return total > MAX_AVATARS ? total - MAX_AVATARS : 0
		},

		attendeeCountLabel(ev) {
			const total = this.attendeeList(ev).length
			return t('nextcloud-vue', '{count} attendees', { count: total })
		},

		initialsFor(name) {
			const clean = (name || '').trim()
			if (!clean) return '?'
			const local = clean.includes('@') ? clean.split('@')[0] : clean
			const parts = local.split(/[\s._-]+/).filter(Boolean)
			if (parts.length === 0) return clean.charAt(0).toUpperCase()
			if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
			return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
		},
	},
}
</script>

<style scoped>
.cn-calendar-tab {
	padding: 12px;
	overflow-x: hidden;
}

.cn-calendar-tab__action-row {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-calendar-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-calendar-tab__banner--error {
	background: var(--color-error, #e9322d);
}

.cn-calendar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-calendar-tab__agenda {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.cn-calendar-tab__group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-calendar-tab__group-title {
	margin: 0 0 4px 0;
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-tab__group-title--past {
	opacity: 0.7;
}

/* Event row */
.cn-calendar-tab__event {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 8px;
	border-radius: var(--border-radius-large, 8px);
	border-left: 3px solid var(--color-primary-element);
	background: var(--color-background-hover);
}

.cn-calendar-tab__event + .cn-calendar-tab__event {
	margin-top: 4px;
}

.cn-calendar-tab__event--past {
	border-left-color: var(--color-border-dark, var(--color-border));
	background: transparent;
	opacity: 0.72;
}

/* Date block */
.cn-calendar-tab__date {
	flex-shrink: 0;
	width: 44px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4px 0;
	border-radius: var(--border-radius);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
	line-height: 1.1;
}

.cn-calendar-tab__date--past {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-calendar-tab__date-month {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.cn-calendar-tab__date-day {
	font-size: 18px;
	font-weight: 700;
}

/* Main column */
.cn-calendar-tab__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.cn-calendar-tab__title-row {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.cn-calendar-tab__title {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-main-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-calendar-tab__when,
.cn-calendar-tab__location {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
	min-width: 0;
}

.cn-calendar-tab__meta-icon {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-tab__location-text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Attendees */
.cn-calendar-tab__attendees {
	display: flex;
	align-items: center;
	margin-top: 2px;
}

.cn-calendar-tab__avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
	font-weight: 600;
	background: var(--color-primary-element-light, var(--color-primary-light));
	color: var(--color-primary-element-light-text, var(--color-primary-element));
	border: 2px solid var(--color-main-background);
	margin-left: -6px;
	flex-shrink: 0;
}

.cn-calendar-tab__avatar:first-child {
	margin-left: 0;
}

.cn-calendar-tab__avatar--more {
	background: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

/* Actions */
.cn-calendar-tab__actions {
	flex-shrink: 0;
}
</style>
