<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl> -->
<template>
	<CnTimelineManage v-if="manage"
		:register="resolvedRegister"
		:schema="resolvedSchema"
		:objectId="resolvedObjectId"
		:apiBase="apiBase"
		:content="content" />
	<section v-else
		class="cn-timeline-widget"
		:class="{ 'cn-timeline-widget--feed': isFeed }"
		data-testid="cn-timeline-widget"
		:aria-busy="loading ? 'true' : 'false'">
		<h3 v-if="resolvedTitle" class="cn-timeline-widget__title">
			{{ resolvedTitle }}
		</h3>

		<div v-if="typeChips.length > 0"
			class="cn-timeline-widget__chips"
			role="toolbar"
			:aria-label="chipsLabel">
			<button
				v-for="chip in typeChips"
				:key="chip.value"
				type="button"
				class="cn-timeline-widget__chip"
				:class="{ 'cn-timeline-widget__chip--active': activeType === chip.value }"
				:aria-pressed="activeType === chip.value ? 'true' : 'false'"
				:data-testid="`cn-timeline-widget-chip-${chip.value || 'all'}`"
				@click="chooseType(chip.value)">
				{{ chip.label }}
			</button>
		</div>

		<div v-if="composer" class="cn-timeline-widget__composer">
			<CnNoteComposer
				v-model="noteText"
				class="cn-timeline-widget__composer-input"
				:placeholder="composer.placeholder"
				:label="composer.label"
				:register="resolvedRegister"
				:schema="resolvedSchema"
				:objectId="resolvedObjectId"
				:apiBase="apiBase"
				@submit="addNote" />
			<NcButton
				variant="primary"
				:disabled="savingNote || noteText.trim() === ''"
				data-testid="cn-timeline-widget-add-note"
				@click="addNote">
				{{ composer.submitLabel }}
			</NcButton>
		</div>
		<p v-if="noteError"
			class="cn-timeline-widget__note-error"
			role="alert"
			data-testid="cn-timeline-widget-note-error">
			{{ noteError }}
		</p>

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

			<ol v-else-if="isFeed" class="cn-timeline-widget__list">
				<li
					v-for="event in events"
					:key="event.id"
					class="cn-timeline-widget__feed-row"
					:data-source="event.source"
					data-testid="cn-timeline-widget-event">
					<span class="cn-timeline-widget__feed-icon" aria-hidden="true">
						<CnIcon v-if="event.icon"
							:name="event.icon"
							:size="18"
							:data-icon="event.icon"
							data-testid="cn-timeline-widget-icon" />
						<span v-else class="cn-timeline-widget__feed-dot" />
					</span>
					<div class="cn-timeline-widget__feed-body">
						<span class="cn-timeline-widget__feed-meta">
							<time :datetime="event.at.toISOString()">{{ formatFeedMoment(event) }}</time><template v-if="event.meta">
								· {{ event.meta }}</template>
						</span>
						<span class="cn-timeline-widget__feed-text">{{ translate(event.label) }}</span>
						<span v-if="event.detail && event.detail !== event.label" class="cn-timeline-widget__feed-detail">{{ event.detail }}</span>
					</div>
				</li>
			</ol>

			<ol v-else class="cn-timeline-widget__list">
				<li
					v-for="event in events"
					:key="event.id"
					class="cn-timeline-widget__event"
					:class="{ 'cn-timeline-widget__event--upcoming': event.upcoming }"
					:data-source="event.source"
					data-testid="cn-timeline-widget-event">
					<CnIcon v-if="event.icon"
						:name="event.icon"
						:size="18"
						class="cn-timeline-widget__icon"
						:data-icon="event.icon"
						data-testid="cn-timeline-widget-icon"
						aria-hidden="true" />
					<span v-else class="cn-timeline-widget__dot" aria-hidden="true" />
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
						<p v-if="event.meta" class="cn-timeline-widget__meta">
							{{ event.meta }}
						</p>
					</div>
				</li>
			</ol>
			<NcButton v-if="endpointSource && endpointPage < endpointPages && !loading"
				variant="secondary"
				data-testid="cn-timeline-widget-more"
				@click="loadEndpoint(endpointPage + 1)">
				{{ moreLabel }}
			</NcButton>
		</template>
	</section>
</template>

<script>
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import CnNoteComposer from '../CnNoteComposer/CnNoteComposer.vue'
import CnTimelineManage from './CnTimelineManage.vue'
import { useRefLabels } from '../../composables/useRefLabels.js'
import { auditExclusionParams, keepAuditEntries } from '../../utils/auditEntries.js'
import { auditLabel } from '../../utils/auditLabels.js'
import { readPath } from '../../utils/readPath.js'
import { auditEvents, endpointEvents, fieldEvents, listEvents, relatedEvents, sortEvents, timelineEntryEvents } from '../../utils/timelineEvents.js'
import { userLocale } from '../../utils/userLocale.js'

/** Event-bus channel: a record's timeline changed (`{ objectId, source }`), shared with CnTimelineManage. */
const TIMELINE_CHANGED = 'cn:timeline:changed'

let instanceCount = 0

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
 * Oldest first by default (`order: 'desc'` flips it). `limit` keeps the
 * first that many events of that order. A moment after now is
 * marked upcoming, in words as well as style.
 *
 * `layout: 'feed'` draws each event as a round icon, a meta line (when, kind,
 * who) and the text, as an activity card does. `composer` (`{ placeholder,
 * label, submitLabel }`) puts a note box above the list: the note is written
 * on the record (OpenRegister notes) and the timeline reads again. Any
 * `cn:timeline:changed` for the record makes it read again too.
 *
 * `manage: true` swaps the read view for the manage view (CnTimelineManage)
 * over OpenRegister's timeline alone: kind chips, a visibility filter, pin,
 * follow-up, a note composer with standard text blocks, CSV export, and
 * `entryActions` that open a registry modal on an entry. The manage controls
 * are drawn only when the timeline read answers `canManage: true`.
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
/** The reference resolver every timeline shares, so a label is read once. */
let refLabels = null

/**
 * The shared reference resolver, made on first use.
 *
 * @return {object} The resolver.
 */
function sharedRefLabels() {
	if (!refLabels) {
		refLabels = useRefLabels()
	}
	return refLabels
}

export default {
	name: 'CnTimelineWidget',

	components: {
		CnIcon,
		CnNoteComposer,
		CnTimelineManage,
		NcButton,
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
		/** Stored widget content: `{ title, fields, related, auditTrail, timeline, order, manage, entryActions, ... }`. */
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
			referenceLabels: {},
			loadSeq: 0,
			endpointItems: [],
			endpointPage: 0,
			endpointPages: 0,
			activeType: '',
			noteText: '',
			savingNote: false,
			noteError: '',
			uid: `cn-timeline-widget-${++instanceCount}`,
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

		/**
		 * Whether the manage view renders instead of the read view.
		 *
		 * @return {boolean}
		 */
		manage() {
			return this.content.manage === true
		},

		/** @return {boolean} Whether events are drawn as feed rows. */
		isFeed() {
			return this.content.layout === 'feed'
		},

		/**
		 * The note box, translated, when configured and the record is known.
		 *
		 * @return {{placeholder: string, label: string, submitLabel: string}|null}
		 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md#requirement-the-read-view-can-take-a-note
		 */
		composer() {
			const raw = this.content.composer
			if (!raw || typeof raw !== 'object' || !this.resolvedObjectId || !this.resolvedRegister || !this.resolvedSchema) {
				return null
			}
			return {
				placeholder: raw.placeholder ? this.translate(raw.placeholder) : t('nextcloud-vue', 'Write a note…'),
				label: raw.label ? this.translate(raw.label) : t('nextcloud-vue', 'Note'),
				submitLabel: raw.submitLabel ? this.translate(raw.submitLabel) : t('nextcloud-vue', 'Add note'),
			}
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
				...listEvents(this.resolvedObject || {}, this.content.lists, now),
				...this.relatedConfig.flatMap((cfg, i) => relatedEvents(this.relatedRows[i] || [], cfg, now, (text) => this.translate(text))),
				...auditEvents(this.shownAuditEntries, this.describeAudit, now),
				...timelineEntryEvents(this.timelineEntries, t('nextcloud-vue', 'Note'), now),
				...(this.endpointSource ? endpointEvents(this.endpointItems, this.endpointSource, (type) => this.typeLabel(type), t('nextcloud-vue', '(no title)'), now) : []),
			]
			const sorted = sortEvents(all, this.content.order === 'desc' ? 'desc' : 'asc')
			const limit = Number(this.content.limit)
			return Number.isInteger(limit) && limit > 0 ? sorted.slice(0, limit) : sorted
		},

		/**
		 * The audit entries the timeline shows: without the actions and actors
		 * `excludeActions` / `excludeActors` leave out, by the History card's
		 * rule; every entry when neither is set.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
		 */
		shownAuditEntries() {
			const { excludeActions, excludeActors } = this.content
			if (!Array.isArray(excludeActions) && !Array.isArray(excludeActors)) {
				return this.auditEntries
			}
			return keepAuditEntries(this.auditEntries, { excludeActions, excludeActors })
		},

		/**
		 * The references `resolve` names (`{ <field>: { register?, schema,
		 * labelField? } }`) with the id the record holds there, as one key, so
		 * a change reads the labels again.
		 *
		 * @return {string}
		 * @spec openspec/changes/timeline-label-reads-a-reference/specs/timeline-widget/spec.md#requirement-a-label-can-name-the-record-a-reference-points-at
		 */
		referenceKey() {
			const resolve = this.content.resolve && typeof this.content.resolve === 'object' ? this.content.resolve : {}
			const object = this.resolvedObject || {}
			return JSON.stringify(Object.keys(resolve).map((field) => [field, readPath(object, field)]))
		},

		/**
		 * The record with each `resolve` field's id replaced by the label of the
		 * record it points at, for a label's `{object.<field>}`; the id stays
		 * until its label is known.
		 *
		 * @return {object}
		 * @spec openspec/changes/timeline-label-reads-a-reference/specs/timeline-widget/spec.md#requirement-a-label-can-name-the-record-a-reference-points-at
		 */
		labelledObject() {
			const object = this.resolvedObject || {}
			const labels = Object.fromEntries(Object.entries(this.referenceLabels).filter(([, label]) => typeof label === 'string' && label !== ''))
			return Object.keys(labels).length > 0 ? { ...object, ...labels } : object
		},

		/**
		 * The History card's words for audit entries (`actionLabels`,
		 * `changeLabels`, `valueLabels`), their labels in the host's translation.
		 *
		 * @return {{actionLabels: object|null, changeLabels: Array<object>, valueLabels: object|null}}
		 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
		 */
		auditWords() {
			const actions = this.content.actionLabels && typeof this.content.actionLabels === 'object' ? this.content.actionLabels : null
			return {
				actionLabels: actions ? Object.fromEntries(Object.entries(actions).map(([key, label]) => [key, Array.isArray(label) ? label.map((option) => ({ ...option, text: this.translate(option && option.text) })) : this.translate(label)])) : null,
				changeLabels: (Array.isArray(this.content.changeLabels) ? this.content.changeLabels : []).map((rule) => ({ ...rule, label: this.translate(rule && rule.label) })),
				valueLabels: this.content.valueLabels && typeof this.content.valueLabels === 'object' ? this.content.valueLabels : null,
			}
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
				endpoint: this.endpointSource,
				needObject: this.fieldsConfig.length > 0 && !(this.object || this.ctx.object || this.ctx.objectData),
			})
		},

		/** @return {object|null} The `endpointSource` config, or null. */
		endpointSource() {
			const source = this.content.endpointSource
			return source && typeof source === 'object' && typeof source.url === 'string' && source.url !== '' ? source : null
		},

		/** @return {Array<{value: string, label: string}>} All, then the configured type chips; none without chips. */
		typeChips() {
			const chips = Array.isArray(this.content.typeChips) ? this.content.typeChips.filter((chip) => chip && chip.value) : []
			if (chips.length === 0 || !this.endpointSource) {
				return []
			}
			return [{ value: '', label: t('nextcloud-vue', 'All') }, ...chips.map((chip) => ({ value: String(chip.value), label: this.translate(chip.label || String(chip.value)) }))]
		},

		/** @return {string} The chip bar's accessible name. */
		chipsLabel() {
			return t('nextcloud-vue', 'Filter by type')
		},

		/** @return {string} The Load more label. */
		moreLabel() {
			return t('nextcloud-vue', 'Load more')
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
			if (typeof this.content?.emptyText === 'string' && this.content.emptyText !== '') {
				return this.translate(this.content.emptyText)
			}
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

		referenceKey: {
			immediate: true,
			handler() {
				this.loadReferenceLabels()
			},
		},
	},

	created() {
		subscribe(TIMELINE_CHANGED, this.onTimelineChanged)
	},

	beforeUnmount() {
		unsubscribe(TIMELINE_CHANGED, this.onTimelineChanged)
	},

	methods: {
		/**
		 * Read the label of every record a `resolve` field points at, one
		 * batched request per schema through the shared reference resolver.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/timeline-label-reads-a-reference/specs/timeline-widget/spec.md#requirement-a-label-can-name-the-record-a-reference-points-at
		 */
		async loadReferenceLabels() {
			const resolve = this.content.resolve && typeof this.content.resolve === 'object' ? this.content.resolve : {}
			const object = this.resolvedObject || {}
			const found = {}
			await Promise.all(Object.entries(resolve).map(async ([field, ref]) => {
				const id = readPath(object, field)
				if (!ref || typeof ref.schema !== 'string' || typeof id !== 'string' || id === '') {
					return
				}
				try {
					const labels = await sharedRefLabels().resolve(ref.register || this.resolvedRegister, ref.schema, [id], ref.labelField || '')
					if (labels && typeof labels[id] === 'string') {
						found[field] = labels[id]
					}
				} catch {
					// An unreadable reference keeps its id in the label.
				}
			}))
			this.referenceLabels = found
		},

		/**
		 * Read again when another part of the page changed this record's timeline.
		 *
		 * @param {object} payload `{ objectId, source }`.
		 */
		onTimelineChanged(payload) {
			if (payload && payload.source !== this.uid && String(payload.objectId) === String(this.resolvedObjectId) && !this.manage) {
				this.load()
			}
		},

		/**
		 * Write the note on the record, then read the timeline again. A note
		 * that is not saved keeps its text.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/timeline-activity-card/specs/timeline-widget/spec.md#requirement-the-read-view-can-take-a-note
		 */
		async addNote() {
			const message = this.noteText.trim()
			if (!this.composer || message === '' || this.savingNote) {
				return
			}
			this.savingNote = true
			this.noteError = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				await axios.post(generateUrl(`${this.apiBase}/objects/${this.resolvedRegister}/${this.resolvedSchema}/${this.resolvedObjectId}/notes`), { message })
				this.noteText = ''
				emit(TIMELINE_CHANGED, { objectId: this.resolvedObjectId, source: this.uid })
				await this.load()
			} catch {
				this.noteError = t('nextcloud-vue', 'That note could not be saved.')
			} finally {
				this.savingNote = false
			}
		},

		/**
		 * A feed row's moment: day and short month, with the time unless the
		 * moment is a calendar day, and the year only when it is not this year.
		 *
		 * @param {object} event The event.
		 * @return {string}
		 */
		formatFeedMoment(event) {
			const locale = (typeof getLanguage === 'function' && getLanguage()) || undefined
			const options = { day: 'numeric', month: 'short' }
			if (event.at.getFullYear() !== new Date().getFullYear()) {
				options.year = 'numeric'
			}
			if (!event.dateOnly) {
				options.hour = '2-digit'
				options.minute = '2-digit'
			}
			try {
				return new Intl.DateTimeFormat(locale, options).format(event.at)
			} catch {
				return event.at.toLocaleString(userLocale())
			}
		},

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
			if (source === 'endpoint') {
				return t('nextcloud-vue', 'activities')
			}
			return t('nextcloud-vue', 'related items')
		},

		/**
		 * The label of an audit event, from its action and who did it.
		 *
		 * The words a manifest declares (`actionLabels`, `changeLabels`) win.
		 *
		 * @param {string} action The audit action (create, update, delete).
		 * @param {string} actor Who did it.
		 * @param {object} [entry] The audit entry.
		 * @return {string}
		 */
		describeAudit(action, actor, entry) {
			const words = entry ? auditLabel(entry, this.auditWords, { actor, object: this.labelledObject }) : null
			if (words !== null) {
				return words
			}
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
				return event.at.toLocaleString(userLocale())
			}
		},

		/**
		 * Fetch every configured source. Each one fails on its own, so one
		 * unreachable source never hides the others.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/timeline-widget/specs/timeline-widget/spec.md#requirement-a-timeline-widget-shows-an-objects-dated-events-in-order
		 */
		/**
		 * The label of an endpoint item type, through `typeLabels`.
		 *
		 * @param {string} type The stored type.
		 * @return {string} The label.
		 */
		typeLabel(type) {
			const labels = this.endpointSource?.typeLabels || {}
			return Object.hasOwn(labels, type) ? this.translate(labels[type]) : type
		},

		/**
		 * Narrow the endpoint to a type ('' for all) and read from page 1.
		 *
		 * @spec openspec/changes/timeline-endpoint-source/specs/timeline-widget/spec.md#requirement-a-timeline-can-read-an-app-endpoint-with-type-chips
		 * @param {string} type The type.
		 * @return {Promise<void>}
		 */
		async chooseType(type) {
			if (this.activeType === type) {
				return
			}
			this.activeType = type
			await this.loadEndpoint(1)
		},

		/**
		 * Read one page of the endpoint; page 1 replaces, a later page appends.
		 *
		 * @spec openspec/changes/timeline-endpoint-source/specs/timeline-widget/spec.md#requirement-a-timeline-can-read-an-app-endpoint-with-type-chips
		 * @param {number} page The page.
		 * @return {Promise<void>}
		 */
		async loadEndpoint(page) {
			const source = this.endpointSource
			const id = this.resolvedObjectId
			if (!source || !id) {
				return
			}
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const params = {}
			for (const [key, value] of Object.entries(source.params || {})) {
				params[key] = value === '@objectId' ? String(id) : value
			}
			params[source.pageParam || '_page'] = page
			params[source.limitParam || '_limit'] = source.limit || 20
			if (this.activeType) {
				params[source.typesParam || 'types[]'] = this.activeType
			}
			this.loading = true
			try {
				const { data } = await axios.get(generateUrl(source.url), { params })
				const items = readPath(data || {}, source.itemsPath || 'items')
				this.endpointItems = page === 1 ? (Array.isArray(items) ? items : []) : [...this.endpointItems, ...(Array.isArray(items) ? items : [])]
				this.endpointPage = Number(readPath(data || {}, source.pagePath || 'page')) || page
				this.endpointPages = Number(readPath(data || {}, source.pagesPath || 'pages')) || 1
				this.failedSources = this.failedSources.filter((part) => part !== 'endpoint')
			} catch {
				if (page === 1) {
					this.endpointItems = []
				}
				this.failedSources = [...this.failedSources.filter((part) => part !== 'endpoint'), 'endpoint']
			} finally {
				this.loading = false
			}
		},

		async load() {
			const id = this.resolvedObjectId
			const register = this.resolvedRegister
			const schema = this.resolvedSchema
			const seq = ++this.loadSeq
			if (this.endpointSource && id && !this.manage) {
				await this.loadEndpoint(1)
			}
			if (!id || !register || !schema || this.manage) {
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
				jobs.push(axios.get(generateUrl(`${base}/audit-trails`), { params: { limit: this.content.auditLimit || 50, ...auditExclusionParams(this.content) } })
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
				this.failedSources = this.failedSources.filter((part) => part === 'endpoint')
				return
			}
			this.loading = true
			await Promise.all(jobs)
			if (seq !== this.loadSeq) {
				return
			}
			this.relatedRows = rows
			this.failedSources = [...failed, ...this.failedSources.filter((part) => part === 'endpoint')]
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

.cn-timeline-widget__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

/* Type chips are pills, as the manage view's kind chips. */
.cn-timeline-widget__chip {
	display: inline-flex;
	align-items: center;
	box-sizing: border-box;
	height: 36px;
	margin: 0;
	padding: 0 14px;
	border: 1px solid var(--color-border-dark);
	border-radius: 18px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
}

.cn-timeline-widget__chip--active {
	border: 0;
	background: var(--color-main-text);
	color: var(--color-main-background);
}

.cn-timeline-widget__chip:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-timeline-widget__composer {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.cn-timeline-widget__composer-input {
	flex: 1;
	min-width: 0;
}

.cn-timeline-widget__note-error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

/* feed: a round icon, a meta line and the text, a hairline above each row. */
.cn-timeline-widget__feed-row {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	padding: 12px 0;
	border-top: 1px solid var(--color-border);
}

.cn-timeline-widget__feed-icon {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.cn-timeline-widget__feed-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: currentColor;
}

.cn-timeline-widget__feed-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}

.cn-timeline-widget__feed-meta {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-timeline-widget__feed-text {
	font-size: 15px;
	overflow-wrap: anywhere;
}

.cn-timeline-widget__feed-detail {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
	overflow-wrap: anywhere;
}

.cn-timeline-widget__meta {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
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

.cn-timeline-widget__icon {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
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
