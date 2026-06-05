<!--
  CnOpenprojectCard — bespoke surface-aware widget for the
  `openproject` integration.

  Replaces the generic CnIntegrationCard for the `openproject` leaf.
  Branches on `surface` per AD-19:
    - user-dashboard / app-dashboard : headline "N open work packages",
        status distribution (New / In progress / Closed / …), the most
        recent linked WP, plus the auth-status badge.
    - detail-page                    : full row list with status pill,
        type badge and assignee — same shape as the tab but read-only
        and bounded.
    - single-entity                  : chip with subject + status pill
        (referenceType: 'openproject').

  Pulls rows from the same OR pluggable-integration sub-resource as
  CnOpenprojectTab; for `single-entity` the optional `value` prop
  addresses a single work package by id (matching CnIntegrationCard's
  fetchSingle contract).

  As an external integration the widget also surfaces the
  OpenConnector auth status alongside the data (configured / missing /
  expired); ADR-019 mandates the auth state never silently degrades to
  an empty list.

  See `openregister/openspec/changes/integration-openproject/` for the
  spec delta, ADR-019 (registry mechanism), AD-19 (surface fallback).
-->
<template>
	<CnDetailCard :title="cardHeaderTitle" :icon="cardIcon" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />

		<!-- single-entity surface: chip -->
		<template v-else-if="surface === 'single-entity'">
			<span v-if="entity" class="cn-openproject-card__chip" :title="chipSubtitle(entity)">
				<Briefcase :size="14" />
				<a
					:href="wpUrl(entity)"
					target="_blank"
					rel="noopener">{{ wpSubject(entity) }}</a>
				<span
					v-if="wpStatus(entity)"
					class="cn-openproject-card__chip-pill"
					:class="statusPillClass(entity)">
					{{ wpStatus(entity) }}
				</span>
			</span>
			<span v-else class="cn-openproject-card__empty">{{ emptyLabel }}</span>
		</template>

		<!-- dashboard surfaces: headline + status distribution + auth badge -->
		<template v-else-if="surface === 'user-dashboard' || surface === 'app-dashboard'">
			<div
				v-if="authBanner"
				class="cn-openproject-card__auth-badge cn-openproject-card__auth-badge--error">
				<LockOutline :size="14" />
				<span>{{ authBanner }}</span>
			</div>
			<div
				v-else-if="unconfigured"
				class="cn-openproject-card__auth-badge cn-openproject-card__auth-badge--warn">
				<AlertCircleOutline :size="14" />
				<span>{{ unconfiguredLabel }}</span>
			</div>
			<div v-else-if="degraded" class="cn-openproject-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="workPackages.length === 0" class="cn-openproject-card__empty">
				{{ emptyLabel }}
			</div>
			<div v-else class="cn-openproject-card__headline">
				<div class="cn-openproject-card__headline-line">
					<strong>{{ countHeadline }}</strong>
					<span class="cn-openproject-card__auth-badge cn-openproject-card__auth-badge--ok">
						<CheckCircleOutline :size="13" />
						{{ authConfiguredLabel }}
					</span>
				</div>
				<ul v-if="statusDistribution.length > 0" class="cn-openproject-card__distribution">
					<li
						v-for="bucket in statusDistribution"
						:key="bucket.key"
						class="cn-openproject-card__distribution-row">
						<span class="cn-openproject-card__distribution-label">
							<span
								class="cn-openproject-card__distribution-dot"
								:class="bucket.pillClass" />
							{{ bucket.label }}
						</span>
						<span class="cn-openproject-card__distribution-count">{{ bucket.count }}</span>
					</li>
				</ul>
				<div v-if="mostRecent" class="cn-openproject-card__headline-recent">
					<Briefcase :size="14" />
					<a
						:href="wpUrl(mostRecent)"
						target="_blank"
						rel="noopener">{{ wpSubject(mostRecent) }}</a>
				</div>
			</div>
		</template>

		<!-- detail-page surface: bounded row list -->
		<template v-else>
			<div
				v-if="authBanner"
				class="cn-openproject-card__auth-badge cn-openproject-card__auth-badge--error">
				<LockOutline :size="14" />
				<span>{{ authBanner }}</span>
			</div>
			<div
				v-else-if="unconfigured"
				class="cn-openproject-card__auth-badge cn-openproject-card__auth-badge--warn">
				<AlertCircleOutline :size="14" />
				<span>{{ unconfiguredLabel }}</span>
			</div>
			<div v-else-if="degraded" class="cn-openproject-card__empty">
				{{ degraded }}
			</div>
			<div v-else-if="workPackages.length === 0" class="cn-openproject-card__empty">
				{{ emptyLabel }}
			</div>
			<ul v-else class="cn-openproject-card__rows">
				<li
					v-for="wp in workPackages"
					:key="wpKey(wp)"
					class="cn-openproject-card__row"
					:class="{ 'cn-openproject-card__row--highlight': isLinked(wp) }">
					<a
						:href="wpUrl(wp)"
						target="_blank"
						rel="noopener"
						class="cn-openproject-card__title">{{ wpSubject(wp) }}</a>
					<span
						v-if="wpStatus(wp)"
						class="cn-openproject-card__chip-pill"
						:class="statusPillClass(wp)">
						{{ wpStatus(wp) }}
					</span>
					<span v-if="wpAssignee(wp)" class="cn-openproject-card__assignee">
						<AccountCircleOutline :size="12" />
						{{ wpAssignee(wp) }}
					</span>
				</li>
			</ul>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import AccountCircleOutline from 'vue-material-design-icons/AccountCircleOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../../utils/index.js'

const VALID_SURFACES = ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']

/**
 * CnOpenprojectCard — bespoke surface-aware widget for the
 * `openproject` integration.
 *
 * Renders OpenProject-aware metadata across all four surfaces, with
 * special handling for the OpenConnector auth-status states (ADR-019
 * external storage). See the file-level docblock for surface-by-surface
 * behaviour.
 */
export default {
	name: 'CnOpenprojectCard',

	components: {
		CnDetailCard,
		NcLoadingIcon,
		AccountCircleOutline,
		AlertCircleOutline,
		Briefcase,
		CheckCircleOutline,
		LockOutline,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'openproject'`). */
		integrationId: { type: String, default: 'openproject' },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface (AD-19). */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (s) => VALID_SURFACES.includes(s),
		},
		/** Optional single-entity reference (work-package id). */
		value: { type: [String, Number], default: '' },
		/** Pre-translated card title. */
		title: { type: String, default: () => t('nextcloud-vue', 'Projects') },
		/** Optional Material Design Icon component. */
		icon: { type: Object, default: () => Briefcase },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card body is collapsible. */
		collapsible: { type: Boolean, default: true },
		/** Pre-translated empty-state label. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No work packages linked yet'),
		},
		/** Pre-translated unavailable label. */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'OpenProject is currently unavailable.'),
		},
		/** Pre-translated auth-expired label. */
		authExpiredLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Authorisation for OpenProject expired.'),
		},
		/** Pre-translated unconfigured label. */
		unconfiguredLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'OpenProject not configured in OpenConnector.'),
		},
		/** Pre-translated "configured" badge label. */
		authConfiguredLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Connected'),
		},
		/** Fallback URL of the OpenProject app entry. */
		openprojectAppUrl: {
			type: String,
			default: 'https://www.openproject.org',
		},
	},

	data() {
		return {
			workPackages: [],
			entity: null,
			loading: false,
			degraded: '',
			authBanner: '',
			unconfigured: false,
		}
	},

	computed: {
		cardHeaderTitle() {
			return this.title || this.integrationId
		},

		cardIcon() {
			return this.icon
		},

		/**
		 * Work packages bucketed by canonical status pill class so the
		 * dashboard surface's distribution list and the count headline
		 * stay in sync.
		 *
		 * @return {Array<{key: string, label: string, pillClass: string, count: number}>}
		 */
		statusBuckets() {
			const groups = new Map()
			for (const wp of this.workPackages) {
				const label = this.wpStatus(wp) || t('nextcloud-vue', 'Unknown')
				const pillClass = this.statusPillClass(wp)
				const key = `${pillClass}:${label}`
				if (!groups.has(key)) {
					groups.set(key, { key, label, pillClass, count: 0 })
				}
				groups.get(key).count += 1
			}
			return Array.from(groups.values())
		},

		statusDistribution() {
			return this.statusBuckets
		},

		countHeadline() {
			const total = this.workPackages.length
			return n('nextcloud-vue', '{count} work package', '{count} work packages', total, { count: total })
		},

		mostRecent() {
			if (this.workPackages.length === 0) {
				return null
			}
			const sorted = [...this.workPackages].sort((a, b) => {
				const ta = Date.parse(a.linkedAt ?? a.updatedAt ?? a.updated_at ?? '') || 0
				const tb = Date.parse(b.linkedAt ?? b.updatedAt ?? b.updated_at ?? '') || 0
				return tb - ta
			})
			return sorted[0]
		},
	},

	watch: {
		objectId: { immediate: true, handler() { this.fetch() } },
		surface() { this.fetch() },
		value() { if (this.surface === 'single-entity') { this.fetchSingle() } },
	},

	methods: {
		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		wpKey(wp) {
			return wp.id ?? wp.reference ?? ''
		},

		wpSubject(wp) {
			return wp.title ?? wp.subject ?? wp.name ?? this.wpKey(wp)
		},

		wpUrl(wp) {
			return wp.url ?? wp._links?.self?.href ?? this.openprojectAppUrl
		},

		wpStatus(wp) {
			return wp.status ?? wp._links?.status?.title ?? ''
		},

		wpAssignee(wp) {
			return wp.assignee
				?? wp._links?.assignee?.title
				?? wp._embedded?.assignee?.name
				?? ''
		},

		statusPillClass(wp) {
			const status = String(this.wpStatus(wp)).toLowerCase()
			if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
				return 'cn-openproject-card__chip-pill--done'
			}
			if (status.includes('progress') || status.includes('developed') || status.includes('review')) {
				return 'cn-openproject-card__chip-pill--progress'
			}
			if (status.includes('reject') || status.includes('block')) {
				return 'cn-openproject-card__chip-pill--blocked'
			}
			return 'cn-openproject-card__chip-pill--new'
		},

		isLinked(wp) {
			if (!this.value) {
				return false
			}
			return String(this.wpKey(wp)) === String(this.value)
		},

		chipSubtitle(wp) {
			return this.wpStatus(wp) || this.wpSubject(wp)
		},

		fetch() {
			if (this.surface === 'single-entity') {
				this.fetchSingle()
				return
			}
			this.fetchList()
		},

		async fetchList() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.degraded = ''
			this.authBanner = ''
			this.unconfigured = false
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.workPackages = data.results
						|| data.items
						|| data._embedded?.elements
						|| (Array.isArray(data) ? data : [])
						|| []
				} else if (response.status === 401 || response.status === 403) {
					this.workPackages = []
					this.authBanner = this.authExpiredLabel
				} else if (response.status === 412 || response.status === 404) {
					this.workPackages = []
					this.unconfigured = true
				} else if (response.status === 503) {
					this.workPackages = []
					this.degraded = this.unavailableLabel
				} else {
					this.workPackages = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectCard] failed to fetch work packages', err)
				this.workPackages = []
			} finally {
				this.loading = false
			}
		},

		async fetchSingle() {
			if (!this.value || !this.register || !this.schema || !this.objectId) {
				this.entity = null
				return
			}
			this.loading = true
			this.degraded = ''
			this.authBanner = ''
			this.unconfigured = false
			try {
				const response = await fetch(`${this.baseUrl()}/${encodeURIComponent(this.value)}`, { headers: buildHeaders() })
				if (response.ok) {
					this.entity = await response.json()
				} else if (response.status === 401 || response.status === 403) {
					this.entity = null
					this.authBanner = this.authExpiredLabel
				} else if (response.status === 503) {
					this.entity = null
					this.degraded = this.unavailableLabel
				} else {
					this.entity = null
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectCard] failed to fetch single work package', err)
				this.entity = null
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-openproject-card__empty {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	padding: 8px 0;
}

.cn-openproject-card__headline {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-openproject-card__headline-line {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-openproject-card__distribution {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-openproject-card__distribution-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-openproject-card__distribution-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.cn-openproject-card__distribution-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color-background-dark);
}

.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--new {
	background: var(--color-background-darker, var(--color-background-dark));
}

.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--progress {
	background: var(--color-warning, #e9a40f);
}

.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--done {
	background: var(--color-success, #46ba61);
}

.cn-openproject-card__distribution-dot.cn-openproject-card__chip-pill--blocked {
	background: var(--color-error, #e9322d);
}

.cn-openproject-card__distribution-count {
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-openproject-card__headline-recent {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-openproject-card__headline-recent a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-openproject-card__headline-recent a:hover {
	text-decoration: underline;
}

.cn-openproject-card__auth-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 0.75em;
	font-weight: 500;
}

.cn-openproject-card__auth-badge--ok {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-openproject-card__auth-badge--warn {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-openproject-card__auth-badge--error {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-openproject-card__chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 12px;
	background: var(--color-background-hover);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-openproject-card__chip a {
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-openproject-card__chip a:hover {
	text-decoration: underline;
}

.cn-openproject-card__chip-pill {
	display: inline-block;
	padding: 1px 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 0.78em;
	font-weight: 500;
}

.cn-openproject-card__chip-pill--new {
	background: var(--color-background-darker, var(--color-background-dark));
}

.cn-openproject-card__chip-pill--progress {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-openproject-card__chip-pill--done {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-openproject-card__chip-pill--blocked {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-openproject-card__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-openproject-card__row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	border-radius: 4px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	font-size: 0.85em;
}

.cn-openproject-card__row--highlight {
	border-color: var(--color-primary-element, #21468B);
	background: var(--color-primary-element-light, var(--color-background-darker));
	font-weight: 600;
}

.cn-openproject-card__title {
	flex: 1;
	color: var(--color-main-text);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-openproject-card__title:hover {
	text-decoration: underline;
}

.cn-openproject-card__assignee {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>
