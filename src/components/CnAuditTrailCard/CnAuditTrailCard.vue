<!--
  CnAuditTrailCard — compact audit-trail widget for the integration
  registry.

  Surface-aware shell around the `audit-trail` integration: fetches
  the object's recent audit-trail entries (query-time storage strategy
  per AD-22) and renders them in a CnDetailCard.

  Per umbrella change `pluggable-integration-registry` AD-19 (surface
  fallback), one component handles all surfaces — `surface` is
  forwarded so the component can branch internally if desired.
-->
<template>
	<CnDetailCard
		:title="resolvedTitle"
		:icon="History"
		:collapsible="collapsible"
		:data-surface="surface">
		<NcLoadingIcon v-if="loading" />
		<p v-else-if="failed"
			class="cn-audit-card__empty"
			role="alert"
			data-testid="cn-audit-card-failed">
			{{ failedLabel }}
		</p>
		<div v-else-if="shownEntries.length === 0" class="cn-audit-card__empty">
			{{ noEntriesLabel }}
		</div>
		<!-- `dated` (PqJourney "Geschiedenis"): the short date beside what
		     happened, one line per entry. -->
		<dl v-else-if="layout === 'dated'" class="cn-audit-card__dated">
			<template v-for="entry in displayedEntries" :key="entry.id">
				<dt class="cn-audit-card__date">
					{{ shortDate(entry) }}
				</dt>
				<dd class="cn-audit-card__dated-text">
					{{ formatAction(entry) }}<span
						v-if="entry.authorized === false"
						class="cn-audit-card__refused"
						data-testid="cn-audit-card-refused">{{ refusedLabel }}</span>
				</dd>
			</template>
		</dl>
		<ul v-else class="cn-audit-card__list">
			<li
				v-for="entry in displayedEntries"
				:key="entry.id"
				class="cn-audit-card__row"
				:class="{ 'cn-audit-card__row--stacked': layout === 'stacked', 'cn-audit-card__row--compact': density === 'compact' }">
				<div class="cn-audit-card__row-head">
					<strong class="cn-audit-card__action">{{ formatAction(entry) }}</strong>
					<span v-if="layout !== 'stacked'" class="cn-audit-card__when">{{ formatWhen(entry) }}</span>
				</div>
				<div class="cn-audit-card__row-body">
					<span v-if="layout === 'stacked'" class="cn-audit-card__when" data-testid="cn-audit-card-when-below">{{ stackedLine(entry) }}</span>
					<span v-else class="cn-audit-card__actor">{{ formatActor(entry) }}</span>
					<span
						v-if="entry.authorized === false"
						class="cn-audit-card__refused"
						data-testid="cn-audit-card-refused">{{ refusedLabel }}</span>
				</div>
				<p v-if="entry.reason" class="cn-audit-card__reason">
					{{ entry.reason }}
				</p>
			</li>
		</ul>
		<p v-if="footnote" class="cn-audit-card__footnote" data-testid="cn-audit-trail-widget-footnote">
			{{ footnote }}
		</p>
		<template v-if="shownEntries.length > maxDisplay" #footer>
			<button class="cn-audit-card__show-all" @click="$emit('show-all')">
				{{ showAllLabel }} ({{ shownEntries.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { markRaw } from 'vue'
import History from 'vue-material-design-icons/History.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { auditExclusionParams, keepAuditEntries } from '../../utils/auditEntries.js'
import { actionLabelFor, changedValue, changeLabelFor, fillAuditLabel } from '../../utils/auditLabels.js'
import { formatBoardDate, formatTimeOfDay } from '../../utils/boardDate.js'
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { leafSourceUrl } from '../../utils/leafSourceUrl.js'
import { userDisplayName } from '../../utils/userDisplayName.js'
import { userLocale } from '../../utils/userLocale.js'

/**
 * @param {object} entry An audit entry.
 * @return {number} When it happened, in ms; 0 when unreadable.
 */
function entryTime(entry) {
	const time = new Date(entry.creationDateTime || entry.created || entry.timestamp || 0).getTime()
	return Number.isNaN(time) ? 0 : time
}

/**
 * CnAuditTrailCard — compact audit-trail widget rendered by the
 * integration registry on dashboard and detail surfaces.
 *
 * Basic usage
 * ```vue
 * <CnAuditTrailCard
 *   :register="registerId"
 *   :schema="schemaId"
 *   :object-id="objectId"
 *   surface="detail-page" />
 * ```
 */
export default {
	name: 'CnAuditTrailCard',

	components: { CnDetailCard, NcLoadingIcon },

	props: {
		/**
		 * A muted line under the trail, inside the card ("Kenmerk ZT-OMV-REG").
		 *
		 * @spec openspec/changes/audit-trail-footnote/specs/audit-trail/spec.md#requirement-a-history-card-can-end-in-a-line-about-the-record
		 */
		footnote: { type: String, default: '' },
		/** OpenRegister register id (slug or uuid). Optional for `scope: "app"`. */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). Optional for `scope: "app"`. */
		schema: { type: String, default: '' },
		/** Parent object id. Required for `scope: "object"` (the default); unused for `scope: "app"`. */
		objectId: { type: String, default: '' },
		/**
		 * What the card lists. `object` (the default) is one object's trail
		 * and needs `register`, `schema` and `objectId`. `app` is the
		 * app-wide feed: the entries of every object the caller may read
		 * (OpenRegister's `/audit-trails/readable`), narrowed to `register`
		 * and `schema` when those are set.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 */
		scope: {
			type: String,
			default: 'object',
			validator: (value) => ['object', 'app'].includes(value),
		},

		/** Rendering surface — passed for AD-19 surface fallback consumers. */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity'].includes(value),
		},

		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },

		/**
		 * Read the trail of something that is not an OpenRegister object:
		 * `{ kind: 'flow-task', id }` reads `${apiBase}/flow-tasks/{id}/audit`,
		 * oldest first. `id` may be left out or written `@objectId`.
		 *
		 * @type {{kind: string, id?: (string|number)}|null}
		 */
		source: { type: Object, default: null },

		/** A trail URL that replaces the object's own; `{id}` is filled with the source's id or `objectId`. */
		endpoint: { type: String, default: '' },

		/** `newest` first (the object trail's order) or `oldest` first; empty takes `oldest` for a source and `newest` otherwise. */
		order: {
			type: String,
			default: '',
			validator: (value) => ['', 'newest', 'oldest'].includes(value),
		},

		/** Maximum rows to render. */
		maxDisplay: { type: Number, default: 5 },
		/**
		 * `stacked` (DqTaak "Historie"): the action, then one muted line under
		 * it with the moment ("6 okt 09:05") and who, when the action does not
		 * already name them. Default: the moment beside the action, who under it.
		 * `dated` (PqJourney "Geschiedenis"): a two-column list, the short date
		 * ("2 okt") beside what happened; who shows only where the action's
		 * label names them (`{actor}`).
		 */
		layout: { type: String, default: '' },
		/**
		 * `compact` draws the rows closer together: in the board look a
		 * stacked row 10px above and below (DqZaaktype "Historie") instead of
		 * 12px (DqTaak). Default: the layout's own spacing.
		 *
		 * @spec openspec/changes/audit-card-compact-stacked-rows/specs/audit-trail/spec.md#requirement-a-stacked-audit-card-can-draw-compact-rows
		 */
		density: { type: String, default: '' },
		/**
		 * Actions the card leaves out (case-insensitive), such as `['read']`
		 * for a history of what changed. It then reads more entries than it
		 * shows, so the rows it leaves out do not crowd the rest away.
		 *
		 * @spec openspec/changes/audit-trail-exclude-actions/specs/audit-trail/spec.md#requirement-a-history-card-can-leave-out-events-by-action
		 */
		excludeActions: { type: Array, default: () => [] },
		/**
		 * Actors the card leaves out by user id (case-insensitive), such as
		 * `['System']` for a history of what people did: the bookkeeping a
		 * background job writes is not shown.
		 *
		 * @spec openspec/changes/audit-card-exclude-actors/specs/audit-trail/spec.md#requirement-a-history-card-can-leave-out-entries-by-actor
		 */
		excludeActors: { type: Array, default: () => [] },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty label. */
		noEntriesLabel: { type: String, default: () => t('nextcloud-vue', 'No audit entries yet') },
		/** Pre-translated overflow label. */
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
		/** Pre-translated fallback action label. */
		actionLabel: { type: String, default: () => t('nextcloud-vue', 'Change') },
		/** Shown on an entry the server refused (`authorized: false`). */
		refusedLabel: { type: String, default: () => t('nextcloud-vue', '(refused)') },
		/**
		 * What happened, in words, by action (`claim`) or by action and the
		 * state it led to (`complete:completed`, tried first). `{actor}`,
		 * `{state}` and `{changed.<key>}` (a value the entry recorded, a dotted key
		 * reading into it such as `{changed.data.fileName}`, in the
		 * words of `valueLabels`) are filled in; a label that names the actor leaves it off
		 * the line under it. An action without a label shows as written.
		 *
		 * @type {Object<string, string>|null}
		 */
		actionLabels: { type: Object, default: null },
		/**
		 * Words for the values an action label quotes as `{changed.<key>}`:
		 * `{ purpose: { handling: 'Handling' } }`. A value without an entry
		 * shows as written.
		 *
		 * @type {{[key: string]: {[value: string]: string}}|null}
		 */
		valueLabels: { type: Object, default: null },
		/**
		 * What happened, in words, by the field an entry changed: rules
		 * `[{ action?, field, to?, label }]`, the first whose `field` the entry
		 * changed (to `to`, when given) wins over `actionLabels`. A label fills
		 * the same tokens, plus `{object.<path>}` from `object`
		 * ("Version {object.version} published" for `isDraft` set to false).
		 *
		 * @type {Array<{action?: string, field: string, to?: unknown, label: string}>}
		 */
		changeLabels: { type: Array, default: () => [] },
		/** The audited record, for `{object.<path>}` in a label; null without one. */
		object: { type: Object, default: null },
		/**
		 * Records beside the object whose events belong in its history:
		 * `[{ as, register, schema, filter, limit? }]`. The card lists the
		 * objects matching `filter` (`@objectId` is this object; at most
		 * `limit`, default 5), reads their trails and merges the entries with
		 * the object's own, newest first. A related entry is labelled by
		 * `actionLabels["<as>.<action>"]` first. Object scope only.
		 *
		 * @type {Array<{as: string, register: string, schema: string, filter?: object, limit?: number}>}
		 * @spec openspec/changes/audit-trail-related-sources/specs/audit-trail/spec.md#requirement-an-objects-history-can-include-the-events-of-records-beside-it
		 */
		relatedSources: { type: Array, default: () => [] },
		/** Shown when a `source` or `endpoint` read failed. */
		failedLabel: { type: String, default: () => t('nextcloud-vue', 'The history could not be loaded') },
	},

	emits: ['show-all'],

	data() {
		return {
			History: markRaw(History),
			entries: [],
			loading: false,
			/** A `source` or `endpoint` read failed: said, rather than shown as an empty trail. */
			failed: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Audit trail')
		},

		/**
		 * The entries without the excluded actions and actors, and without an
		 * update that changed nothing: a re-save whose `changed` holds no field
		 * whose old and new value differ (only `@self` bookkeeping) is not
		 * something that happened to the record.
		 *
		 * @return {Array<object>}
		 */
		shownEntries() {
			return keepAuditEntries(this.entries, { excludeActions: this.excludeActions, excludeActors: this.excludeActors })
		},

		/** @return {boolean} Whether the card leaves entries out, and so reads more than it shows. */
		filtersEntries() {
			return this.excludeActions.length > 0 || this.excludeActors.length > 0
		},

		displayedEntries() {
			const entries = this.oldestFirst ? [...this.shownEntries].sort((a, b) => entryTime(a) - entryTime(b)) : this.shownEntries
			return entries.slice(0, this.maxDisplay)
		},

		/**
		 * The trail URL a `source` or `endpoint` names, '' while its record id
		 * is unknown, or null when the card reads an object.
		 *
		 * @return {string|null}
		 * @spec openspec/changes/leaf-cards-read-a-source/specs/leaf-cards-read-a-source/spec.md#requirement-a-leaf-card-reads-a-source-or-an-endpoint
		 */
		sourceUrl() {
			return leafSourceUrl({ source: this.source, endpoint: this.endpoint, apiBase: this.apiBase, objectId: this.objectId }, 'audit')
		},

		/** @return {boolean} Whether the entries read oldest first. */
		oldestFirst() {
			return this.order === 'oldest' || (this.order === '' && this.sourceUrl !== null)
		},

		/**
		 * The path the card reads (prefixed at fetch time), or '' when it has nothing to read: the
		 * object's own trail, or the app-wide readable feed narrowed to the
		 * register and schema when set.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 * @return {string}
		 */
		fetchUrl() {
			if (this.sourceUrl !== null) {
				return this.sourceUrl
			}
			const limit = this.filtersEntries ? Math.min(100, this.maxDisplay * 10) : this.maxDisplay
			const params = new URLSearchParams({ limit: String(limit) })
			if (this.scope === 'app') {
				if (this.register) {
					params.set('register', this.register)
				}
				if (this.schema) {
					params.set('schema', this.schema)
				}
				return `${this.apiBase}/audit-trails/readable?${params.toString()}`
			}
			if (!this.register || !this.schema || !this.objectId) {
				return ''
			}
			this.addExclusions(params)
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trails?${params.toString()}`
		},
	},

	watch: {
		fetchUrl: {
			immediate: true,
			handler(url) {
				if (url) {
					this.fetchEntries()
				}
			},
		},
	},

	methods: {
		/**
		 * Ask an object trail to leave out the excluded actions and actors in
		 * the query (`action[notIn]`, `user[notIn]`), so its pages hold what the
		 * card shows. `keepAuditEntries` still filters what comes back.
		 *
		 * @param {URLSearchParams} params The trail query, changed in place.
		 * @return {void}
		 * @spec openspec/changes/audit-card-exclusions-in-the-query/specs/audit-trail/spec.md#requirement-a-history-card-asks-the-trail-to-leave-out-what-it-hides
		 */
		addExclusions(params) {
			for (const [key, value] of Object.entries(auditExclusionParams({ excludeActions: this.excludeActions, excludeActors: this.excludeActors }))) {
				params.set(key, value)
			}
		},

		/**
		 * Read the entries from `fetchUrl`. The readable feed answers
		 * `{ rows, nextCursor }`, the object trail `{ results }`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 * @return {Promise<void>}
		 */
		async fetchEntries() {
			const url = this.fetchUrl
			if (!url) {
				return
			}
			this.loading = true
			this.failed = false
			try {
				const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const list = data.results || data.rows || data
					const own = await this.withFollowingPages(url, Array.isArray(list) ? list : [])
					const related = await this.fetchRelatedEntries()
					this.entries = related.length > 0
						? [...own, ...related].sort((a, b) => entryTime(b) - entryTime(a))
						: own
				} else {
					this.entries = []
					this.failed = this.sourceUrl !== null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAuditTrailCard] failed to fetch audit trail', err)
				this.entries = []
				this.failed = this.sourceUrl !== null
			} finally {
				this.loading = false
			}
		},

		/**
		 * An object's trail read on until it holds enough entries to show. The
		 * card leaves entries out (reads, actors, empty re-saves) after
		 * reading, and every page view writes a read, so the newest page alone
		 * can be all reads (DqHandhaving Historie: "no changes yet"). Reads at
		 * most four more pages.
		 *
		 * @param {string} url The first page's path.
		 * @param {Array<object>} first The first page's entries.
		 * @return {Promise<Array<object>>} The entries read.
		 */
		async withFollowingPages(url, first) {
			const entries = [...first]
			if (!this.filtersEntries || this.scope !== 'object' || this.sourceUrl !== null) {
				return entries
			}
			const limit = Number(new URLSearchParams(url.split('?')[1] || '').get('limit')) || first.length
			let page = first
			for (let more = 0; more < 4 && page.length >= limit && limit > 0; more++) {
				this.entries = [...entries]
				if (this.shownEntries.length >= this.maxDisplay) {
					break
				}
				const next = new URL(url, 'http://x')
				next.searchParams.set('offset', String(entries.length))
				const response = await fetch(prefixUrl(next.pathname + next.search), { headers: buildHeaders() })
				if (!response.ok) {
					break
				}
				const data = await response.json()
				const list = data.results || data.rows || data
				page = Array.isArray(list) ? list : []
				entries.push(...page)
			}
			return [...entries]
		},

		/**
		 * The entries of the records beside the object (`relatedSources`),
		 * each tagged with its source's `as`. A read that fails leaves that
		 * source out.
		 *
		 * @return {Promise<Array<object>>} The entries.
		 * @spec openspec/changes/audit-trail-related-sources/specs/audit-trail/spec.md#requirement-an-objects-history-can-include-the-events-of-records-beside-it
		 */
		async fetchRelatedEntries() {
			if (this.scope !== 'object' || this.sourceUrl !== null || !this.objectId || !Array.isArray(this.relatedSources)) {
				return []
			}
			const limit = this.filtersEntries ? Math.min(100, this.maxDisplay * 10) : this.maxDisplay
			const read = async (url) => {
				const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
				if (!response.ok) {
					throw new Error(String(response.status))
				}
				const data = await response.json()
				const list = data.results || data.rows || data
				return Array.isArray(list) ? list : []
			}
			const perSource = await Promise.all(this.relatedSources
				.filter((source) => source && source.register && source.schema)
				.map(async (source) => {
					try {
						const params = new URLSearchParams({ _limit: String(Number(source.limit) > 0 ? Number(source.limit) : 5), _order: JSON.stringify({ '@self.created': 'DESC' }) })
						for (const [key, value] of Object.entries(source.filter || {})) {
							params.set(key, value === '@objectId' ? this.objectId : String(value))
						}
						const objects = await read(`${this.apiBase}/objects/${source.register}/${source.schema}?${params.toString()}`)
						const ids = objects.map((object) => object?.id || object?.['@self']?.id || object?.uuid).filter(Boolean)
						const trailParams = new URLSearchParams({ limit: String(limit) })
						this.addExclusions(trailParams)
						const trails = await Promise.all(ids.map((id) => read(`${this.apiBase}/objects/${source.register}/${source.schema}/${id}/audit-trails?${trailParams.toString()}`).catch(() => [])))
						return trails.flat().map((entry) => ({ ...entry, relatedAs: source.as || source.schema }))
					} catch {
						return []
					}
				}))
			return perSource.flat()
		},

		/**
		 * What happened: the action, with the state it led to when the entry
		 * names one (a flow task's `stateAfter`).
		 *
		 * @param {object} entry The entry.
		 * @return {string} The line.
		 */
		formatAction(entry) {
			const label = this.changeLabelFor(entry) ?? this.labelFor(entry)
			if (label !== null) {
				return fillAuditLabel(label, entry, { actor: this.actorName(entry), object: this.object, valueLabels: this.valueLabels })
			}
			const action = entry.action || entry.event || this.actionLabel
			return entry.stateAfter ? `${action} (${entry.stateAfter})` : action
		},

		/**
		 * A value the entry recorded under `changed` (an audit entry's context),
		 * in the words of `valueLabels`; '' when it recorded none.
		 *
		 * @param {object} entry The entry.
		 * @param {string} key The recorded key.
		 * @return {string} The value in words.
		 * @spec openspec/changes/audit-label-changed-values/specs/audit-trail/spec.md#requirement-a-trail-label-can-quote-what-the-entry-recorded
		 */
		changedValue(entry, key) {
			return changedValue(entry, key, this.valueLabels)
		},

		/**
		 * The `changeLabels` rule an entry matches: the first whose field the
		 * entry changed, for its action and to its value when the rule names them.
		 *
		 * @param {object} entry The entry.
		 * @return {string|null} The label, or null when no rule matches.
		 */
		changeLabelFor(entry) {
			return changeLabelFor(entry, this.changeLabels)
		},

		/**
		 * The `actionLabels` entry for an entry: by action and state first,
		 * then by action.
		 *
		 * @param {object} entry The entry.
		 * @return {string|null} The label, or null when none is declared.
		 * @spec openspec/changes/audit-trail-action-labels/specs/audit-trail/spec.md#requirement-a-trail-can-say-what-happened-in-words
		 */
		labelFor(entry) {
			return actionLabelFor(entry, this.actionLabels, this.object)
		},

		/**
		 * @param {object} entry The entry.
		 * @return {string} Who did it, by name where the entry carries one.
		 */
		actorName(entry) {
			if (entry.actorDisplayName) {
				return entry.actorDisplayName
			}
			const id = entry.actor || entry.userId || entry.user || ''
			// A person's user id reads as their display name once it is known.
			return (id && (!entry.performerType || entry.performerType === 'user') && userDisplayName(String(id))) || id
		},

		/**
		 * The date of a dated list's entry in the board's short form ("2 okt").
		 *
		 * @param {object} entry The entry.
		 * @return {string} The date, or '' without one.
		 * @spec openspec/changes/audit-card-dated-layout/specs/audit-trail/spec.md#requirement-an-audit-list-can-put-the-date-beside-what-happened
		 */
		shortDate(entry) {
			return formatBoardDate(entry.creationDateTime || entry.created || entry.timestamp)
		},

		/**
		 * The muted line of a stacked row: the moment in the board's short
		 * form ("6 okt 09:05") and who, unless the action names them already.
		 *
		 * @param {object} entry The entry.
		 * @return {string} The line.
		 * @spec openspec/changes/audit-card-stacked-rows/specs/audit-trail/spec.md#requirement-an-audit-row-can-put-its-moment-under-the-action
		 */
		stackedLine(entry) {
			const raw = entry.creationDateTime || entry.created || entry.timestamp
			const date = raw ? new Date(raw) : null
			const when = date && !Number.isNaN(date.getTime()) ? `${formatBoardDate(date)} ${formatTimeOfDay(date)}` : ''
			return [when, this.formatActor(entry)].filter((part) => part !== '').join(' · ')
		},

		/**
		 * Who did it: the actor, the kind of performer when it is not a
		 * person (a flow, the system), and on whose behalf.
		 *
		 * @param {object} entry The entry.
		 * @return {string} The line.
		 */
		formatActor(entry) {
			const named = (this.labelFor(entry) || '').includes('{actor}')
			const parts = [named ? '' : this.actorName(entry)]
			if (entry.performerType && entry.performerType !== 'user') {
				parts.push(`(${entry.performerType})`)
			}
			if (entry.onBehalfOf) {
				parts.push(t('nextcloud-vue', 'on behalf of {name}', { name: entry.onBehalfOf }))
			}
			return parts.filter((part) => part !== '').join(' ')
		},

		formatWhen(entry) {
			const raw = entry.creationDateTime || entry.created || entry.timestamp
			if (raw === undefined || raw === null) {
				return ''
			}
			const d = new Date(raw)
			if (Number.isNaN(d.getTime()) === true) {
				return String(raw)
			}
			return d.toLocaleString(userLocale())
		},
	},
}
</script>

<style scoped>
.cn-audit-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

/* Nextcloud core pads and aligns `dt` / `dd`; the list resets both. */
.cn-audit-card__dated {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	gap: 8px 16px;
	margin: 0;
	padding: 0;
	font-size: 14px;
}

.cn-audit-card__dated .cn-audit-card__date {
	width: auto;
	margin: 0;
	padding: 0;
	text-align: start;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-audit-card__dated .cn-audit-card__dated-text {
	margin: 0;
	padding: 0;
	text-align: start;
	overflow-wrap: anywhere;
}

.cn-audit-card__row {
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-audit-card__row:last-child {
	border-bottom: none;
}

.cn-audit-card__row-head {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.cn-audit-card__action {
	color: var(--color-main-text);
}

.cn-audit-card__when {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	white-space: nowrap;
}

.cn-audit-card__row-body {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-audit-card__refused {
	margin-inline-start: 6px;
	font-weight: 700;
	color: var(--color-error-text, var(--color-main-text));
}

.cn-audit-card__reason {
	margin: 2px 0 0;
	font-size: 0.9em;
	overflow-wrap: anywhere;
}

.cn-audit-card__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}

.cn-audit-card__footnote {
	margin: 12px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-audit-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	padding: 4px 0;
	font: inherit;
}

.cn-audit-card__show-all:hover {
	text-decoration: underline;
}
</style>
