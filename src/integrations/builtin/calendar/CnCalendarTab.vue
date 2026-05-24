<!--
  CnCalendarTab — bespoke sidebar tab for the `calendar` integration.

  Replaces the generic `CnIntegrationTab` for the calendar leaf: renders
  the object's linked VEVENTs as a timeline (date-ascending, with
  upcoming events surfaced above past events), surfaces an inline create
  form (summary + date + time), and offers a per-row unlink action that
  removes the OR ↔ VEVENT link without deleting the VEVENT from the
  user's Nextcloud Calendar.

  Talks to:
    - GET    /api/objects/{register}/{schema}/{id}/integrations/calendar
             (CalendarProvider::list — delegates to CalendarEventService)
    - POST   /api/objects/{register}/{schema}/{id}/events
             (existing CalendarEventsController::create — wraps the
             CalendarEventService directly, since CalendarProvider does
             not implement create() per its current scope)
    - DELETE /api/objects/{register}/{schema}/{id}/integrations/calendar/{calendarId}/{eventUri}
             (CalendarProvider::delete — strips the X-OPENREGISTER-* link
             properties from the VEVENT but leaves it in the calendar)

  Empty, loading and error states follow ADR-017 component composition.
  All UI strings are passed through `t('nextcloud-vue', ...)` per ADR-007.
  Styling uses Nextcloud CSS variables only — the nldesign app overrides
  them at the variable level (ADR-010).
-->
<template>
	<div class="cn-sidebar-tab cn-calendar-tab">
		<!-- Inline create form -->
		<div class="cn-calendar-tab__section">
			<div class="cn-calendar-tab__action-row">
				<NcTextField
					v-model="newEventSummary"
					:label="addEventLabel"
					@keyup.enter="addEvent" />
				<NcButton
					type="primary"
					:aria-label="addEventLabel"
					:disabled="!newEventSummary.trim() || saving"
					@click="addEvent">
					<template #icon>
						<NcLoadingIcon v-if="saving" :size="20" />
						<Plus v-else :size="20" />
					</template>
				</NcButton>
			</div>
			<div class="cn-calendar-tab__grid">
				<NcDateTimePickerNative
					id="cn-calendar-tab-start"
					v-model="newEventStart"
					:label="dateLabel"
					type="datetime" />
				<NcTextField
					v-model="newEventLocation"
					:label="locationLabel" />
			</div>
		</div>

		<!-- Error banner (transient, non-blocking) -->
		<div v-if="error" class="cn-calendar-tab__banner cn-calendar-tab__banner--error" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ error }}</span>
		</div>

		<!-- Unavailable banner (503 graceful degradation, AD-23) -->
		<div v-if="degraded" class="cn-calendar-tab__banner" role="status">
			<AlertCircleOutline :size="18" />
			<span>{{ unavailableLabel }}</span>
		</div>

		<!-- States -->
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="sortedEvents.length === 0" class="cn-sidebar-tab__empty cn-calendar-tab__empty">
			{{ noEventsLabel }}
		</div>

		<!-- Timeline (Upcoming / Past) -->
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
						<NcActionButton :disabled="unlinkingKey === rowKey(ev)" @click="unlink(ev)">
							<template #icon>
								<LinkVariantOff :size="20" />
							</template>
							{{ unlinkLabel }}
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
						<NcActionButton :disabled="unlinkingKey === rowKey(ev)" @click="unlink(ev)">
							<template #icon>
								<LinkVariantOff :size="20" />
							</template>
							{{ unlinkLabel }}
						</NcActionButton>
					</template>
				</NcListItem>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import {
	NcButton,
	NcTextField,
	NcListItem,
	NcActionButton,
	NcLoadingIcon,
	NcDateTimePickerNative,
} from '@nextcloud/vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import LinkVariantOff from 'vue-material-design-icons/LinkVariantOff.vue'
import CalendarClock from 'vue-material-design-icons/CalendarClock.vue'
import CalendarCheck from 'vue-material-design-icons/CalendarCheck.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnCalendarTab — bespoke sidebar tab for the calendar integration.
 *
 * Renders linked VEVENTs as a date-grouped timeline (upcoming + past),
 * with an inline create form and a per-row unlink action. Replaces the
 * generic CnIntegrationTab for the `calendar` leaf.
 */
export default {
	name: 'CnCalendarTab',

	components: {
		NcButton,
		NcTextField,
		NcListItem,
		NcActionButton,
		NcLoadingIcon,
		NcDateTimePickerNative,
		Plus,
		AlertCircleOutline,
		LinkVariantOff,
		CalendarClock,
		CalendarCheck,
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
		/** Add-event placeholder/label. */
		addEventLabel: { type: String, default: () => t('nextcloud-vue', 'Add meeting…') },
		/** Date picker label. */
		dateLabel: { type: String, default: () => t('nextcloud-vue', 'Start') },
		/** Location field label. */
		locationLabel: { type: String, default: () => t('nextcloud-vue', 'Location') },
		/** Per-row unlink button label. */
		unlinkLabel: { type: String, default: () => t('nextcloud-vue', 'Unlink') },
		/** Empty-state label. */
		noEventsLabel: { type: String, default: () => t('nextcloud-vue', 'No meetings linked yet') },
		/** Fallback when a VEVENT has no summary. */
		untitledLabel: { type: String, default: () => t('nextcloud-vue', '(no title)') },
		/** Upcoming group title. */
		upcomingLabel: { type: String, default: () => t('nextcloud-vue', 'Upcoming') },
		/** Past group title. */
		pastLabel: { type: String, default: () => t('nextcloud-vue', 'Past') },
		/** 503 graceful-degradation banner copy. */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'Nextcloud Calendar is currently unavailable.') },
	},

	emits: ['linked', 'unlinked'],

	data() {
		return {
			events: [],
			loading: false,
			saving: false,
			error: '',
			degraded: false,
			unlinkingKey: null,
			newEventSummary: '',
			newEventStart: null,
			newEventLocation: '',
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
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		rowKey(ev) {
			if (ev.calendarId && ev.id) {
				return `${ev.calendarId}/${ev.id}`
			}
			return ev.id || ev.uid || ''
		},

		async fetchEvents() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = false
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
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

		async addEvent() {
			if (!this.newEventSummary.trim() || !this.register || !this.schema || !this.objectId) {
				return
			}
			this.saving = true
			this.error = ''
			try {
				const payload = { summary: this.newEventSummary.trim() }
				if (this.newEventStart) {
					const start = new Date(this.newEventStart)
					if (!Number.isNaN(start.getTime())) {
						payload.dtstart = start.toISOString()
						// Default duration: 30 minutes.
						const end = new Date(start.getTime() + (30 * 60 * 1000))
						payload.dtend = end.toISOString()
					}
				}
				if (this.newEventLocation.trim()) {
					payload.location = this.newEventLocation.trim()
				}
				// The CalendarProvider does not implement create() — POST
				// the new VEVENT to the dedicated CalendarEventsController
				// endpoint, which is what consuming apps already use.
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/events`,
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify(payload),
					},
				)
				if (response.ok) {
					this.clearForm()
					await this.fetchEvents()
					/** @event linked Emitted after a new VEVENT is created and linked. */
					this.$emit('linked')
				} else if (response.status === 503) {
					this.degraded = true
				} else {
					let message = t('nextcloud-vue', 'Could not create the meeting.')
					try {
						const body = await response.json()
						if (body && typeof body.error === 'string' && body.error.length > 0) {
							message = body.error
						}
					} catch (_) { /* ignore parse errors */ }
					this.error = message
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarTab] failed to create event', err)
				this.error = t('nextcloud-vue', 'Could not create the meeting.')
			} finally {
				this.saving = false
			}
		},

		clearForm() {
			this.newEventSummary = ''
			this.newEventStart = null
			this.newEventLocation = ''
		},

		async unlink(ev) {
			const key = this.rowKey(ev)
			if (this.unlinkingKey || !key) {
				return
			}
			this.unlinkingKey = key
			this.error = ''
			try {
				const url = `${this.baseUrl()}/${encodeURI(key)}`
				const response = await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				if (response.ok || response.status === 204) {
					this.events = this.events.filter((row) => this.rowKey(row) !== key)
					/** @event unlinked Emitted after a row is unlinked. Payload: the row's composite id. */
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
				this.unlinkingKey = null
			}
		},

		formatWhen(ev) {
			if (!ev.dtstart) {
				return ''
			}
			try {
				const start = new Date(ev.dtstart)
				if (Number.isNaN(start.getTime())) {
					return String(ev.dtstart)
				}
				const opts = { dateStyle: 'medium', timeStyle: 'short' }
				return start.toLocaleString(undefined, opts)
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

.cn-calendar-tab__section {
	margin-bottom: 12px;
}

.cn-calendar-tab__action-row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
	margin-bottom: 8px;
}

.cn-calendar-tab__grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.cn-calendar-tab__grid > * {
	min-width: 0;
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
