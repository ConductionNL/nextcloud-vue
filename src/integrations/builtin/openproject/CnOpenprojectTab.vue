<!--
  CnOpenprojectTab — bespoke sidebar tab for the `openproject` integration.

  Replaces the generic CnIntegrationTab for the `openproject` leaf:
  renders the work packages linked to the parent OR object as a flat
  list, each row showing subject, type badge (Task / Bug / Feature /
  …), status pill (New / In progress / Closed / …), priority indicator,
  assignee avatar, and project name. Clicking a row deep-links to the
  work package in OpenProject.

  Talks to the OpenRegister pluggable-integration sub-resource
    `/api/objects/{register}/{schema}/{objectId}/integrations/openproject`
  served by `OCA\OpenRegister\Service\Integration\Providers\OpenProjectProvider`
  (which delegates through `ExternalIntegrationRouter` to the
  OpenConnector source named `openproject`).

  Surface behaviour (per ADR-017 graceful degradation + ADR-019 external
  storage policy):
    - Unconfigured: 412 / `health=unavailable` from the provider →
      "Configure OpenProject connection" CTA pointing at OpenConnector.
    - Authorisation expired: 401 with `authStatus: 'expired'` →
      reconnect-in-OpenConnector banner.
    - Other 4xx/5xx: surface the upstream message (not a silent empty).
    - Loading: spinner.
    - Empty: "No work packages linked yet" + "Open OpenProject" CTA.
    - Degraded (503): "OpenProject is currently unavailable" banner.

  Bespoke-vs-generic rationale: the generic tab renders a flat link
  list which loses OpenProject's primary signals — *type of work*,
  *current status* and *who's responsible*. Surfacing them inline
  reproduces enough of the OpenProject row affordance for case handlers
  to triage at a glance without context-switching to OpenProject itself.

  As the first external-storage integration this tab also pioneers the
  auth-status surfacing the umbrella's `IntegrationHealth` contract
  exposes — silently failing on 401 is a debugging black hole.

  See `openregister/openspec/changes/integration-openproject/` for the
  spec delta, ADR-019 (registry mechanism), ADR-022 (sidebar tab
  contract).
-->
<template>
	<div class="cn-sidebar-tab cn-openproject-tab">
		<div v-if="authBanner" class="cn-openproject-tab__banner cn-openproject-tab__banner--auth" role="alert">
			<LockOutline :size="18" />
			<span>{{ authBanner }}</span>
			<a
				v-if="openconnectorUrl"
				:href="openconnectorUrl"
				class="cn-openproject-tab__banner-cta"
				target="_blank"
				rel="noopener">{{ openconnectorLabel }}</a>
		</div>
		<div v-else-if="degraded" class="cn-openproject-tab__banner cn-openproject-tab__banner--warn" role="alert">
			<AlertCircleOutline :size="18" />
			<span>{{ degraded }}</span>
		</div>

		<NcLoadingIcon v-if="loading" />

		<!-- Unconfigured: provider reports the OpenConnector `openproject` source is absent. -->
		<div
			v-else-if="unconfigured"
			class="cn-sidebar-tab__empty cn-openproject-tab__empty">
			<Briefcase :size="32" class="cn-openproject-tab__empty-icon" />
			<p>{{ unconfiguredLabel }}</p>
			<NcButton type="primary" @click="openOpenconnectorAdmin">
				<template #icon>
					<CogOutline :size="20" />
				</template>
				{{ configureLabel }}
			</NcButton>
		</div>

		<div v-else-if="error" class="cn-openproject-tab__error" role="alert">
			{{ error }}
		</div>

		<div v-else-if="workPackages.length === 0" class="cn-sidebar-tab__empty cn-openproject-tab__empty">
			<Briefcase :size="32" class="cn-openproject-tab__empty-icon" />
			<p>{{ emptyLabel }}</p>
			<NcButton type="secondary" @click="openOpenprojectApp">
				<template #icon>
					<OpenInNew :size="20" />
				</template>
				{{ openOpenprojectLabel }}
			</NcButton>
		</div>

		<ul v-else class="cn-openproject-tab__list">
			<li
				v-for="wp in workPackages"
				:key="wpKey(wp)"
				class="cn-openproject-tab__row"
				:class="{ 'cn-openproject-tab__row--high-priority': isHighPriority(wp) }">
				<div class="cn-openproject-tab__row-header">
					<a
						:href="wpUrl(wp)"
						target="_blank"
						rel="noopener"
						class="cn-openproject-tab__subject">{{ wpSubject(wp) }}</a>
					<span
						v-if="wpType(wp)"
						class="cn-openproject-tab__type-badge"
						:class="typeBadgeClass(wp)">
						{{ wpType(wp) }}
					</span>
				</div>
				<div class="cn-openproject-tab__row-meta">
					<span
						v-if="wpStatus(wp)"
						class="cn-openproject-tab__status-pill"
						:class="statusPillClass(wp)">
						{{ wpStatus(wp) }}
					</span>
					<span
						v-if="wpPriority(wp)"
						class="cn-openproject-tab__priority"
						:title="priorityTitle(wp)">
						<AlertCircleOutline v-if="isHighPriority(wp)" :size="13" />
						<ChevronDoubleUp v-else-if="isMediumPriority(wp)" :size="13" />
						<ChevronUp v-else :size="13" />
						{{ wpPriority(wp) }}
					</span>
					<span v-if="wpProject(wp)" class="cn-openproject-tab__project">
						<Briefcase :size="13" />
						{{ wpProject(wp) }}
					</span>
					<span
						v-if="wpAssignee(wp)"
						class="cn-openproject-tab__assignee"
						:title="assigneeTitle(wp)">
						<AccountCircleOutline :size="14" />
						{{ wpAssignee(wp) }}
					</span>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AccountCircleOutline from 'vue-material-design-icons/AccountCircleOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import ChevronDoubleUp from 'vue-material-design-icons/ChevronDoubleUp.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import CogOutline from 'vue-material-design-icons/CogOutline.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import { buildHeaders } from '../../../utils/index.js'

/**
 * CnOpenprojectTab — bespoke sidebar tab for the `openproject` integration.
 *
 * Renders linked work packages with type / status / priority /
 * assignee, plus auth-status surfacing for OpenConnector configured /
 * missing / expired states. See the file-level docblock for the full
 * surface contract.
 */
export default {
	name: 'CnOpenprojectTab',

	components: {
		NcButton,
		NcLoadingIcon,
		AccountCircleOutline,
		AlertCircleOutline,
		Briefcase,
		ChevronDoubleUp,
		ChevronUp,
		CogOutline,
		LockOutline,
		OpenInNew,
	},

	props: {
		/** Stable integration id (forwarded from the registry — always `'openproject'`). */
		integrationId: { type: String, default: 'openproject' },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, default: '' },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, default: '' },
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated empty-state label. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'No work packages linked yet'),
		},
		/** Pre-translated label for the "Open OpenProject" CTA. */
		openOpenprojectLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open OpenProject'),
		},
		/** Pre-translated label for the "Configure OpenProject connection" CTA. */
		configureLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Configure OpenProject connection'),
		},
		/** Pre-translated label shown when the integration is unconfigured. */
		unconfiguredLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'OpenProject is not configured yet. Add an `openproject` source in OpenConnector to start linking work packages.'),
		},
		/** Pre-translated banner when OpenProject is unavailable. */
		unavailableLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'OpenProject is currently unavailable.'),
		},
		/** Pre-translated banner when the OAuth/API token has expired. */
		authExpiredLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Authorisation for OpenProject expired. Reconnect the source in OpenConnector to restore access.'),
		},
		/** Pre-translated link label to the OpenConnector admin. */
		openconnectorLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open OpenConnector'),
		},
		/** URL of the OpenConnector source admin page (for the `openproject` source). */
		openconnectorUrl: {
			type: String,
			default: '/index.php/apps/openconnector/sources/openproject',
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
			loading: false,
			error: '',
			degraded: '',
			authBanner: '',
			unconfigured: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchWorkPackages() } } },
		register() { this.fetchWorkPackages() },
		schema() { this.fetchWorkPackages() },
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

		wpType(wp) {
			return wp.type ?? wp._links?.type?.title ?? wp._embedded?.type?.name ?? ''
		},

		wpPriority(wp) {
			return wp.priority ?? wp._links?.priority?.title ?? wp._embedded?.priority?.name ?? ''
		},

		wpAssignee(wp) {
			return wp.assignee
				?? wp._links?.assignee?.title
				?? wp._embedded?.assignee?.name
				?? ''
		},

		wpProject(wp) {
			return wp.project
				?? wp._links?.project?.title
				?? wp._embedded?.project?.name
				?? ''
		},

		assigneeTitle(wp) {
			return t('nextcloud-vue', 'Assigned to {name}', { name: this.wpAssignee(wp) })
		},

		priorityTitle(wp) {
			return t('nextcloud-vue', 'Priority: {priority}', { priority: this.wpPriority(wp) })
		},

		isHighPriority(wp) {
			const priority = String(this.wpPriority(wp)).toLowerCase()
			return priority === 'high' || priority === 'immediate' || priority === 'urgent'
		},

		isMediumPriority(wp) {
			return String(this.wpPriority(wp)).toLowerCase() === 'normal'
		},

		statusPillClass(wp) {
			const status = String(this.wpStatus(wp)).toLowerCase()
			if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
				return 'cn-openproject-tab__status-pill--done'
			}
			if (status.includes('progress') || status.includes('developed') || status.includes('review')) {
				return 'cn-openproject-tab__status-pill--progress'
			}
			if (status.includes('reject') || status.includes('block')) {
				return 'cn-openproject-tab__status-pill--blocked'
			}
			return 'cn-openproject-tab__status-pill--new'
		},

		typeBadgeClass(wp) {
			const type = String(this.wpType(wp)).toLowerCase()
			if (type.includes('bug')) {
				return 'cn-openproject-tab__type-badge--bug'
			}
			if (type.includes('feature') || type.includes('user story') || type.includes('epic')) {
				return 'cn-openproject-tab__type-badge--feature'
			}
			return 'cn-openproject-tab__type-badge--task'
		},

		openOpenprojectApp() {
			if (typeof window !== 'undefined') {
				window.open(this.openprojectAppUrl, '_blank', 'noopener')
			}
		},

		openOpenconnectorAdmin() {
			if (typeof window !== 'undefined' && this.openconnectorUrl) {
				window.open(this.openconnectorUrl, '_blank', 'noopener')
			}
		},

		async fetchWorkPackages() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			this.error = ''
			this.degraded = ''
			this.authBanner = ''
			this.unconfigured = false
			try {
				const response = await fetch(this.baseUrl(), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					const rows = data.results
						|| data.items
						|| data._embedded?.elements
						|| (Array.isArray(data) ? data : [])
						|| []
					this.workPackages = rows
				} else if (response.status === 401 || response.status === 403) {
					this.workPackages = []
					this.authBanner = this.authExpiredLabel
				} else if (response.status === 412) {
					// Provider returned "preconditions failed" — convention for "unconfigured".
					this.workPackages = []
					this.unconfigured = true
				} else if (response.status === 503) {
					this.workPackages = []
					this.degraded = this.unavailableLabel
				} else if (response.status === 404) {
					this.workPackages = []
					this.unconfigured = true
				} else {
					this.workPackages = []
					this.error = await this.extractError(response)
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectTab] failed to fetch work packages', err)
				this.workPackages = []
				this.error = t('nextcloud-vue', 'Could not load work packages.')
			} finally {
				this.loading = false
			}
		},

		async extractError(response) {
			try {
				const body = await response.json()
				if (body && typeof body.message === 'string' && body.message !== '') {
					return body.message
				}
				if (body && typeof body.error === 'string' && body.error !== '') {
					return body.error
				}
			} catch (_) {
				// Fall through.
			}
			return t('nextcloud-vue', 'Could not load work packages.')
		},
	},
}
</script>

<style scoped>
.cn-openproject-tab__banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	margin-bottom: 10px;
	border-radius: var(--border-radius);
	color: var(--color-main-background);
	font-size: 0.9em;
}

.cn-openproject-tab__banner--warn {
	background: var(--color-warning, #e9a40f);
}

.cn-openproject-tab__banner--auth {
	background: var(--color-error, #e9322d);
}

.cn-openproject-tab__banner-cta {
	margin-left: auto;
	color: var(--color-main-background);
	text-decoration: underline;
}

.cn-openproject-tab__error {
	color: var(--color-error);
	font-size: 0.9em;
	margin: 4px 0 8px;
}

.cn-openproject-tab__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-openproject-tab__empty-icon {
	color: var(--color-text-maxcontrast);
}

.cn-openproject-tab__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-openproject-tab__row {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 10px;
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
}

.cn-openproject-tab__row--high-priority {
	border-left: 3px solid var(--color-error);
}

.cn-openproject-tab__row-header {
	display: flex;
	align-items: center;
	gap: 6px;
}

.cn-openproject-tab__subject {
	flex: 1;
	color: var(--color-main-text);
	text-decoration: none;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

a.cn-openproject-tab__subject:hover {
	text-decoration: underline;
}

.cn-openproject-tab__type-badge {
	display: inline-block;
	padding: 1px 6px;
	font-size: 0.7em;
	font-weight: 600;
	border-radius: 8px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	white-space: nowrap;
}

.cn-openproject-tab__type-badge--bug {
	background: var(--color-error);
	color: var(--color-main-background);
}

.cn-openproject-tab__type-badge--feature {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-openproject-tab__type-badge--task {
	background: var(--color-primary-element, #21468B);
	color: var(--color-main-background);
}

.cn-openproject-tab__row-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	font-size: 0.78em;
	color: var(--color-text-maxcontrast);
}

.cn-openproject-tab__status-pill {
	display: inline-block;
	padding: 1px 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 0.9em;
	font-weight: 500;
}

.cn-openproject-tab__status-pill--new {
	background: var(--color-background-darker, var(--color-background-dark));
}

.cn-openproject-tab__status-pill--progress {
	background: var(--color-warning, #e9a40f);
	color: var(--color-main-background);
}

.cn-openproject-tab__status-pill--done {
	background: var(--color-success, #46ba61);
	color: var(--color-main-background);
}

.cn-openproject-tab__status-pill--blocked {
	background: var(--color-error, #e9322d);
	color: var(--color-main-background);
}

.cn-openproject-tab__priority,
.cn-openproject-tab__project,
.cn-openproject-tab__assignee {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}
</style>
