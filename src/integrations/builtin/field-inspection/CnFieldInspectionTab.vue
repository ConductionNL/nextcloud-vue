<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  -
  - CnFieldInspectionTab — sidebar tab for the `field-inspection` integration
  - leaf (offline field data-collection).
  -
  - The per-object sidebar surface for the offline planning workflow: it shows
  - the sync-state indicator, a "Synchronise day" action, and the offline
  - planning list. Tapping an item routes the user into the full checklist
  - completion surface rendered by CnFieldInspectionCard. Generic by
  - construction — schema names and the planning filter come from the
  - integration's `offlineConfig`, never from app-specific code here.
-->
<template>
	<div class="cn-sidebar-tab cn-field-inspection-tab" data-testid="cn-field-inspection-tab">
		<div class="cn-field-inspection-tab__sync" :class="`cn-field-inspection-tab__sync--${indicator.tone}`" data-testid="cn-fi-tab-sync">
			<span class="cn-field-inspection-tab__dot" aria-hidden="true" />
			<span>{{ indicator.text }}</span>
		</div>

		<div class="cn-field-inspection-tab__actions">
			<NcButton variant="primary"
				data-testid="cn-fi-tab-sync-day"
				:disabled="syncing || offline"
				@click="syncDay">
				<template #icon>
					<Sync :size="18" />
				</template>
				{{ syncing ? t('nextcloud-vue', 'Synchronising…') : t('nextcloud-vue', 'Synchronise day') }}
			</NcButton>
			<NcButton v-if="pendingCount > 0 && !offline"
				data-testid="cn-fi-tab-drain"
				:disabled="syncing"
				@click="drain">
				{{ t('nextcloud-vue', 'Sync {n} pending changes', { n: pendingCount }) }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" :size="24" />

		<div v-else-if="plannedItems.length === 0" class="cn-sidebar-tab__empty cn-field-inspection-tab__empty">
			<ClipboardCheckOutline :size="32" />
			<p>{{ t('nextcloud-vue', 'No items planned') }}</p>
			<p class="cn-field-inspection-tab__hint">
				{{ t('nextcloud-vue', 'Tap “Synchronise day” while online to download your planning.') }}
			</p>
		</div>

		<ul v-else class="cn-field-inspection-tab__list" data-testid="cn-fi-tab-list">
			<li v-for="item in plannedItems" :key="itemId(item)" class="cn-field-inspection-tab__row">
				<span class="cn-field-inspection-tab__row-title">{{ itemTitle(item) }}</span>
				<span class="cn-field-inspection-tab__row-status">{{ itemStatus(item) }}</span>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import ClipboardCheckOutline from 'vue-material-design-icons/ClipboardCheckOutline.vue'
import Sync from 'vue-material-design-icons/Sync.vue'
import {
	storePlanning,
	getPlannedItems,
	getPlanningMeta,
	countPending,
	resolveDeviceId,
} from '../../offline/offlineDb.js'
import { fetchPlanning, fetchReferences } from '../../offline/planningFetch.js'
import { drainQueue } from '../../offline/syncReplayService.js'
import { syncIndicator } from '../../offline/fieldCollectionHelpers.js'
import { DEFAULT_FIELD_INSPECTION_CONFIG } from '../field-inspection.js'

/**
 * CnFieldInspectionTab — sidebar tab for the offline field data-collection leaf.
 *
 * Surfaces the offline planning list + sync state for a single object context,
 * driven by the generic offline core and the integration's `offlineConfig`.
 */
export default {
	name: 'CnFieldInspectionTab',

	components: { NcButton, NcLoadingIcon, ClipboardCheckOutline, Sync },

	props: {
		/** Stable integration id (forwarded from the registry — always `'field-inspection'`). */
		integrationId: { type: String, default: 'field-inspection' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Parent object id (sidebar context). */
		objectId: { type: String, default: '' },
		/** Optional explicit assignee uid for the planning query (default: current user). */
		assignee: { type: String, default: '' },
	},

	data() {
		return {
			plannedItems: [],
			pendingCount: 0,
			loading: true,
			syncing: false,
			offline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
			deviceId: resolveDeviceId(),
		}
	},

	computed: {
		/**
		 * Resolved offline config from the registered descriptor on the shared
		 * registry (read from the global, not a static import, to avoid a cycle).
		 *
		 * @return {object} The offline config.
		 */
		config() {
			const registry = (typeof window !== 'undefined'
				&& window.OCA && window.OCA.OpenRegister && window.OCA.OpenRegister.integrations) || null
			const entry = (registry && typeof registry.get === 'function') ? registry.get(this.integrationId) : null
			return (entry && entry.offlineConfig) || DEFAULT_FIELD_INSPECTION_CONFIG
		},

		/**
		 * Effective planned-items schema (config wins, else prop schema).
		 *
		 * @return {string} The schema id.
		 */
		effectiveSchema() {
			return this.config.plannedSchema || this.schema || ''
		},

		indicator() {
			return syncIndicator(this.pendingCount, this.offline === false)
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.loadLocal() } },
	},

	/**
	 * Wire online/offline listeners + load local state.
	 *
	 * @return {Promise<void>}
	 */
	async mounted() {
		window.addEventListener('online', this.onOnline)
		window.addEventListener('offline', this.onOffline)
		await this.loadLocal()
	},

	/**
	 * Detach the online/offline listeners.
	 *
	 * @return {void}
	 */
	beforeUnmount() {
		window.removeEventListener('online', this.onOnline)
		window.removeEventListener('offline', this.onOffline)
	},

	methods: {
		t,

		itemId(item) {
			return String(item?.id ?? item?.['@self']?.id ?? item?.uuid ?? '')
		},

		itemTitle(item) {
			return item?.[this.config.titleField] || this.itemId(item)
		},

		itemStatus(item) {
			const status = item?.status || 'planned'
			const map = {
				planned: t('nextcloud-vue', 'Planned'),
				in_progress: t('nextcloud-vue', 'In progress'),
				synced: t('nextcloud-vue', 'Synced'),
				conflict: t('nextcloud-vue', 'Conflict'),
			}
			return map[status] || status
		},

		/**
		 * Load cached planning + pending count from IndexedDB.
		 *
		 * @return {Promise<void>}
		 */
		async loadLocal() {
			if (!this.register || !this.effectiveSchema) {
				this.loading = false
				return
			}
			this.loading = true
			try {
				this.plannedItems = await getPlannedItems(this.register, this.effectiveSchema)
				await getPlanningMeta(this.register, this.effectiveSchema)
				this.pendingCount = await countPending(this.deviceId)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionTab] loadLocal failed', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Download today's planning via the OR object API and store it offline.
		 *
		 * @return {Promise<void>}
		 */
		async syncDay() {
			this.syncing = true
			try {
				const cfg = this.config
				const items = await fetchPlanning({
					register: this.register,
					schema: this.effectiveSchema,
					assigneeField: cfg.assigneeField,
					assignee: this.assignee || (typeof OC !== 'undefined' && OC.getCurrentUser ? OC.getCurrentUser().uid : ''),
					dateField: cfg.dateField,
				})
				const references = cfg.referenceSchema
					? await fetchReferences({ register: this.register, referenceSchema: cfg.referenceSchema })
					: []
				await storePlanning({
					register: this.register,
					schema: this.effectiveSchema,
					items,
					references,
					referenceSchema: cfg.referenceSchema,
				})
				await this.loadLocal()
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionTab] syncDay failed', e)
			} finally {
				this.syncing = false
			}
		},

		/**
		 * Drain the local mutation queue against the OR object API.
		 *
		 * @return {Promise<void>}
		 */
		async drain() {
			this.syncing = true
			try {
				await drainQueue(this.deviceId)
				this.pendingCount = await countPending(this.deviceId)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionTab] drain failed', e)
			} finally {
				this.syncing = false
			}
		},

		onOnline() {
			this.offline = false
			this.drain()
		},

		onOffline() {
			this.offline = true
		},
	},
}
</script>

<style scoped>
.cn-field-inspection-tab {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 8px;
}

.cn-field-inspection-tab__sync {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
}

.cn-field-inspection-tab__dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
}

.cn-field-inspection-tab__sync--success .cn-field-inspection-tab__dot { background: var(--color-success); }
.cn-field-inspection-tab__sync--warning .cn-field-inspection-tab__dot { background: var(--color-warning); }
.cn-field-inspection-tab__sync--error .cn-field-inspection-tab__dot { background: var(--color-error); }

.cn-field-inspection-tab__actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.cn-field-inspection-tab__empty {
	text-align: center;
	color: var(--color-text-maxcontrast);
	padding: 16px 0;
}

.cn-field-inspection-tab__hint {
	font-size: 0.85em;
}

.cn-field-inspection-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-field-inspection-tab__row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-field-inspection-tab__row-status {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
