<!--
  CnCospendPicker — modal for picking an existing NC Cospend (Costs)
  project to link to the parent OR object.

  Flow:
    1. Load projects via GET /api/integrations/cospend/available
       (each row carries id + name + currency)
    2. Filter client-side via a search input (debounced; the same query
       is forwarded as `?search=` for server-side filtering)
    3. Single-select a project row (name + currency badge)
    4. Confirm → emit `link` with `{ entryType: 'project', projectId }`

  Only project linking is exposed here — bills are surfaced read-only in
  the tab once their project is linked. The link payload always carries
  an `entryType` so the parent's POST handler can route project vs bill
  identically.

  All API calls are wrapped in best-effort try/catch so a transient
  Cospend failure surfaces a user-visible inline error rather than a
  modal crash. The modal stays open across errors so the user can retry
  without losing context.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnCospendPicker/` (NcDialog-based; matches the
  photos/collectives/deck picker pattern).

  ADR-019: drives the `cospend` integration leaf's "link existing"
  surface; emits `link` so the parent (CnCospendTab) can POST the
  selection to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		data-testid="cn-cospend-picker"
		@closing="onClose">
		<div class="cn-cospend-picker">
			<NcNoteCard v-if="error" type="error" class="cn-cospend-picker__error">
				{{ error }}
			</NcNoteCard>

			<NcTextField
				v-model="search"
				:label="t('nextcloud-vue', 'Search projects')"
				:placeholder="t('nextcloud-vue', 'Type to filter…')"
				class="cn-cospend-picker__search"
				@update:model-value="onSearch" />

			<NcLoadingIcon v-if="loading" />
			<NcEmptyContent
				v-else-if="visibleProjects.length === 0"
				:name="t('nextcloud-vue', 'No projects available')"
				:description="t('nextcloud-vue', 'Create a project in NC Costs first, or use the create dialog.')" />
			<ul v-else class="cn-cospend-picker__list">
				<li
					v-for="project in visibleProjects"
					:key="project.id"
					class="cn-cospend-picker__row"
					:class="{ 'cn-cospend-picker__row--selected': selectedProjectId === project.id }">
					<button type="button" class="cn-cospend-picker__row-button" @click="pickProject(project)">
						<span class="cn-cospend-picker__icon" :aria-hidden="true">
							<CurrencyEur :size="18" />
						</span>
						<span class="cn-cospend-picker__main">
							<span class="cn-cospend-picker__title">{{ project.name }}</span>
							<span v-if="project.currency" class="cn-cospend-picker__sub">
								{{ project.currency }}
							</span>
						</span>
					</button>
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="selectedProjectId === null"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link project') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCospendPicker — pick an existing Cospend project. Emits `link` with
 * `{ entryType: 'project', projectId }`.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnCospendPicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, CurrencyEur },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing project') },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			projects: [],
			search: '',
			selectedProjectId: null,
			searchTimer: null,
		}
	},

	computed: {
		/**
		 * Client-side filter on top of the server-side `?search=` payload
		 * so the user sees instant feedback even between debounce ticks.
		 *
		 * @return {Array} The filtered project rows.
		 */
		visibleProjects() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.projects
			}
			return this.projects.filter(project => (project.name || '').toLowerCase().includes(term))
		},
	},

	mounted() {
		this.fetchProjects()
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

		async fetchProjects(searchTerm = '') {
			this.loading = true
			this.error = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/cospend/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.projects = data.results || []
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'NC Costs is not installed.')
				} else {
					this.error = t('nextcloud-vue', 'Could not load projects.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnCospendPicker] fetch projects failed', err)
				this.error = t('nextcloud-vue', 'Could not load projects.')
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
				this.fetchProjects(this.search.trim())
			}, 300)
		},

		pickProject(project) {
			this.selectedProjectId = project.id
		},

		confirm() {
			if (this.selectedProjectId === null) {
				return
			}
			/**
			 * @event link Emitted when the user confirms the selection. Payload: `{ entryType, projectId }`.
			 */
			this.$emit('link', { entryType: 'project', projectId: this.selectedProjectId })
		},
	},
}
</script>

<style scoped>
.cn-cospend-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-cospend-picker__error {
	margin: 4px 0;
}

.cn-cospend-picker__search {
	width: 100%;
}

.cn-cospend-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-cospend-picker__row {
	border-radius: var(--border-radius);
}

.cn-cospend-picker__row-button {
	display: flex;
	align-items: center;
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

.cn-cospend-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-cospend-picker__row--selected .cn-cospend-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-cospend-picker__icon {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
}

.cn-cospend-picker__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-cospend-picker__title {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-cospend-picker__sub {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}
</style>
