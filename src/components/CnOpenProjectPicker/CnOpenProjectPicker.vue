<!--
  CnOpenProjectPicker — modal for picking an existing OpenProject work
  package to link to the parent OR object.

  OpenProject is an external integration: the work packages come from the
  OpenConnector `openproject` source via
  GET /api/integrations/openproject/available (each row carries
  workPackageId + subject + type + status + priority + assignee + project
  + url). Because the source is admin-configured the picker has to handle
  the "unconfigured" state — when the endpoint reports 503 / 501 the modal
  renders a Configure-in-OpenConnector CTA instead of a broken list
  (wave-5.2 4-state auth UX).

  Flow:
    1. Load work packages on mount (with optional `?search=`, debounced)
    2. Filter client-side via a project dropdown + a live search input
    3. Single-select a work-package row
    4. Confirm → emit `link` with `{ workPackageId }`

  All API calls are wrapped in best-effort try/catch so a transient
  upstream failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnOpenProjectPicker/` (NcDialog-based; matches the
  collectives/photos/deck picker pattern).

  ADR-019: drives the `openproject` integration leaf's "link existing"
  surface; emits `link` so the parent (CnOpenprojectTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-openproject-picker"
		@closing="onClose">
		<div class="cn-openproject-picker">
			<NcNoteCard v-if="error" type="error" class="cn-openproject-picker__error">
				{{ error }}
			</NcNoteCard>

			<!-- Unconfigured: the OpenConnector `openproject` source is absent. -->
			<NcEmptyContent
				v-if="unconfigured"
				:name="t('nextcloud-vue', 'OpenProject is not configured')"
				:description="t('nextcloud-vue', 'Add an `openproject` source in OpenConnector to start linking work packages.')">
				<template #icon>
					<Briefcase :size="32" />
				</template>
				<template #action>
					<NcButton variant="primary" @click="openOpenconnectorAdmin">
						<template #icon>
							<CogOutline :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Configure OpenProject connection') }}
					</NcButton>
				</template>
			</NcEmptyContent>

			<template v-else>
				<NcSelect
					v-if="projects.length > 0"
					v-model="projectFilter"
					:options="projectOptions"
					:placeholder="t('nextcloud-vue', 'All projects')"
					label="label"
					class="cn-openproject-picker__project"
					:clearable="true" />

				<NcTextField
					v-model="search"
					:label="t('nextcloud-vue', 'Search work packages')"
					:placeholder="t('nextcloud-vue', 'Type to filter…')"
					class="cn-openproject-picker__search"
					@update:model-value="onSearch" />

				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="visibleWorkPackages.length === 0"
					:name="t('nextcloud-vue', 'No work packages available')"
					:description="t('nextcloud-vue', 'Create a work package in OpenProject first, or use the create dialog.')" />
				<ul v-else class="cn-openproject-picker__list">
					<li
						v-for="wp in visibleWorkPackages"
						:key="wp.workPackageId"
						class="cn-openproject-picker__row"
						:class="{ 'cn-openproject-picker__row--selected': selectedId === wp.workPackageId }">
						<button type="button" class="cn-openproject-picker__row-button" @click="pick(wp)">
							<span class="cn-openproject-picker__icon" :aria-hidden="true">
								<Briefcase :size="18" />
							</span>
							<span class="cn-openproject-picker__main">
								<span class="cn-openproject-picker__title">{{ wp.subject }}</span>
								<span class="cn-openproject-picker__sub">
									<span v-if="wp.type" class="cn-openproject-picker__type">{{ wp.type }}</span>
									<span v-if="wp.status" class="cn-openproject-picker__status">· {{ wp.status }}</span>
									<span v-if="wp.project" class="cn-openproject-picker__project-name">· {{ wp.project }}</span>
								</span>
							</span>
						</button>
					</li>
				</ul>
			</template>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="!unconfigured"
				variant="primary"
				:disabled="selectedId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link work package') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnOpenProjectPicker — pick an existing OpenProject work package. Emits
 * `link` with the chosen work-package id. Handles the unconfigured
 * external-source state with a Configure-in-OpenConnector CTA.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import CogOutline from 'vue-material-design-icons/CogOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnOpenProjectPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcSelect, NcTextField, Briefcase, CogOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing work package') },
		/** URL of the OpenConnector source admin page (for the `openproject` source). */
		openconnectorUrl: { type: String, default: '/index.php/apps/openconnector/sources/openproject' },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			unconfigured: false,
			workPackages: [],
			projectFilter: null,
			search: '',
			selectedId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Distinct projects across the loaded work packages.
		 *
		 * @return {Array} The project rows.
		 */
		projects() {
			const seen = new Set()
			const out = []
			this.workPackages.forEach((wp) => {
				const name = (wp.project || '').trim()
				if (name !== '' && !seen.has(name)) {
					seen.add(name)
					out.push(name)
				}
			})
			return out
		},

		/**
		 * Options for the project filter dropdown.
		 *
		 * @return {Array} The project option rows.
		 */
		projectOptions() {
			return this.projects.map(name => ({ id: name, label: name }))
		},

		/**
		 * Client-side filter on top of the server-side `?search=` payload
		 * plus the optional project narrowing.
		 *
		 * @return {Array} The filtered work-package rows.
		 */
		visibleWorkPackages() {
			const term = this.search.trim().toLowerCase()
			const project = this.projectFilter ? this.projectFilter.id : null
			return this.workPackages.filter((wp) => {
				if (project !== null && (wp.project || '') !== project) {
					return false
				}
				if (term !== '' && !(wp.subject || '').toLowerCase().includes(term)) {
					return false
				}
				return true
			})
		},
	},

	mounted() {
		this.fetchWorkPackages()
	},

	beforeUnmount() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		/**
		 * Dismiss the dialog.
		 *
		 * @return {void}
		 */
		onClose() {
			/**
			 * @event close Emitted when the dialog should be closed (cancel or close button).
			 */
			this.$emit('close')
		},

		async fetchWorkPackages(searchTerm = '') {
			this.loading = true
			this.error = ''
			this.unconfigured = false
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/openproject/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.workPackages = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'OpenConnector is not installed.')
				} else if (response.status === 503 || response.status === 412 || response.status === 404) {
					this.unconfigured = true
				} else {
					this.error = t('nextcloud-vue', 'Could not load work packages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenProjectPicker] fetch work packages failed', err)
				this.error = t('nextcloud-vue', 'Could not load work packages.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			// Debounce server-side filter; client-side filter is live.
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchWorkPackages(this.search.trim())
			}, 300)
		},

		pick(wp) {
			this.selectedId = wp.workPackageId
		},

		openOpenconnectorAdmin() {
			if (typeof window !== 'undefined' && this.openconnectorUrl) {
				window.open(this.openconnectorUrl, '_blank', 'noopener')
			}
		},

		confirm() {
			if (this.selectedId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ workPackageId }`.
			 */
			this.$emit('link', { workPackageId: this.selectedId })
		},
	},
}
</script>

<style scoped>
.cn-openproject-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-openproject-picker__error {
	margin: 4px 0;
}

.cn-openproject-picker__project,
.cn-openproject-picker__search {
	width: 100%;
}

.cn-openproject-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-openproject-picker__row {
	border-radius: var(--border-radius);
}

.cn-openproject-picker__row-button {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-openproject-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-openproject-picker__row--selected .cn-openproject-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-openproject-picker__icon {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
}

.cn-openproject-picker__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-openproject-picker__title {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-openproject-picker__sub {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
