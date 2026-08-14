<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  -
  - CnFieldInspectionCard — surface-aware widget for the `field-inspection`
  - integration leaf (offline field data-collection).
  -
  - Drives the generic offline core (src/integrations/offline): a
  - "Synchronise day" action fetches today's planned items via the standard OR
  - object API (planningFetch) into the IndexedDB cache, the planning list lets
  - the user open and complete a checklist offline, and saved answers are queued
  - as OR object mutations that replay on reconnect. The sync-state indicator
  - (online / all-synced / queued / conflict) reflects the pending queue.
  -
  - Generic by construction: the checklist items, the planned-items query and
  - the schema names all come from the integration's `offlineConfig` (resolved
  - from the registry by id) — never from app-specific code in this widget.
-->
<template>
	<CnDetailCard :title="cardTitle" :icon="cardIcon" :collapsible="collapsible">
		<div class="cn-field-inspection" data-testid="cn-field-inspection-card">
			<div class="cn-field-inspection__sync" :class="`cn-field-inspection__sync--${indicator.tone}`" data-testid="cn-fi-sync-indicator">
				<span class="cn-field-inspection__dot" aria-hidden="true" />
				<span>{{ indicator.text }}</span>
			</div>

			<div class="cn-field-inspection__actions">
				<NcButton variant="primary"
					data-testid="cn-fi-sync-day"
					:disabled="syncing || offline"
					@click="syncDay">
					{{ syncing ? t('nextcloud-vue', 'Synchronising…') : t('nextcloud-vue', 'Synchronise day') }}
				</NcButton>
				<NcButton v-if="pendingCount > 0 && !offline"
					data-testid="cn-fi-drain-queue"
					:disabled="syncing"
					@click="drain">
					{{ t('nextcloud-vue', 'Sync {n} pending changes', { n: pendingCount }) }}
				</NcButton>
				<span v-if="planningMeta" class="cn-field-inspection__meta" data-testid="cn-fi-planning-meta">
					{{ t('nextcloud-vue', 'Ready offline until {time}', { time: formatTime(planningMeta.expiresAt) }) }}
				</span>
			</div>

			<NcLoadingIcon v-if="loading" :size="24" />

			<NcEmptyContent v-else-if="!activeItem && plannedItems.length === 0"
				data-testid="cn-fi-empty"
				:name="t('nextcloud-vue', 'No items planned')"
				:description="t('nextcloud-vue', 'Tap “Synchronise day” while online to download your planning.')" />

			<!-- Planning list -->
			<ul v-else-if="!activeItem" class="cn-field-inspection__list" data-testid="cn-fi-list">
				<li v-for="item in plannedItems" :key="itemId(item)" class="cn-field-inspection__row">
					<button type="button"
						class="cn-field-inspection__row-btn"
						:data-testid="`cn-fi-open-${itemId(item)}`"
						@click="openItem(item)">
						<span class="cn-field-inspection__row-title">{{ itemTitle(item) }}</span>
						<span class="cn-field-inspection__row-status">{{ itemStatus(item) }}</span>
					</button>
				</li>
			</ul>

			<!-- Checklist completion for one item -->
			<div v-else class="cn-field-inspection__checklist" data-testid="cn-fi-checklist">
				<div class="cn-field-inspection__checklist-head">
					<NcButton variant="tertiary" data-testid="cn-fi-back" @click="closeItem">
						{{ t('nextcloud-vue', 'Back') }}
					</NcButton>
					<strong>{{ itemTitle(activeItem) }}</strong>
				</div>

				<p v-if="activeTemplate" class="cn-field-inspection__progress" data-testid="cn-fi-progress">
					{{ t('nextcloud-vue', '{done} of {total} questions completed', { done: progress.done, total: progress.total }) }}
				</p>

				<form v-if="activeTemplate" @submit.prevent="saveChecklist">
					<fieldset v-for="q in activeTemplate.items" :key="q.questionId" class="cn-field-inspection__question">
						<legend>
							{{ q.text }}<span v-if="q.required" class="cn-field-inspection__required" aria-hidden="true"> *</span>
						</legend>
						<select v-if="q.type === 'yes_no'"
							v-model="answers[q.questionId].answer"
							:data-testid="`cn-fi-answer-${q.questionId}`"
							class="cn-field-inspection__input">
							<option value="">
								{{ t('nextcloud-vue', '— choose —') }}
							</option>
							<option value="yes">
								{{ t('nextcloud-vue', 'Yes') }}
							</option>
							<option value="no">
								{{ t('nextcloud-vue', 'No') }}
							</option>
							<option value="na">
								{{ t('nextcloud-vue', 'N/A') }}
							</option>
						</select>
						<textarea v-else
							v-model="answers[q.questionId].answer"
							:data-testid="`cn-fi-answer-${q.questionId}`"
							class="cn-field-inspection__input"
							rows="2" />
						<span v-if="errorFor(q.questionId)" class="cn-field-inspection__error" :data-testid="`cn-fi-error-${q.questionId}`">
							{{ errorFor(q.questionId) }}
						</span>
					</fieldset>

					<!-- `type="submit"` (native HTML type) + `variant="primary"` (style) —
					     @nextcloud/vue 9 split what Vue-2-era code conflated: `type` is now
					     the native button type (`ButtonType`), and the old style-variant
					     prop is `variant`. This line used to pass BOTH wrong: `native-type`
					     (not a real prop — the button silently defaulted to `type="button"`
					     and never fired the form's native submit) and `variant="primary"`
					     (an invalid `ButtonType`, so the visual primary style never applied
					     either). See CnFormPage.vue's inline comment for the submit-button
					     half of this bug in detail. -->
					<NcButton type="submit"
						variant="primary"
						data-testid="cn-fi-save"
						:disabled="saving">
						{{ t('nextcloud-vue', 'Save answers offline') }}
					</NcButton>
				</form>

				<NcEmptyContent v-else
					data-testid="cn-fi-no-template"
					:name="t('nextcloud-vue', 'Checklist not available offline')"
					:description="t('nextcloud-vue', 'Synchronise the day while online to download this checklist.')" />
			</div>
		</div>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcEmptyContent } from '@nextcloud/vue'
import ClipboardCheckOutline from 'vue-material-design-icons/ClipboardCheckOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import {
	storePlanning,
	getPlannedItems,
	getCachedObject,
	getPlanningMeta,
	enqueueMutation,
	countPending,
	resolveDeviceId,
} from '../../offline/offlineDb.js'
import { fetchPlanning, fetchReferences } from '../../offline/planningFetch.js'
import { drainQueue } from '../../offline/syncReplayService.js'
import { syncIndicator, validateChecklistAnswers, checklistProgress, classifyGps } from '../../offline/fieldCollectionHelpers.js'
import { DEFAULT_FIELD_INSPECTION_CONFIG } from '../field-inspection.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnFieldInspectionCard — surface-aware offline field data-collection widget.
 *
 * Renders the offline planning list and inline checklist completion across the
 * dashboard / detail surfaces, driven entirely by the generic offline core and
 * the integration's `offlineConfig`.
 */
export default {
	name: 'CnFieldInspectionCard',

	components: { CnDetailCard, NcButton, NcLoadingIcon, NcEmptyContent },

	props: {
		/** Stable integration id (forwarded from the registry — always `'field-inspection'`). */
		integrationId: { type: String, default: 'field-inspection' },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Object context `{ register, schema, objectId }` forwarded by the host page. */
		integrationContext: {
			type: Object,
			default: () => ({}),
		},
		/** OpenRegister register id (slug or uuid) — falls back to integrationContext. */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid) — falls back to integrationContext. */
		schema: { type: String, default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Field inspections') },
		/** Optional Material Design Icon component for the card header. */
		icon: { type: [Object, Function], default: () => ClipboardCheckOutline },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: false },
		/** Optional explicit assignee uid for the planning query (default: current user). */
		assignee: { type: String, default: '' },
	},

	data() {
		return {
			plannedItems: [],
			planningMeta: null,
			pendingCount: 0,
			loading: true,
			syncing: false,
			saving: false,
			offline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
			deviceId: resolveDeviceId(),
			activeItem: null,
			activeTemplate: null,
			answers: {},
			errors: [],
		}
	},

	computed: {
		cardTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		/**
		 * Resolved offline config from the registered descriptor on the shared
		 * registry, falling back to the canonical defaults. A consuming app's
		 * override supplies its own schema names / filter fields here. Read from
		 * the global registry (not a static import) to avoid an import cycle.
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
		 * Effective register (prop wins, else integrationContext).
		 *
		 * @return {string} The register id.
		 */
		effectiveRegister() {
			return this.register || this.integrationContext.register || ''
		},

		/**
		 * Effective planned-items schema (config wins, else context/prop schema).
		 *
		 * @return {string} The schema id.
		 */
		effectiveSchema() {
			return this.config.plannedSchema || this.schema || this.integrationContext.schema || ''
		},

		indicator() {
			return syncIndicator(this.pendingCount, this.offline === false)
		},

		progress() {
			return checklistProgress(this.activeTemplate, this.answers)
		},
	},

	watch: {
		integrationContext: { immediate: true, handler() { this.loadLocal() } },
	},

	/**
	 * Wire online/offline listeners (auto-drain on reconnect) + load local state.
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

		formatTime(iso) {
			if (!iso) {
				return ''
			}
			return new Date(iso).toLocaleString()
		},

		errorFor(questionId) {
			const e = this.errors.find((x) => x.questionId === questionId)
			return e ? e.message : ''
		},

		/**
		 * Load cached planning + pending count from IndexedDB.
		 *
		 * @return {Promise<void>}
		 */
		async loadLocal() {
			if (!this.effectiveRegister || !this.effectiveSchema) {
				this.loading = false
				return
			}
			this.loading = true
			try {
				this.plannedItems = await getPlannedItems(this.effectiveRegister, this.effectiveSchema)
				this.planningMeta = await getPlanningMeta(this.effectiveRegister, this.effectiveSchema)
				this.pendingCount = await countPending(this.deviceId)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionCard] loadLocal failed', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Download today's planning (planned items + referenced templates) via
		 * the standard OR object API and store it offline.
		 *
		 * @return {Promise<void>}
		 */
		async syncDay() {
			this.syncing = true
			try {
				const cfg = this.config
				const items = await fetchPlanning({
					register: this.effectiveRegister,
					schema: this.effectiveSchema,
					assigneeField: cfg.assigneeField,
					assignee: this.assignee || (typeof OC !== 'undefined' && OC.getCurrentUser ? OC.getCurrentUser().uid : ''),
					dateField: cfg.dateField,
				})
				const references = cfg.referenceSchema
					? await fetchReferences({ register: this.effectiveRegister, referenceSchema: cfg.referenceSchema })
					: []
				await storePlanning({
					register: this.effectiveRegister,
					schema: this.effectiveSchema,
					items,
					references,
					referenceSchema: cfg.referenceSchema,
				})
				await this.loadLocal()
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionCard] syncDay failed', e)
			} finally {
				this.syncing = false
			}
		},

		/**
		 * Open one planned item and load its checklist template from cache.
		 *
		 * @param {object} item The planned item.
		 *
		 * @return {Promise<void>}
		 */
		async openItem(item) {
			this.activeItem = item
			this.errors = []
			const cfg = this.config
			const templateRef = item?.[cfg.templateRefField]
			this.activeTemplate = templateRef
				? await getCachedObject(this.effectiveRegister, cfg.referenceSchema, 'references', String(templateRef))
				: null
			const initial = {}
			for (const q of (this.activeTemplate?.items || [])) {
				initial[q.questionId] = { answer: '', evidenceRefs: [] }
			}
			this.answers = initial
		},

		closeItem() {
			this.activeItem = null
			this.activeTemplate = null
			this.answers = {}
			this.errors = []
		},

		/**
		 * Capture the current GPS fix (tagged on every answer).
		 *
		 * @return {Promise<object|null>} The GPS reading or null.
		 */
		async captureGps() {
			if (typeof navigator === 'undefined' || !navigator.geolocation) {
				return null
			}
			return await new Promise((resolve) => {
				navigator.geolocation.getCurrentPosition(
					(pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
					() => resolve(null),
					{ timeout: 8000 },
				)
			})
		},

		/**
		 * Validate answers, then queue a `create` mutation for the result.
		 *
		 * @return {Promise<void>}
		 */
		async saveChecklist() {
			const result = validateChecklistAnswers(this.activeTemplate, this.answers)
			this.errors = result.errors
			if (result.valid === false) {
				return
			}
			this.saving = true
			try {
				const cfg = this.config
				const gps = await this.captureGps()
				const gpsClass = classifyGps(gps)
				const now = new Date().toISOString()
				const items = this.activeTemplate.items.map((q) => ({
					questionId: q.questionId,
					answer: this.answers[q.questionId].answer,
					evidenceRefs: this.answers[q.questionId].evidenceRefs,
					answeredAt: now,
					gpsAtAnswer: gps ? { ...gps, source: gpsClass.source } : { source: 'sensorless' },
				}))
				const payload = {
					inspectionRef: this.itemId(this.activeItem),
					checklistTemplateRef: this.activeTemplate.id ?? this.activeTemplate['@self']?.id,
					items,
				}
				await enqueueMutation({
					deviceId: this.deviceId,
					operationType: 'create',
					register: this.effectiveRegister,
					schema: cfg.resultSchema,
					payload,
				})
				this.pendingCount = await countPending(this.deviceId)
				this.closeItem()
				if (this.offline === false) {
					await this.drain()
				}
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[CnFieldInspectionCard] saveChecklist failed', e)
			} finally {
				this.saving = false
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
				console.error('[CnFieldInspectionCard] drain failed', e)
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
.cn-field-inspection {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-field-inspection__sync {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
}

.cn-field-inspection__dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
}

.cn-field-inspection__sync--success .cn-field-inspection__dot { background: var(--color-success); }
.cn-field-inspection__sync--warning .cn-field-inspection__dot { background: var(--color-warning); }
.cn-field-inspection__sync--error .cn-field-inspection__dot { background: var(--color-error); }

.cn-field-inspection__actions {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
}

.cn-field-inspection__meta {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-field-inspection__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-field-inspection__row-btn {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 12px 14px;
	min-height: 44px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-field-inspection__row-btn:hover {
	background: var(--color-background-hover);
}

.cn-field-inspection__row-status {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-field-inspection__checklist-head {
	display: flex;
	align-items: center;
	gap: 12px;
}

.cn-field-inspection__progress {
	color: var(--color-text-maxcontrast);
}

.cn-field-inspection__question {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 12px;
	margin-bottom: 12px;
}

.cn-field-inspection__input {
	width: 100%;
	min-height: 44px;
	margin-top: 6px;
}

.cn-field-inspection__required { color: var(--color-error); }

.cn-field-inspection__error {
	color: var(--color-error);
	font-size: 0.85em;
	display: block;
	margin-top: 4px;
}
</style>
