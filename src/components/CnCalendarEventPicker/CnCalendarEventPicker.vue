<!--
  CnCalendarEventPicker — 2-step modal for linking an existing CalDAV
  VEVENT to an OpenRegister object.

  Step 1: pick a calendar (loaded from GET /api/integrations/calendar/calendars)
  Step 2: pick an event on that calendar (loaded from
          GET /api/integrations/calendar/calendars/{uri}/events?after=&limit=)

  Emits `link` with `{ calendarUri, eventUid }` when the user confirms
  their choice; `close` when the user cancels. The host component is
  responsible for the actual POST /events/link request — this modal is
  presentation-only.

  ADR-004 modal isolation: lives in its own .vue file, mounted via
  NcModal, never inlined into the parent.
-->
<template>
	<NcDialog
		size="normal"
		:name="title"
		@closing="onClose">
		<div class="cn-calendar-event-picker">
			<!-- Step 1: calendars -->
			<div v-if="step === 'calendars'" class="cn-calendar-event-picker__step">
				<p class="cn-calendar-event-picker__instructions">
					{{ pickCalendarLabel }}
				</p>
				<NcLoadingIcon v-if="loadingCalendars" :size="32" />
				<div v-else-if="errorCalendars" class="cn-calendar-event-picker__banner cn-calendar-event-picker__banner--error" role="alert">
					{{ errorCalendars }}
				</div>
				<ul v-else-if="calendars.length > 0" class="cn-calendar-event-picker__calendar-list">
					<li
						v-for="cal in calendars"
						:key="cal.uri"
						class="cn-calendar-event-picker__calendar"
						tabindex="0"
						role="button"
						@click="selectCalendar(cal)"
						@keyup.enter="selectCalendar(cal)">
						<span
							class="cn-calendar-event-picker__color-swatch"
							:style="{ backgroundColor: cal.color || 'var(--color-primary-element)' }" />
						<span class="cn-calendar-event-picker__calendar-name">{{ cal.displayName }}</span>
					</li>
				</ul>
				<div v-else class="cn-calendar-event-picker__empty">
					{{ noCalendarsLabel }}
				</div>
			</div>

			<!-- Step 2: events on the chosen calendar -->
			<div v-else-if="step === 'events'" class="cn-calendar-event-picker__step">
				<div class="cn-calendar-event-picker__breadcrumb">
					<NcButton variant="tertiary" @click="backToCalendars">
						<template #icon>
							<ChevronLeft :size="20" />
						</template>
						{{ backLabel }}
					</NcButton>
					<span class="cn-calendar-event-picker__breadcrumb-calendar">
						{{ activeCalendar ? activeCalendar.displayName : '' }}
					</span>
				</div>

				<NcTextField
					v-model="filterText"
					:label="filterLabel"
					class="cn-calendar-event-picker__filter" />

				<NcLoadingIcon v-if="loadingEvents" :size="32" />
				<div v-else-if="errorEvents" class="cn-calendar-event-picker__banner cn-calendar-event-picker__banner--error" role="alert">
					{{ errorEvents }}
				</div>
				<ul v-else-if="filteredEvents.length > 0" class="cn-calendar-event-picker__event-list">
					<li
						v-for="ev in filteredEvents"
						:key="ev.uid"
						class="cn-calendar-event-picker__event"
						:class="{ 'cn-calendar-event-picker__event--selected': selectedEventUid === ev.uid }"
						tabindex="0"
						role="button"
						@click="selectEvent(ev)"
						@keyup.enter="selectEvent(ev)">
						<div class="cn-calendar-event-picker__event-summary">
							{{ ev.summary || untitledLabel }}
						</div>
						<div class="cn-calendar-event-picker__event-meta">
							<span class="cn-calendar-event-picker__event-when">{{ formatWhen(ev) }}</span>
							<span v-if="ev.location" class="cn-calendar-event-picker__event-location">{{ ev.location }}</span>
						</div>
					</li>
				</ul>
				<div v-else class="cn-calendar-event-picker__empty">
					{{ noEventsLabel }}
				</div>
			</div>
		</div>

		<template #actions>
			<template v-if="step === 'events'">
				<NcButton variant="tertiary" @click="onClose">
					{{ cancelLabel }}
				</NcButton>
				<NcButton
					variant="primary"
					:disabled="!selectedEventUid"
					@click="confirmSelection">
					{{ confirmLabel }}
				</NcButton>
			</template>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton, NcTextField, NcLoadingIcon } from '@nextcloud/vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnCalendarEventPicker — 2-step calendar/event picker modal for the
 * calendar integration. Backend contract: requires the OR endpoints
 * `GET /api/integrations/calendar/calendars` and
 * `GET /api/integrations/calendar/calendars/{uri}/events`.
 */
export default {
	name: 'CnCalendarEventPicker',

	components: {
		NcDialog,
		NcButton,
		NcTextField,
		NcLoadingIcon,
		ChevronLeft,
	},

	props: {
		/** Base API URL for OpenRegister. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Default "after" filter for picker step 2 (ISO 8601). */
		eventsAfter: { type: String, default: '' },
		/** Max number of events returned by the picker source. */
		eventsLimit: { type: Number, default: 100 },

		// --- Pre-translated labels (ADR-007) ---
		/** Pre-translated dialog title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Link an existing meeting') },
		/** Pre-translated heading for the calendar-pick step. */
		pickCalendarLabel: { type: String, default: () => t('nextcloud-vue', 'Pick a calendar') },
		/** Pre-translated empty-state label when no calendars are available. */
		noCalendarsLabel: { type: String, default: () => t('nextcloud-vue', 'No calendars available.') },
		/** Pre-translated label for the Back button. */
		backLabel: { type: String, default: () => t('nextcloud-vue', 'Back') },
		/** Pre-translated placeholder for the event filter field. */
		filterLabel: { type: String, default: () => t('nextcloud-vue', 'Filter events…') },
		/** Pre-translated fallback label for an event with no title. */
		untitledLabel: { type: String, default: () => t('nextcloud-vue', '(no title)') },
		/** Pre-translated empty-state label when no events are found. */
		noEventsLabel: { type: String, default: () => t('nextcloud-vue', 'No events found.') },
		/** Pre-translated label for the Cancel button. */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Pre-translated label for the confirm (Link) button. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Link event') },
	},

	emits: ['link', 'close'],

	data() {
		return {
			step: 'calendars',
			calendars: [],
			events: [],
			loadingCalendars: false,
			loadingEvents: false,
			errorCalendars: '',
			errorEvents: '',
			activeCalendar: null,
			selectedEventUid: null,
			filterText: '',
		}
	},

	computed: {
		filteredEvents() {
			const needle = this.filterText.trim().toLowerCase()
			if (!needle) return this.events
			return this.events.filter((ev) => {
				const summary = (ev.summary || '').toLowerCase()
				return summary.includes(needle)
			})
		},
		defaultAfter() {
			if (this.eventsAfter) return this.eventsAfter
			const d = new Date()
			d.setDate(d.getDate() - 7)
			return d.toISOString()
		},
	},

	mounted() {
		this.loadCalendars()
	},

	methods: {
		async loadCalendars() {
			this.loadingCalendars = true
			this.errorCalendars = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/calendar/calendars`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.calendars = data.results || []
				} else {
					this.errorCalendars = t('nextcloud-vue', 'Could not load calendars.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarEventPicker] failed to load calendars', err)
				this.errorCalendars = t('nextcloud-vue', 'Could not load calendars.')
			} finally {
				this.loadingCalendars = false
			}
		},

		async selectCalendar(cal) {
			this.activeCalendar = cal
			this.step = 'events'
			this.selectedEventUid = null
			this.events = []
			await this.loadEvents(cal.uri)
		},

		async loadEvents(calendarUri) {
			this.loadingEvents = true
			this.errorEvents = ''
			try {
				const params = new URLSearchParams({
					after: this.defaultAfter,
					limit: String(this.eventsLimit),
				})
				const response = await fetch(
					`${this.apiBase}/integrations/calendar/calendars/${encodeURIComponent(calendarUri)}/events?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.events = data.results || []
				} else {
					this.errorEvents = t('nextcloud-vue', 'Could not load events.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarEventPicker] failed to load events', err)
				this.errorEvents = t('nextcloud-vue', 'Could not load events.')
			} finally {
				this.loadingEvents = false
			}
		},

		selectEvent(ev) {
			this.selectedEventUid = ev.uid
		},

		backToCalendars() {
			this.step = 'calendars'
			this.selectedEventUid = null
			this.events = []
		},

		confirmSelection() {
			if (!this.selectedEventUid || !this.activeCalendar) return
			/**
			 * @event link
			 *   Emitted when the user confirms an event selection.
			 *   Payload: { calendarUri, eventUid }
			 */
			this.$emit('link', {
				calendarUri: this.activeCalendar.uri,
				eventUid: this.selectedEventUid,
			})
		},

		onClose() {
			/** @event close Emitted when the dialog should be closed (cancel or close button). */
			this.$emit('close')
		},

		formatWhen(ev) {
			if (!ev.dtstart) return ''
			try {
				const d = new Date(ev.dtstart)
				if (Number.isNaN(d.getTime())) return String(ev.dtstart)
				return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
			} catch (_) {
				return String(ev.dtstart)
			}
		},
	},
}
</script>

<style scoped>
.cn-calendar-event-picker {
	padding: 20px;
	min-width: 480px;
}

.cn-calendar-event-picker__instructions {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-calendar-event-picker__banner {
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-calendar-event-picker__banner--error {
	background: var(--color-error, #e9322d);
}

.cn-calendar-event-picker__calendar-list,
.cn-calendar-event-picker__event-list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 360px;
	overflow-y: auto;
}

.cn-calendar-event-picker__calendar {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-calendar-event-picker__calendar:hover,
.cn-calendar-event-picker__calendar:focus {
	background: var(--color-background-hover);
}

.cn-calendar-event-picker__color-swatch {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-calendar-event-picker__calendar-name {
	font-size: 14px;
}

.cn-calendar-event-picker__breadcrumb {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-calendar-event-picker__breadcrumb-calendar {
	font-weight: 600;
}

.cn-calendar-event-picker__filter {
	margin-bottom: 12px;
}

.cn-calendar-event-picker__event {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-calendar-event-picker__event:hover,
.cn-calendar-event-picker__event:focus {
	background: var(--color-background-hover);
}

.cn-calendar-event-picker__event--selected {
	background: var(--color-primary-element-light);
}

.cn-calendar-event-picker__event-summary {
	font-weight: 500;
}

.cn-calendar-event-picker__event-meta {
	display: flex;
	gap: 12px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-event-picker__empty {
	padding: 24px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}
</style>
