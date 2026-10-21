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
		<div v-else-if="entries.length === 0" class="cn-audit-card__empty">
			{{ noEntriesLabel }}
		</div>
		<ul v-else class="cn-audit-card__list">
			<li
				v-for="entry in displayedEntries"
				:key="entry.id"
				class="cn-audit-card__row">
				<div class="cn-audit-card__row-head">
					<strong class="cn-audit-card__action">{{ formatAction(entry) }}</strong>
					<span class="cn-audit-card__when">{{ formatWhen(entry) }}</span>
				</div>
				<div class="cn-audit-card__row-body">
					<span class="cn-audit-card__actor">{{ formatActor(entry) }}</span>
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
		<template v-if="entries.length > maxDisplay" #footer>
			<button class="cn-audit-card__show-all" @click="$emit('show-all')">
				{{ showAllLabel }} ({{ entries.length }})
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
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { leafSourceUrl } from '../../utils/leafSourceUrl.js'
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

		displayedEntries() {
			const entries = this.oldestFirst ? [...this.entries].sort((a, b) => entryTime(a) - entryTime(b)) : this.entries
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
			const params = new URLSearchParams({ limit: String(this.maxDisplay) })
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
					this.entries = Array.isArray(list) ? list : []
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
		 * What happened: the action, with the state it led to when the entry
		 * names one (a flow task's `stateAfter`).
		 *
		 * @param {object} entry The entry.
		 * @return {string} The line.
		 */
		formatAction(entry) {
			const action = entry.action || entry.event || this.actionLabel
			return entry.stateAfter ? `${action} (${entry.stateAfter})` : action
		},

		/**
		 * Who did it: the actor, the kind of performer when it is not a
		 * person (a flow, the system), and on whose behalf.
		 *
		 * @param {object} entry The entry.
		 * @return {string} The line.
		 */
		formatActor(entry) {
			const actor = entry.actorDisplayName || entry.actor || entry.userId || entry.user || ''
			const parts = [actor]
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
