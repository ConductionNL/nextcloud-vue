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

  ADR-004 modal isolation: every modal lives in its own .vue file under
  `src/components/CnCalendar*/` and is imported here as a child component.
-->
<template>
	<div class="cn-sidebar-tab cn-calendar-tab">
		<!-- Action bar (replaces the inline create form) -->
		<div class="cn-calendar-tab__action-row">
			<NcButton type="primary" @click="openCreate">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ addEventLabel }}
			</NcButton>
			<NcButton type="secondary" @click="openPicker">
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

		<!-- Timeline -->
		<div v-else class="cn-calendar-tab__timeline">
			<div v-if="upcomingEvents.length > 0" class="cn-calendar-tab__group">
				<h4 class="cn-calendar-tab__group-title">
					{{ upcomingLabel }}
				</h4>
				<NcListItem
					v-for="ev in upcomingEvents"
					:key="rowKey(ev)"
					:name="ev.summary || untitledLabel"
					:bold="false"
					:force-display-actions="true">
					<template #icon>
						<CalendarClock :size="32" class="cn-calendar-tab__row-icon" />
					</template>
					<template #subname>
						{{ formatWhen(ev) }}
					</template>
					<template v-if="ev.location" #details>
						<span class="cn-calendar-tab__row-location">{{ ev.location }}</span>
					</template>
					<template #actions>
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
					</template>
				</NcListItem>
			</div>

			<div v-if="pastEvents.length > 0" class="cn-calendar-tab__group">
				<h4 class="cn-calendar-tab__group-title cn-calendar-tab__group-title--past">
					{{ pastLabel }}
				</h4>
				<NcListItem
					v-for="ev in pastEvents"
					:key="rowKey(ev)"
					:name="ev.summary || untitledLabel"
					:bold="false"
					:force-display-actions="true"
					class="cn-calendar-tab__row--past">
					<template #icon>
						<CalendarCheck :size="32" class="cn-calendar-tab__row-icon cn-calendar-tab__row-icon--past" />
					</template>
					<template #subname>
						{{ formatWhen(ev) }}
					</template>
					<template v-if="ev.location" #details>
						<span class="cn-calendar-tab__row-location">{{ ev.location }}</span>
					</template>
					<template #actions>
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
					</template>
				</NcListItem>
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
	NcListItem,
	NcActionButton,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import CalendarClock from 'vue-material-design-icons/CalendarClock.vue'
import CalendarCheck from 'vue-material-design-icons/CalendarCheck.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import { buildHeaders } from '../../../utils/index.js'
import CnCalendarEventPicker from '../../../components/CnCalendarEventPicker/CnCalendarEventPicker.vue'
import CnCalendarEventCreate from '../../../components/CnCalendarEventCreate/CnCalendarEventCreate.vue'

/**
 * CnCalendarTab — bespoke sidebar tab for the calendar integration.
 *
 * Tier-2 wiring: link/create flows are modal-driven (ADR-004 isolation),
 * and per-row actions distinguish UNLINK (preserves the VEVENT) from
 * DELETE (destroys the VEVENT).
 */
export default {
	name: 'CnCalendarTab',

	components: {
		NcButton,
		NcListItem,
		NcActionButton,
		NcLoadingIcon,
		Plus,
		AlertCircleOutline,
		LinkVariant,
		LinkVariantOff,
		CalendarClock,
		CalendarCheck,
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

		formatWhen(ev) {
			if (!ev.dtstart) return ''
			try {
				const start = new Date(ev.dtstart)
				if (Number.isNaN(start.getTime())) return String(ev.dtstart)
				return start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
			} catch (_) {
				return String(ev.dtstart)
			}
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

.cn-calendar-tab__timeline {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-calendar-tab__group {
	display: flex;
	flex-direction: column;
	gap: 2px;
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

.cn-calendar-tab__row-icon {
	color: var(--color-primary-element);
}

.cn-calendar-tab__row-icon--past {
	color: var(--color-text-maxcontrast);
}

.cn-calendar-tab__row--past {
	opacity: 0.75;
}

.cn-calendar-tab__row-location {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
