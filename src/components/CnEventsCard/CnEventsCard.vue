<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnEventsCard — the appointments booked on a record, as a list
  (`type: "events"`). Each row is a calendar event as OpenRegister answers
  it: `summary`, `dtstart` / `dtend` and `location`. It reads a `source`
  (`{ kind: "flow-task" }` reads `/api/flow-tasks/{id}/events`) or a plain
  `endpoint`; it lists and does not create.
-->
<template>
	<div class="cn-events-card" data-testid="cn-events-card">
		<NcLoadingIcon v-if="loading" :size="20" />
		<p
			v-else-if="failed"
			class="cn-events-card__muted"
			role="alert"
			data-testid="cn-events-card-failed">
			{{ failedText }}
		</p>
		<ul v-else-if="events.length > 0" class="cn-events-card__list">
			<li
				v-for="(event, index) in events"
				:key="keyOf(event, index)"
				class="cn-events-card__event"
				data-testid="cn-events-card-event">
				<span class="cn-events-card__summary">{{ summaryOf(event) }}</span>
				<span class="cn-events-card__when">{{ whenOf(event) }}</span>
				<span v-if="event.location" class="cn-events-card__where">{{ event.location }}</span>
			</li>
		</ul>
		<p v-else class="cn-events-card__muted" data-testid="cn-events-card-empty">
			{{ emptyText }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { leafSourceUrl } from '../../utils/leafSourceUrl.js'
import { userLocale } from '../../utils/userLocale.js'

/**
 * CnEventsCard — the appointments on a record, read from a `source` or an
 * `endpoint`, as a list of summary, time and place.
 *
 * ```vue
 * <CnEventsCard :source="{ kind: 'flow-task' }" :objectId="taskUuid" />
 * ```
 *
 * As a manifest widget:
 *
 * ```json
 * { "id": "task-appointments", "type": "events", "title": "Appointments", "content": { "source": { "kind": "flow-task" } } }
 * ```
 *
 * @spec openspec/changes/leaf-cards-read-a-source/specs/leaf-cards-read-a-source/spec.md#requirement-a-leaf-card-reads-a-source-or-an-endpoint
 */
export default {
	name: 'CnEventsCard',

	components: { NcLoadingIcon },

	inject: {
		/** The host app's translate function (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Where the events come from: `{ kind: 'flow-task', id? }`. `id` may be
		 * left out or written `@objectId` for `objectId`. Also read from
		 * `content.source`.
		 *
		 * @type {{kind: string, id?: (string|number)}|null}
		 */
		source: { type: Object, default: null },

		/** An events URL of its own; `{id}` is filled with the record id. Also read from `content.endpoint`. */
		endpoint: { type: String, default: '' },

		/** The page's record id. */
		objectId: { type: [String, Number], default: '' },

		/** The OpenRegister API base. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		/**
		 * The widget's manifest content: `source`, `endpoint`, `emptyText`
		 * (translated through the host).
		 *
		 * @type {{source?: object, endpoint?: string, emptyText?: string}}
		 */
		content: { type: Object, default: () => ({}) },

		/** Shown when the record has no appointments. */
		emptyLabel: { type: String, default: '' },

		/** Shown when the read failed. */
		failedLabel: { type: String, default: '' },
	},

	data() {
		return {
			events: [],
			loading: false,
			failed: false,
		}
	},

	computed: {
		/**
		 * The URL the card reads, '' while the record id is unknown.
		 *
		 * @return {string}
		 */
		url() {
			const content = this.content || {}
			const source = this.source || (content.source && typeof content.source === 'object' ? content.source : null)
			const endpoint = this.endpoint || (typeof content.endpoint === 'string' ? content.endpoint : '')
			return leafSourceUrl({ source, endpoint, apiBase: this.apiBase, objectId: this.objectId }, 'events') || ''
		},

		/** @return {string} The empty line. */
		emptyText() {
			if (this.emptyLabel) {
				return this.emptyLabel
			}
			const override = this.content && this.content.emptyText
			if (typeof override === 'string' && override !== '') {
				return typeof this.cnTranslate === 'function' ? this.cnTranslate(override) : override
			}
			return t('nextcloud-vue', 'No appointments yet')
		},

		/** @return {string} The failure line. */
		failedText() {
			return this.failedLabel || t('nextcloud-vue', 'The appointments could not be loaded')
		},
	},

	watch: {
		url: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		/**
		 * Read the events. A refused or failed read says so, rather than
		 * showing an empty list.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const url = this.url
			if (url === '') {
				this.events = []
				return
			}
			this.loading = true
			this.failed = false
			try {
				const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
				if (!response.ok) {
					this.events = []
					this.failed = true
					return
				}
				const data = await response.json()
				const list = data && Array.isArray(data.results) ? data.results : data
				this.events = Array.isArray(list) ? list : []
			} catch (error) {
				// eslint-disable-next-line no-console -- diagnostic for a failure the card already shows
				console.error('[CnEventsCard] Loading the events failed', error)
				this.events = []
				this.failed = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * @param {object} event The event.
		 * @param {number} index Its position, for an event that carries no id.
		 * @return {string} A stable key.
		 */
		keyOf(event, index) {
			return String(event?.id ?? event?.uid ?? `${index}-${event?.summary ?? ''}`)
		},

		/**
		 * @param {object} event The event.
		 * @return {string} Its summary, or "Appointment" when it has none.
		 */
		summaryOf(event) {
			const summary = String(event?.summary ?? '').trim()
			return summary === '' ? t('nextcloud-vue', 'Appointment') : summary
		},

		/**
		 * @param {object} event The event.
		 * @return {string} When it is: its start and end, or whichever it has.
		 */
		whenOf(event) {
			const start = formatMoment(event?.dtstart)
			const end = formatMoment(event?.dtend)
			if (start === '' || end === '') {
				return start || end
			}
			return `${start} - ${end}`
		},
	},
}

/**
 * @param {unknown} value An ISO date-time.
 * @return {string} It in the user's locale, as written when unreadable, '' when empty.
 */
function formatMoment(value) {
	const raw = String(value ?? '').trim()
	if (raw === '') {
		return ''
	}
	const parsed = new Date(raw)
	return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString(userLocale())
}
</script>

<style scoped>
.cn-events-card__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-events-card__event {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-events-card__event:last-child {
	padding-bottom: 0;
	border-bottom: none;
}

.cn-events-card__summary {
	font-weight: 600;
}

.cn-events-card__when,
.cn-events-card__where,
.cn-events-card__muted {
	color: var(--color-text-maxcontrast);
}

.cn-events-card__muted {
	margin: 0;
}
</style>
