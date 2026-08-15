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

		<!-- Link / Create actions — hidden while unconfigured (the empty
		     state below carries the Configure CTA instead) and while an
		     auth banner is showing. -->
		<div v-if="!unconfigured && !authBanner" class="cn-openproject-tab__actions">
			<NcButton variant="secondary" @click="openPicker">
				<template #icon>
					<LinkVariant :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Link work package') }}
			</NcButton>
			<NcButton variant="primary" @click="openCreate">
				<template #icon>
					<Plus :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Create work package') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" />

		<!-- Unconfigured: provider reports the OpenConnector `openproject` source is absent. -->
		<div
			v-else-if="unconfigured"
			class="cn-sidebar-tab__empty cn-openproject-tab__empty">
			<Briefcase :size="32" class="cn-openproject-tab__empty-icon" />
			<p>{{ unconfiguredLabel }}</p>
			<NcButton variant="primary" @click="openOpenconnectorAdmin">
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
			<NcButton variant="secondary" @click="openOpenprojectApp">
				<template #icon>
					<OpenInNew :size="20" />
				</template>
				{{ openOpenprojectLabel }}
			</NcButton>
		</div>

		<ul v-else class="cn-openproject-tab__list">
			<NcListItem
				v-for="wp in workPackages"
				:key="wpKey(wp)"
				class="cn-openproject-tab__row"
				:class="rowClass(wp)"
				:name="wpSubject(wp)"
				:bold="true"
				:href="wpUrl(wp)"
				target="_blank"
				:force-display-actions="true">
				<!-- Type indicator: a coloured square chip echoing OpenProject's
				     type colour-coding (Task / Bug / Feature / Milestone). -->
				<template #icon>
					<span
						class="cn-openproject-tab__type-icon"
						:class="typeBadgeClass(wp)"
						:title="typeTitle(wp)">
						<RhombusOutline v-if="isMilestoneType(wp)" :size="18" />
						<Bug v-else-if="isBugType(wp)" :size="18" />
						<StarFourPointsOutline v-else-if="isFeatureType(wp)" :size="18" />
						<CheckboxMarkedOutline v-else :size="18" />
					</span>
				</template>
				<!-- Sub-line: #id reference + status chip, the OpenProject row meta. -->
				<template #subname>
					<span class="cn-openproject-tab__subline">
						<span v-if="wpReference(wp)" class="cn-openproject-tab__ref">{{ wpReference(wp) }}</span>
						<CnStatusBadge
							v-if="wpStatus(wp)"
							class="cn-openproject-tab__status-pill"
							:class="statusPillClass(wp)"
							:label="wpStatus(wp)"
							:variant="statusVariant(wp)"
							size="small" />
						<span v-if="wpProject(wp)" class="cn-openproject-tab__project">
							<Briefcase :size="12" />
							{{ wpProject(wp) }}
						</span>
					</span>
				</template>
				<!-- Trailing column: type badge label so the type stays legible. -->
				<template v-if="wpType(wp)" #details>
					<span class="cn-openproject-tab__type-label">{{ wpType(wp) }}</span>
				</template>
				<!-- Right-edge indicators: priority marker + assignee avatar. -->
				<template #indicator>
					<span class="cn-openproject-tab__indicators">
						<span
							v-if="wpPriority(wp)"
							class="cn-openproject-tab__priority"
							:class="priorityClass(wp)"
							:title="priorityTitle(wp)">
							<AlertCircleOutline v-if="isHighPriority(wp)" :size="14" />
							<ChevronDoubleUp v-else-if="isMediumPriority(wp)" :size="14" />
							<ChevronUp v-else :size="14" />
						</span>
						<NcAvatar
							v-if="wpAssignee(wp)"
							class="cn-openproject-tab__assignee"
							:size="24"
							:display-name="wpAssignee(wp)"
							:user="assigneeSeed(wp)"
							:is-no-user="true"
							:disable-menu="true"
							:disable-tooltip="false"
							:show-user-status="false"
							:title="assigneeTitle(wp)" />
					</span>
				</template>
				<template #actions>
					<NcActionButton
						class="cn-openproject-tab__unlink"
						:close-after-click="true"
						@click="unlinkWorkPackage(wp)">
						<template #icon>
							<LinkOff :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Unlink work package') }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnOpenProjectPicker
			v-if="pickerOpen"
			:api-base="apiBase"
			:openconnector-url="openconnectorUrl"
			@close="pickerOpen = false"
			@link="onLinkPick" />

		<CnOpenProjectCreate
			v-if="createOpen"
			:api-base="apiBase"
			:openconnector-url="openconnectorUrl"
			@close="createOpen = false"
			@create="onCreatePick" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcAvatar, NcButton, NcListItem, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import Bug from 'vue-material-design-icons/Bug.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import ChevronDoubleUp from 'vue-material-design-icons/ChevronDoubleUp.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import CogOutline from 'vue-material-design-icons/CogOutline.vue'
import LinkOff from 'vue-material-design-icons/LinkOff.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import RhombusOutline from 'vue-material-design-icons/RhombusOutline.vue'
import StarFourPointsOutline from 'vue-material-design-icons/StarFourPointsOutline.vue'
import CnStatusBadge from '../../../components/CnStatusBadge/CnStatusBadge.vue'
import CnOpenProjectCreate from '../../../components/CnOpenProjectCreate/CnOpenProjectCreate.vue'
import CnOpenProjectPicker from '../../../components/CnOpenProjectPicker/CnOpenProjectPicker.vue'
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
		NcActionButton,
		NcAvatar,
		NcButton,
		NcListItem,
		NcLoadingIcon,
		AlertCircleOutline,
		Briefcase,
		Bug,
		CheckboxMarkedOutline,
		ChevronDoubleUp,
		ChevronUp,
		CogOutline,
		LinkOff,
		LinkVariant,
		LockOutline,
		OpenInNew,
		Plus,
		RhombusOutline,
		StarFourPointsOutline,
		CnStatusBadge,
		CnOpenProjectPicker,
		CnOpenProjectCreate,
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
			pickerOpen: false,
			createOpen: false,
		}
	},

	watch: {
		objectId: { immediate: true, handler(id) { if (id) { this.fetchWorkPackages() } } },
		register() { this.fetchWorkPackages() },
		schema() { this.fetchWorkPackages() },
	},

	methods: {
		t,

		baseUrl() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/integrations/${this.integrationId}`
		},

		/**
		 * Base for the Tier-2 openproject endpoints (list/link/new/destroy).
		 *
		 * @return {string} The endpoint URL.
		 */
		openProjectEndpoint() {
			return `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/openproject`
		},

		openPicker() {
			this.pickerOpen = true
		},

		openCreate() {
			this.createOpen = true
		},

		async onLinkPick(payload) {
			this.pickerOpen = false
			try {
				const response = await fetch(this.openProjectEndpoint(), {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchWorkPackages()
				} else if (response.status === 409) {
					this.error = t('nextcloud-vue', 'This work package is already linked.')
				} else {
					this.error = t('nextcloud-vue', 'Could not link work package.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectTab] link failed', err)
				this.error = t('nextcloud-vue', 'Could not link work package.')
			}
		},

		async onCreatePick(payload) {
			this.createOpen = false
			try {
				const response = await fetch(`${this.openProjectEndpoint()}/new`, {
					method: 'POST',
					headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				if (response.ok) {
					await this.fetchWorkPackages()
				} else {
					this.error = t('nextcloud-vue', 'Could not create work package.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectTab] create failed', err)
				this.error = t('nextcloud-vue', 'Could not create work package.')
			}
		},

		async unlinkWorkPackage(wp) {
			const id = this.wpKey(wp)
			if (!id) {
				return
			}
			try {
				const response = await fetch(`${this.openProjectEndpoint()}/${id}`, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					await this.fetchWorkPackages()
				} else {
					this.error = t('nextcloud-vue', 'Could not unlink work package.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenprojectTab] unlink failed', err)
				this.error = t('nextcloud-vue', 'Could not unlink work package.')
			}
		},

		wpKey(wp) {
			return wp.id ?? wp.reference ?? ''
		},

		/**
		 * The OpenProject `#id` reference shown on the row sub-line.
		 *
		 * @param {object} wp - The work-package row.
		 * @return {string} A `#123` reference, or '' when no id is known.
		 */
		wpReference(wp) {
			const id = wp.id ?? wp.reference ?? ''
			if (id === '' || id === null || id === undefined) {
				return ''
			}
			const str = String(id)
			return str.charAt(0) === '#' ? str : '#' + str
		},

		/**
		 * Stable seed for NcAvatar's deterministic colour + initials.
		 *
		 * @param {object} wp - The work-package row.
		 * @return {string} A non-empty seed.
		 */
		assigneeSeed(wp) {
			return String(this.wpAssignee(wp) || this.wpKey(wp) || 'op')
		},

		/**
		 * Row modifier classes (high-priority emphasis on the left edge).
		 *
		 * @param {object} wp - The work-package row.
		 * @return {object} The class map.
		 */
		rowClass(wp) {
			return { 'cn-openproject-tab__row--high-priority': this.isHighPriority(wp) }
		},

		typeTitle(wp) {
			return t('nextcloud-vue', 'Type: {type}', { type: this.wpType(wp) || t('nextcloud-vue', 'Task') })
		},

		isBugType(wp) {
			return String(this.wpType(wp)).toLowerCase().includes('bug')
		},

		isMilestoneType(wp) {
			const type = String(this.wpType(wp)).toLowerCase()
			return type.includes('milestone') || type.includes('phase')
		},

		isFeatureType(wp) {
			const type = String(this.wpType(wp)).toLowerCase()
			return type.includes('feature') || type.includes('user story') || type.includes('epic')
		},

		/**
		 * CnStatusBadge variant matching the OpenProject status family.
		 *
		 * @param {object} wp - The work-package row.
		 * @return {string} A CnStatusBadge variant.
		 */
		statusVariant(wp) {
			const status = String(this.wpStatus(wp)).toLowerCase()
			if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
				return 'success'
			}
			if (status.includes('progress') || status.includes('developed') || status.includes('review')) {
				return 'warning'
			}
			if (status.includes('reject') || status.includes('block')) {
				return 'error'
			}
			return 'info'
		},

		/**
		 * Priority-marker emphasis class.
		 *
		 * @param {object} wp - The work-package row.
		 * @return {object} The class map.
		 */
		priorityClass(wp) {
			return {
				'cn-openproject-tab__priority--high': this.isHighPriority(wp),
				'cn-openproject-tab__priority--medium': this.isMediumPriority(wp),
			}
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
.cn-openproject-tab__actions {
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
}

.cn-openproject-tab__unlink {
	flex-shrink: 0;
}

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
}

/* High-priority work packages get a coloured left rail so case handlers
   spot them while scanning the list. */
.cn-openproject-tab__row--high-priority {
	border-left: 3px solid var(--color-error);
}

/* Type indicator: a rounded square chip echoing OpenProject's
   colour-coded work-package types. */
.cn-openproject-tab__type-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: var(--border-radius);
	background: var(--color-primary-element, #1A67A3);
	color: var(--color-primary-element-text, #fff);
}

.cn-openproject-tab__type-icon.cn-openproject-tab__type-badge--bug {
	background: var(--color-error);
}

.cn-openproject-tab__type-icon.cn-openproject-tab__type-badge--feature {
	background: var(--color-success, #46ba61);
}

.cn-openproject-tab__type-icon.cn-openproject-tab__type-badge--task {
	background: #1A67A3;
}

.cn-openproject-tab__subline {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

/* OpenProject-style `#id` reference, monospaced for a ticket feel. */
.cn-openproject-tab__ref {
	font-family: var(--font-face-monospace, monospace);
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-openproject-tab__project {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}

.cn-openproject-tab__type-label {
	font-size: 0.78em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
}

.cn-openproject-tab__indicators {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.cn-openproject-tab__priority {
	display: inline-flex;
	align-items: center;
	color: var(--color-text-maxcontrast);
}

.cn-openproject-tab__priority--high {
	color: var(--color-error);
}

.cn-openproject-tab__priority--medium {
	color: var(--color-warning, #e9a40f);
}

.cn-openproject-tab__assignee {
	flex-shrink: 0;
}

/* CnStatusBadge keeps its own colours; the legacy status-pill modifier
   hooks are retained so existing tests and consumers keep matching. */
.cn-openproject-tab__status-pill {
	flex-shrink: 0;
}
</style>
