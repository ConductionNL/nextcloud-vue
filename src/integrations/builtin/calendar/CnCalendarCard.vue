<!--
  CnCalendarCard — bespoke widget for the `calendar` integration.

  Surface-aware (AD-19) widget that renders linked VEVENTs across the
  four pluggable-integration-registry surfaces with one component:

    - `user-dashboard`  : compact list, "next 5 upcoming meetings" across
                          the user's objects (one row per VEVENT). Falls
                          back to a list scoped by the optional
                          register/schema/objectId when given (registry
                          dashboards pass the full triple) so it still
                          works without a global "across all my objects"
                          query — see AD-22.
    - `app-dashboard`   : same compact list scoped to the current app's
                          register/schema/objectId, when given.
    - `detail-page`     : full per-object meeting list with a quick
                          "Open in Calendar" CTA — the inline create
                          form lives in CnCalendarTab, not here, to keep
                          the detail card compact (design.md AD-3).
    - `single-entity`   : a single VEVENT rendered as a chip with date +
                          summary + status icon. Accepts `entityId`
                          (composite "calendarId/eventUri") for the
                          referenceType auto-rendering path.

  Loading / empty / error states follow ADR-017 component composition.
  All strings pass through t('nextcloud-vue', ...) for nl + en
  translation (ADR-007). Theming uses Nextcloud CSS variables only so
  the nldesign app's overrides apply transparently (ADR-010).
-->
<template>
	<CnDetailCard :title="resolvedTitle" :icon="Calendar" :collapsible="collapsible">
		<!-- Loading -->
		<NcLoadingIcon v-if="loading" />

		<!-- Error -->
		<div v-else-if="error" class="cn-calendar-card__error" role="alert">
			{{ error }}
		</div>

		<!-- Empty -->
		<div v-else-if="displayedEvents.length === 0" class="cn-calendar-card__empty">
			{{ noEventsLabel }}
		</div>

		<!-- single-entity surface: one compact chip -->
		<div v-else-if="surface === 'single-entity'" class="cn-calendar-card__chip">
			<CalendarClock :size="18" class="cn-calendar-card__chip-icon" />
			<span class="cn-calendar-card__chip-title">{{ displayedEvents[0].summary || untitledLabel }}</span>
			<span v-if="displayedEvents[0].dtstart" class="cn-calendar-card__chip-when">
				{{ formatShort(displayedEvents[0].dtstart) }}
			</span>
			<span
				v-if="displayedEvents[0].status"
				class="cn-calendar-card__chip-status"
				:class="`cn-calendar-card__chip-status--${displayedEvents[0].status}`">
				{{ displayedEvents[0].status }}
			</span>
		</div>

		<!-- list surfaces: user/app/detail share the row template -->
		<div v-else class="cn-calendar-card__list">
			<div
				v-for="ev in displayedEvents"
				:key="rowKey(ev)"
				class="cn-calendar-card__row">
				<div class="cn-calendar-card__row-icon">
					<CalendarClock v-if="isUpcoming(ev)" :size="20" class="cn-calendar-card__icon--upcoming" />
					<CalendarCheck v-else :size="20" class="cn-calendar-card__icon--past" />
				</div>
				<div class="cn-calendar-card__row-main">
					<span class="cn-calendar-card__title">{{ ev.summary || untitledLabel }}</span>
					<div class="cn-calendar-card__meta">
						<span v-if="ev.dtstart" class="cn-calendar-card__when">{{ formatShort(ev.dtstart) }}</span>
						<span v-if="ev.location" class="cn-calendar-card__location">· {{ ev.location }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer: detail surface gets "Open in NC Calendar" CTA -->
		<template v-if="surface === 'detail-page'" #footer>
			<a
				class="cn-calendar-card__cta"
				:href="calendarAppUrl"
				target="_blank"
				rel="noopener">
				{{ openInCalendarLabel }}
			</a>
		</template>

		<!-- Footer: dashboard surfaces get "Show all" when truncated -->
		<template v-else-if="allEvents.length > maxDisplay && surface !== 'single-entity'" #footer>
			<button class="cn-calendar-card__show-all" @click="$emit('show-all')">
				{{ showAllLabel }} ({{ allEvents.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcLoadingIcon } from '@nextcloud/vue'
import Calendar from 'vue-material-design-icons/Calendar.vue'
import CalendarClock from 'vue-material-design-icons/CalendarClock.vue'
import CalendarCheck from 'vue-material-design-icons/CalendarCheck.vue'

import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnCalendarCard — surface-aware compact widget for the calendar
 * integration. Renders linked VEVENTs across all four widget surfaces
 * (AD-19) with the same component.
 */
export default {
	name: 'CnCalendarCard',

	components: { CnDetailCard, NcLoadingIcon, CalendarClock, CalendarCheck },

	props: {
		/** OpenRegister register id (slug or uuid). Optional for user-dashboard. */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). Optional for user-dashboard. */
		schema: { type: String, default: '' },
		/** Parent object id. Optional for user-dashboard. */
		objectId: { type: String, default: '' },
		/** Stable integration id (matches PHP-side provider id). */
		integrationId: { type: String, default: 'calendar' },
		/**
		 * Composite entity id "calendarId/eventUri" for the
		 * single-entity surface. Ignored on other surfaces.
		 */
		entityId: { type: String, default: '' },
		/** Rendering surface per ADR-019 AD-19. */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (v) => ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity'].includes(v),
		},
		/** Base API URL for OpenRegister. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Maximum rows on list surfaces (ignored on single-entity). */
		maxDisplay: { type: Number, default: 5 },
		/** Whether the CnDetailCard collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },

		// --- Pre-translated labels (ADR-007) ---
		/** Empty-state label. */
		noEventsLabel: { type: String, default: () => t('nextcloud-vue', 'No meetings') },
		/** Fallback when a VEVENT has no summary. */
		untitledLabel: { type: String, default: () => t('nextcloud-vue', '(no title)') },
		/** detail-page footer CTA label. */
		openInCalendarLabel: { type: String, default: () => t('nextcloud-vue', 'Open in Calendar') },
		/** dashboard "show all" footer label. */
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
	},

	emits: ['show-all'],

	data() {
		return {
			Calendar,
			allEvents: [],
			loading: false,
			error: '',
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Meetings')
		},
		calendarAppUrl() {
			try {
				return generateUrl('/apps/calendar')
			} catch (_) {
				return '/apps/calendar'
			}
		},
		displayedEvents() {
			if (this.surface === 'single-entity') {
				return this.allEvents.slice(0, 1)
			}
			// list surfaces sort by dtstart ascending, then cap at maxDisplay.
			const sorted = [...this.allEvents].sort((a, b) => {
				const ta = a.dtstart ? new Date(a.dtstart).getTime() : Number.POSITIVE_INFINITY
				const tb = b.dtstart ? new Date(b.dtstart).getTime() : Number.POSITIVE_INFINITY
				return ta - tb
			})
			// On dashboard surfaces, surface upcoming meetings first.
			if (this.surface === 'user-dashboard' || this.surface === 'app-dashboard') {
				const now = Date.now()
				const upcoming = sorted.filter((ev) => {
					if (!ev.dtstart) return true
					return new Date(ev.dtstart).getTime() >= now
				})
				return upcoming.slice(0, this.maxDisplay)
			}
			return sorted.slice(0, this.maxDisplay)
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.refresh() } },
		entityId() { this.refresh() },
		surface() { this.refresh() },
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

		isUpcoming(ev) {
			if (!ev.dtstart) return true
			try {
				return new Date(ev.dtstart).getTime() >= Date.now()
			} catch (_) {
				return true
			}
		},

		refresh() {
			if (this.surface === 'single-entity') {
				this.fetchSingleEntity()
			} else {
				this.fetchList()
			}
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				this.allEvents = []
				return
			}
			this.loading = true
			this.error = ''
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.allEvents = data.results || data.items || (Array.isArray(data) ? data : []) || []
				} else if (response.status === 503) {
					this.allEvents = []
					this.error = t('nextcloud-vue', 'Calendar is currently unavailable.')
				} else {
					this.allEvents = []
					this.error = t('nextcloud-vue', 'Could not load meetings.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarCard] failed to fetch events', err)
				this.allEvents = []
				this.error = t('nextcloud-vue', 'Could not load meetings.')
			} finally {
				this.loading = false
			}
		},

		async fetchSingleEntity() {
			if (!this.entityId || !this.register || !this.schema || !this.objectId) {
				this.allEvents = []
				return
			}
			this.loading = true
			this.error = ''
			try {
				const url = `${this.baseUrl()}/${encodeURI(this.entityId)}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.allEvents = data && (data.id || data.uid) ? [data] : []
				} else {
					this.allEvents = []
					if (response.status !== 404) {
						this.error = t('nextcloud-vue', 'Could not load meeting.')
					}
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCalendarCard] failed to fetch single entity', err)
				this.allEvents = []
				this.error = t('nextcloud-vue', 'Could not load meeting.')
			} finally {
				this.loading = false
			}
		},

		formatShort(value) {
			if (!value) return ''
			try {
				const d = new Date(value)
				if (Number.isNaN(d.getTime())) return String(value)
				const opts = this.surface === 'single-entity'
					? { dateStyle: 'medium' }
					: { dateStyle: 'medium', timeStyle: 'short' }
				return d.toLocaleString(undefined, opts)
			} catch (_) {
				return String(value)
			}
		},
	},
}
</script>

<style scoped>
.cn-calendar-card__empty {
	text-align: center;
	padding: 16px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-calendar-card__error {
	color: var(--color-error);
	padding: 8px 0;
	font-size: 13px;
}

.cn-calendar-card__list {
	display: flex;
	flex-direction: column;
}

.cn-calendar-card__row {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-calendar-card__row:last-child {
	border-bottom: none;
}

.cn-calendar-card__row-icon {
	flex-shrink: 0;
	padding-top: 1px;
}

.cn-calendar-card__icon--upcoming { color: var(--color-primary-element); }
.cn-calendar-card__icon--past     { color: var(--color-text-maxcontrast); }

.cn-calendar-card__row-main {
	flex: 1;
	min-width: 0;
}

.cn-calendar-card__title {
	display: block;
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-calendar-card__meta {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-top: 2px;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-calendar-card__when {
	white-space: nowrap;
}

.cn-calendar-card__location {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-calendar-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: var(--border-radius-pill, 999px);
	background: var(--color-background-hover);
	font-size: 13px;
	max-width: 100%;
}

.cn-calendar-card__chip-icon {
	color: var(--color-primary-element);
	flex-shrink: 0;
}

.cn-calendar-card__chip-title {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-calendar-card__chip-when {
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.cn-calendar-card__chip-status {
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 1px 6px;
	border-radius: var(--border-radius-pill, 999px);
	background: var(--color-background-darker);
}

.cn-calendar-card__chip-status--confirmed { background: var(--color-success); color: var(--color-main-background); }
.cn-calendar-card__chip-status--tentative { background: var(--color-warning, #e9a40f); color: var(--color-main-background); }
.cn-calendar-card__chip-status--cancelled { background: var(--color-error); color: var(--color-main-background); }

.cn-calendar-card__cta,
.cn-calendar-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	padding: 0;
	width: 100%;
	text-align: center;
	text-decoration: none;
	display: inline-block;
}

.cn-calendar-card__cta:hover,
.cn-calendar-card__show-all:hover {
	text-decoration: underline;
}
</style>
