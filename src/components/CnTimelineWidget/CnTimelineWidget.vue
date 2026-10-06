<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<section class="cn-timeline-widget" data-testid="cn-timeline-widget" :aria-busy="loading ? 'true' : 'false'">
		<h3 v-if="resolvedTitle" class="cn-timeline-widget__title">
			{{ resolvedTitle }}
		</h3>

		<div v-if="loading && events.length === 0" class="cn-timeline-widget__loading">
			<NcLoadingIcon :size="24" aria-hidden="true" />
			<span>{{ loadingLabel }}</span>
		</div>

		<template v-else>
			<!-- A failed read is not an empty history: say which part is missing. -->
			<NcNoteCard v-if="failedSources.length > 0" type="warning" data-testid="cn-timeline-widget-error">
				{{ failedText }}
			</NcNoteCard>

			<p v-if="events.length === 0" class="cn-timeline-widget__empty" data-testid="cn-timeline-widget-empty">
				{{ emptyLabel }}
			</p>

			<ol v-else class="cn-timeline-widget__list">
				<li
					v-for="event in events"
					:key="event.id"
					class="cn-timeline-widget__event"
					:class="{ 'cn-timeline-widget__event--upcoming': event.upcoming }"
					:data-source="event.source"
					data-testid="cn-timeline-widget-event">
					<span class="cn-timeline-widget__dot" aria-hidden="true" />
					<div class="cn-timeline-widget__body">
						<time class="cn-timeline-widget__when" :datetime="event.at.toISOString()">
							{{ formatMoment(event) }}
						</time>
						<span v-if="event.upcoming" class="cn-timeline-widget__badge">
							{{ upcomingLabel }}
						</span>
						<p class="cn-timeline-widget__label">
							{{ translate(event.label) }}
						</p>
						<p v-if="event.detail" class="cn-timeline-widget__detail">
							{{ event.detail }}
						</p>
					</div>
				</li>
			</ol>
		</template>
	</section>
</template>

<script>
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { auditEvents, fieldEvents, relatedEvents, sortEvents, timelineEntryEvents } from '../../utils/timelineEvents.js'

/**
 * CnTimelineWidget — an object's dated events in time order (`timeline`
 * widget type for detail pages).
 *
 * Generalises dossiq's case timeline. It merges up to four sources, all
 * optional, into one list:
 *
 * - `fields`: the object's own date properties, `[{ field, label }]`. A
 *   dotted path reaches metadata, such as `@self.created`.
 * - `related`: related objects, `[{ register?, schema, field, dateField?,
 *   label, titleField? }]`. Rows of `schema` whose `field` holds this object's
 *   id become events at their `dateField` (default `@self.created`).
 * - `auditTrail: true`: the object's audit trail, one event per change.
 * - `timeline: true`: OpenRegister's timeline of notes, calls and messages.
 *
 * Oldest first by default (`order: 'desc'` flips it). A moment after now is
 * marked upcoming, in words as well as style.
 *
 * ```json
 * { "type": "timeline", "content": {
 *   "title": "Timeline",
 *   "fields": [
 *     { "field": "@self.created", "label": "Booking created" },
 *     { "field": "depositClearedAt", "label": "Deposit cleared" },
 *     { "field": "confirmationSentAt", "label": "Confirmation mail sent" },
 *     { "field": "startsAt", "label": "Starts" },
 *     { "field": "endsAt", "label": "Ends" }
 *   ] } }
 * ```
 *
 * The object comes from the detail page's context, like `audit-trail`:
 * explicit props win, then the injects, then `content`.
 *
 * @spec openspec/changes/timeline-widget/specs/timeline-widget/spec.md#requirement-a-timeline-widget-shows-an-objects-dated-events-in-order
 */
export default {
	name: 'CnTimelineWidget',

	components: {
		NcLoadingIcon,
		NcNoteCard,
	},

	inject: {
		/** Detail-page object context from CnDetailPage (a ref or a raw bag). */
		cnObjectContext: { default: null },
		/** Detail object context holder from CnPageRenderer (`{ value: { objectData, ... } }`). */
		cnDetailObjectContext: { default: null },
		/** Consumer translation function; labels are authored in English. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** Register slug; object context spread as props by CnWidgetGrid. */
		register: { type: String, default: '' },
		/**
		 * Schema slug, or the schema object the detail context supplies.
		 *
		 * @type {string|object}
		 */
		schema: { type: [String, Object], default: '' },
		/** The object's id. */
		objectId: { type: String, default: '' },
		/** The object itself, when the host already has it. */
		object: { type: Object, default: null },
		/** Card title override. */
		title: { type: String, default: '' },
		/** Stored widget content: `{ title, fields, related, auditTrail, timeline, order }`. */
		content: { type: Object, default: () => ({}) },
		/** OpenRegister API base. */
		apiBase: { type: String, default: '/apps/openregister/api' },
	},

	data() {
		return {
			loading: false,
			relatedRows: {},
			auditEntries: [],
			timelineEntries: [],
			failedSources: [],
			fetchedObject: null,
			loadSeq: 0,
		}
	},

	computed: {
		ctx() {
			const raw = this.cnObjectContext
			const inj = raw && (raw.value !== undefined ? raw.value : raw)
			const holder = this.cnDetailObjectContext && this.cnDetailObjectContext.value
			return inj || holder || {}
		},

		resolvedObjectId() {
			return this.objectId || this.ctx.objectId || this.content.objectId || ''
		},

		resolvedRegister() {
			return this.register || this.ctx.register || this.content.register || ''
		},

		resolvedSchema() {
			const s = this.schema || this.ctx.schema || this.content.schema || ''
			return typeof s === 'string' ? s : (s && (s.slug || s.name || s.id)) || ''
		},

		/**
		 * The object: explicit prop, then the page context, then a fetch of
		 * our own when only the id is known.
		 *
		 * @return {object|null}
		 */
		resolvedObject() {
			return this.object || this.ctx.object || this.ctx.objectData || this.fetchedObject || null
		},

		resolvedTitle() {
			const raw = this.title || this.content.title || ''
			return raw ? this.translate(raw) : ''
		},

		fieldsConfig() {
			return Array.isArray(this.content.fields) ? this.content.fields : []
		},

		relatedConfig() {
			return Array.isArray(this.content.related) ? this.content.related.filter((r) => r && r.schema && r.field) : []
		},

		/**
		 * Every event from every source, in time order.
		 *
		 * @return {Array<object>}
		 */
		events() {
			const now = new Date()
			const all = [
				...fieldEvents(this.resolvedObject || {}, this.fieldsConfig, now),
				...this.relatedConfig.flatMap((cfg, i) => relatedEvents(this.relatedRows[i] || [], cfg, now)),
				...auditEvents(this.auditEntries, this.describeAudit, now),
				...timelineEntryEvents(this.timelineEntries, t('nextcloud-vue', 'Note'), now),
			]
			return sortEvents(all, this.content.order === 'desc' ? 'desc' : 'asc')
		},

		/**
		 * A signature of what to fetch, so a change refetches once.
		 *
		 * @return {string}
		 */
		loadKey() {
			return JSON.stringify({
				id: this.resolvedObjectId,
				register: this.resolvedRegister,
				schema: this.resolvedSchema,
				related: this.relatedConfig,
				audit: this.content.auditTrail === true,
				timeline: this.content.timeline === true,
				needObject: this.fieldsConfig.length > 0 && !(this.object || this.ctx.object || this.ctx.objectData),
			})
		},

		failedText() {
			return t('nextcloud-vue', 'Part of the timeline could not load: {parts}.', {
				parts: this.failedSources.map((s) => this.sourceName(s)).join(', '),
			})
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		emptyLabel() {
			return t('nextcloud-vue', 'Nothing has happened yet.')
		},

		upcomingLabel() {
			return t('nextcloud-vue', 'Upcoming')
		},
	},

	watch: {
		loadKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		translate(text) {
			return text ? this.cnTranslate(text) : ''
		},

		sourceName(source) {
			if (source === 'audit') {
				return t('nextcloud-vue', 'changes')
			}
			if (source === 'timeline') {
				return t('nextcloud-vue', 'notes and messages')
			}
			if (source === 'object') {
				return t('nextcloud-vue', 'dates')
			}
			return t('nextcloud-vue', 'related items')
		},

		/**
		 * The label of an audit event, from its action and who did it.
		 *
		 * @param {string} action The audit action (create, update, delete).
		 * @param {string} actor Who did it.
		 * @return {string}
		 */
		describeAudit(action, actor) {
			const known = {
				create: t('nextcloud-vue', 'Created'),
				update: t('nextcloud-vue', 'Updated'),
				delete: t('nextcloud-vue', 'Deleted'),
			}
			const what = known[action] || action || t('nextcloud-vue', 'Changed')
			return actor ? t('nextcloud-vue', '{action} by {actor}', { action: what, actor }) : what
		},

		/**
		 * Show a moment in the reader's language: a date for a calendar day,
		 * date and time otherwise.
		 *
		 * @param {object} event The event.
		 * @return {string}
		 */
		formatMoment(event) {
			const locale = (typeof getLanguage === 'function' && getLanguage()) || undefined
			const options = event.dateOnly
				? { dateStyle: 'medium' }
				: { dateStyle: 'medium', timeStyle: 'short' }
			try {
				return new Intl.DateTimeFormat(locale, options).format(event.at)
			} catch {
				return event.at.toLocaleString()
			}
		},

		/**
		 * Fetch every configured source. Each one fails on its own, so one
		 * unreachable source never hides the others.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/timeline-widget/specs/timeline-widget/spec.md#requirement-a-timeline-widget-shows-an-objects-dated-events-in-order
		 */
		async load() {
			const id = this.resolvedObjectId
			const register = this.resolvedRegister
			const schema = this.resolvedSchema
			const seq = ++this.loadSeq
			if (!id || !register || !schema) {
				return
			}
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const base = `${this.apiBase}/objects/${register}/${schema}/${id}`
			const failed = []
			const jobs = []

			if (this.fieldsConfig.length > 0 && !(this.object || this.ctx.object || this.ctx.objectData)) {
				jobs.push(axios.get(generateUrl(base))
					.then((r) => {
						this.fetchedObject = (r && r.data) || null
					})
					.catch(() => failed.push('object')))
			}

			const rows = {}
			this.relatedConfig.forEach((cfg, i) => {
				const url = generateUrl(`${this.apiBase}/objects/${cfg.register || register}/${cfg.schema}`)
				jobs.push(axios.get(url, { params: { [cfg.field]: id, _limit: cfg.limit || 50 } })
					.then((r) => {
						const data = r && r.data
						rows[i] = (data && (data.results || data)) || []
					})
					.catch(() => {
						rows[i] = []
						if (!failed.includes('related')) {
							failed.push('related')
						}
					}))
			})

			if (this.content.auditTrail === true) {
				jobs.push(axios.get(generateUrl(`${base}/audit-trail`), { params: { limit: this.content.auditLimit || 50 } })
					.then((r) => {
						const data = r && r.data
						this.auditEntries = (data && (data.results || data)) || []
					})
					.catch(() => {
						this.auditEntries = []
						failed.push('audit')
					}))
			}

			if (this.content.timeline === true) {
				jobs.push(axios.get(generateUrl(`${base}/timeline`))
					.then((r) => {
						const data = r && r.data
						this.timelineEntries = (data && (data.results || data)) || []
					})
					.catch(() => {
						this.timelineEntries = []
						failed.push('timeline')
					}))
			}

			if (jobs.length === 0) {
				this.failedSources = []
				return
			}
			this.loading = true
			await Promise.all(jobs)
			if (seq !== this.loadSeq) {
				return
			}
			this.relatedRows = rows
			this.failedSources = failed
			this.loading = false
		},
	},
}
</script>

<style scoped>
.cn-timeline-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-timeline-widget__title {
	margin: 0;
	font-size: var(--font-size-large, 1.1em);
}

.cn-timeline-widget__loading {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-widget__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-widget__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-timeline-widget__event {
	position: relative;
	display: flex;
	gap: 12px;
	padding-block-end: 12px;
}

/* The line between dots: drawn from each dot down to the next event. */
.cn-timeline-widget__event:not(:last-child)::before {
	content: '';
	position: absolute;
	inset-block: 14px 0;
	inset-inline-start: 5px;
	border-inline-start: 2px solid var(--color-border-dark);
}

.cn-timeline-widget__dot {
	flex: 0 0 auto;
	width: 12px;
	height: 12px;
	margin-block-start: 4px;
	border-radius: 50%;
	background-color: var(--color-primary-element);
}

/* Upcoming: a hollow dot, plus the word "Upcoming" beside the date. */
.cn-timeline-widget__event--upcoming .cn-timeline-widget__dot {
	box-sizing: border-box;
	border: 2px solid var(--color-primary-element);
	background-color: var(--color-main-background);
}

.cn-timeline-widget__body {
	min-width: 0;
}

.cn-timeline-widget__when {
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-timeline-widget__badge {
	margin-inline-start: 8px;
	font-size: var(--font-size-small, 13px);
	font-weight: bold;
	color: var(--color-main-text);
}

.cn-timeline-widget__label {
	margin: 0;
	font-weight: bold;
}

.cn-timeline-widget__detail {
	margin: 0;
	overflow-wrap: anywhere;
}
</style>
