<!--
  CnOpenProjectCreate — inline-create dialog for a fresh OpenProject work
  package linked to the parent OR object.

  OpenProject is an external integration: the work package is created in
  the remote OpenProject instance through the OpenConnector `openproject`
  source. The project list is derived from the work packages reachable
  via GET /api/integrations/openproject/available (each row carries a
  `project` label); when no projects can be discovered the user can type
  a project id directly. When the source is unconfigured the dialog
  renders a Configure-in-OpenConnector CTA (wave-5.2 4-state auth UX).

  Form fields:
    - Project (NcSelect over discovered projects, or free-text id) — required
    - Subject (NcTextField, required)
    - Type (NcTextField, optional — e.g. Task / Bug / Feature)

  On submit, emits `create` with `{ projectId, subject, type }`. The
  parent (CnOpenprojectTab) POSTs to
  `/api/objects/{register}/{schema}/{id}/openproject/new`.

  ADR-004: lives in its own .vue file under
  `src/components/CnOpenProjectCreate/` (NcDialog-based; matches the
  collectives/photos/poll create pattern).

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-openproject-create"
		@closing="onClose">
		<div v-if="unconfigured" class="cn-openproject-create">
			<NcEmptyContent
				:name="t('nextcloud-vue', 'OpenProject is not configured')"
				:description="t('nextcloud-vue', 'Add an `openproject` source in OpenConnector to start creating work packages.')">
				<template #icon>
					<Briefcase :size="32" />
				</template>
				<template #action>
					<NcButton type="primary" @click="openOpenconnectorAdmin">
						<template #icon>
							<CogOutline :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Configure OpenProject connection') }}
					</NcButton>
				</template>
			</NcEmptyContent>
		</div>
		<form v-else class="cn-openproject-create" @submit.prevent="submit">
			<NcNoteCard v-if="error" type="error" class="cn-openproject-create__error">
				{{ error }}
			</NcNoteCard>

			<NcSelect
				v-if="projectOptions.length > 0"
				v-model="project"
				:options="projectOptions"
				:placeholder="t('nextcloud-vue', 'Select a project')"
				:input-label="t('nextcloud-vue', 'Project')"
				label="label"
				class="cn-openproject-create__project"
				required />
			<NcTextField
				v-else
				v-model="projectId"
				:label="t('nextcloud-vue', 'Project id')"
				:maxlength="255"
				required />

			<NcTextField
				v-model="subject"
				:label="t('nextcloud-vue', 'Subject')"
				:maxlength="512"
				required />

			<NcTextField
				v-model="type"
				:label="t('nextcloud-vue', 'Type (optional)')"
				:placeholder="t('nextcloud-vue', 'e.g. Task, Bug, Feature')"
				:maxlength="64" />
		</form>

		<template #actions>
			<NcButton @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				v-if="!unconfigured"
				type="primary"
				:disabled="!canSubmit"
				@click="submit">
				{{ t('nextcloud-vue', 'Create work package') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnOpenProjectCreate — inline-create dialog. Emits `create` with the
 * form payload `{ projectId, subject, type }`; the parent submits to OR.
 * Handles the unconfigured external-source state with a
 * Configure-in-OpenConnector CTA.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import CogOutline from 'vue-material-design-icons/CogOutline.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnOpenProjectCreate',

	components: { NcButton, NcDialog, NcEmptyContent, NcNoteCard, NcSelect, NcTextField, Briefcase, CogOutline },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Create a new work package') },
		/** URL of the OpenConnector source admin page (for the `openproject` source). */
		openconnectorUrl: { type: String, default: '/index.php/apps/openconnector/sources/openproject' },
	},

	emits: ['close', 'create'],

	data() {
		return {
			error: '',
			unconfigured: false,
			subject: '',
			type: '',
			project: null,
			projectId: '',
			projects: [],
		}
	},

	computed: {
		projectOptions() {
			return this.projects.map(name => ({ id: name, label: name }))
		},

		/**
		 * The resolved project id from either the select or the free-text input.
		 *
		 * @return {string} The project id.
		 */
		resolvedProjectId() {
			if (this.projectOptions.length > 0) {
				return this.project ? String(this.project.id) : ''
			}
			return this.projectId.trim()
		},

		canSubmit() {
			return this.subject.trim() !== '' && this.resolvedProjectId !== ''
		},
	},

	mounted() {
		this.fetchProjects()
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

		async fetchProjects() {
			this.error = ''
			try {
				const response = await fetch(`${this.apiBase}/integrations/openproject/available`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					const seen = new Set()
					const out = []
					;(data.results || []).forEach((wp) => {
						const name = (wp.project || '').trim()
						if (name !== '' && !seen.has(name)) {
							seen.add(name)
							out.push(name)
						}
					})
					this.projects = out
				} else if (response.status === 501) {
					this.error = t('nextcloud-vue', 'OpenConnector is not installed.')
				} else if (response.status === 503 || response.status === 412 || response.status === 404) {
					this.unconfigured = true
				} else {
					this.error = t('nextcloud-vue', 'Could not load projects.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnOpenProjectCreate] fetch projects failed', err)
				this.error = t('nextcloud-vue', 'Could not load projects.')
			}
		},

		openOpenconnectorAdmin() {
			if (typeof window !== 'undefined' && this.openconnectorUrl) {
				window.open(this.openconnectorUrl, '_blank', 'noopener')
			}
		},

		submit() {
			if (!this.canSubmit) {
				return
			}
			/**
			 * @event create Emitted when the user confirms creation. Payload: `{ projectId, subject, type }`.
			 */
			this.$emit('create', {
				projectId: this.resolvedProjectId,
				subject: this.subject.trim(),
				type: this.type.trim(),
			})
		},
	},
}
</script>

<style scoped>
.cn-openproject-create {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
}

.cn-openproject-create__error {
	margin: 4px 0;
}

.cn-openproject-create__project {
	width: 100%;
}
</style>
