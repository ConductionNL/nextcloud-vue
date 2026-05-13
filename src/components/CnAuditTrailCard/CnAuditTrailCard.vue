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
	<CnDetailCard :title="resolvedTitle" :icon="History" :collapsible="collapsible">
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
			<button class="cn-audit-card__show-all" @click="emitShowAll">
				{{ showAllLabel }} ({{ entries.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import History from 'vue-material-design-icons/History.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'

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
 *
 * @event {void} show-all — User clicked the "show all" footer button.
 *   Emitted with no payload; parent components typically open the host
 *   app's full audit-trail view in response.
 */
export default {
	name: 'CnAuditTrailCard',

	components: { CnDetailCard, NcLoadingIcon },

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
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
			History,
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
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) { this.fetchEntries() } },
		},
	},

	methods: {
		/**
		 * Bubble the footer button's click up so parents can open the
		 * host app's full audit-trail view.
		 */
		emitShowAll() {
			/**
			 * User clicked the "show all" footer button — emitted with
			 * no payload. Parents typically open the host app's full
			 * audit-trail view in response.
			 *
			 * @event show-all
			 */
			this.$emit('show-all')
		},

		async fetchEntries() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			try {
				const params = new URLSearchParams({ limit: String(this.maxDisplay) })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trail?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.entries = data.results || data || []
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
