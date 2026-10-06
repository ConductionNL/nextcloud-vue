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
		<div v-else-if="entries.length === 0" class="cn-audit-card__empty">
			{{ noEntriesLabel }}
		</div>
		<ul v-else class="cn-audit-card__list">
			<li
				v-for="entry in displayedEntries"
				:key="entry.id"
				class="cn-audit-card__row">
				<div class="cn-audit-card__row-head">
					<strong class="cn-audit-card__action">{{ entry.action || entry.event || actionLabel }}</strong>
					<span class="cn-audit-card__when">{{ formatWhen(entry) }}</span>
				</div>
				<div class="cn-audit-card__row-body">
					<span class="cn-audit-card__actor">{{ formatActor(entry) }}</span>
				</div>
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
	},

	emits: ['show-all'],

	data() {
		return {
			History: markRaw(History),
			entries: [],
			loading: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Audit trail')
		},

		displayedEntries() {
			return this.entries.slice(0, this.maxDisplay)
		},

		/**
		 * The URL the card reads, or '' when it has nothing to read: the
		 * object's own trail, or the app-wide readable feed narrowed to the
		 * register and schema when set.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 * @return {string}
		 */
		fetchUrl() {
			const params = new URLSearchParams({ limit: String(this.maxDisplay) })
			if (this.scope === 'app') {
				if (this.register) {
					params.set('register', this.register)
				}
				if (this.schema) {
					params.set('schema', this.schema)
				}
				return prefixUrl(`${this.apiBase}/audit-trails/readable?${params.toString()}`)
			}
			if (!this.register || !this.schema || !this.objectId) {
				return ''
			}
			return prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trail?${params.toString()}`)
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
			try {
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const list = data.results || data.rows || data
					this.entries = Array.isArray(list) ? list : []
				} else {
					this.entries = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnAuditTrailCard] failed to fetch audit trail', err)
				this.entries = []
			} finally {
				this.loading = false
			}
		},

		formatActor(entry) {
			return entry.actorDisplayName || entry.actor || entry.userId || entry.user || ''
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
			return d.toLocaleString()
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
