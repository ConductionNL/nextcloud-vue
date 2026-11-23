<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnSettingsSection
		:name="sectionName"
		:description="sectionDescription"
		data-testid="cn-action-auth-matrix">
		<NcLoadingIcon v-if="loading" :size="24" data-testid="cn-action-auth-loading" />
		<NcNoteCard v-else-if="loadError !== ''"
			type="error"
			role="alert"
			data-testid="cn-action-auth-load-error">
			{{ loadError }}
		</NcNoteCard>
		<template v-else>
			<div class="cn-action-auth-matrix__scroll">
				<table class="cn-action-auth-matrix__table">
					<caption class="hidden-visually">
						{{ sectionName }}
					</caption>
					<thead>
						<tr>
							<th scope="col">
								{{ t('nextcloud-vue', 'Action') }}
							</th>
							<th v-for="column in columns"
								:key="column.id"
								scope="col"
								class="cn-action-auth-matrix__group">
								{{ column.label }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="action in actions" :key="action">
							<th scope="row" class="cn-action-auth-matrix__action">
								{{ actionLabel(action) }}
							</th>
							<td v-for="column in columns"
								:key="`${action}-${column.id}`"
								class="cn-action-auth-matrix__cell"
								:data-testid="`cn-action-auth-cell-${action}-${column.id}`">
								<NcCheckboxRadioSwitch
									:modelValue="isAllowed(action, column.id)"
									:disabled="column.fixed || saving"
									:aria-label="t('nextcloud-vue', 'Allow group {group} to perform {action}', { group: column.label, action: actionLabel(action) })"
									@update:modelValue="toggle(action, column.id, $event)" />
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<NcNoteCard v-if="notice"
				:type="notice.type"
				:role="notice.type === 'error' ? 'alert' : 'status'"
				data-testid="cn-action-auth-notice">
				{{ notice.text }}
			</NcNoteCard>

			<div class="cn-action-auth-matrix__actions">
				<NcButton
					variant="primary"
					data-testid="cn-action-auth-save"
					:disabled="saving || !dirty"
					@click="save">
					<template v-if="saving" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Save') }}
				</NcButton>
			</div>
		</template>
	</CnSettingsSection>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'

/**
 * The allowed groups per action from an answer, for the given actions only.
 *
 * @param {object} source The `matrix` of an answer.
 * @param {Array<string>} actions The actions.
 * @return {{[key: string]: Array<string>}} A plain map, one list per action.
 */
function matrixOf(source, actions) {
	const map = source && typeof source === 'object' ? source : {}
	const next = {}
	for (const action of actions) {
		next[action] = Array.isArray(map[action]) ? map[action].filter((group) => typeof group === 'string') : []
	}
	return next
}

/**
 * CnActionAuthMatrix - the administrator's action x group rights matrix
 * (ADR-023): which Nextcloud groups may perform each action of the app.
 *
 * It reads `GET endpoint` for `{ actions, groups, matrix }` and saves the
 * whole matrix with `PUT endpoint` as `{ matrix }`, through
 * `@nextcloud/axios`, so the request token is sent. The `fixedGroups`
 * columns (default `admin`, which always passes) are drawn first, ticked and
 * locked, and are part of every saved list. `extraGroups` adds columns the
 * server cannot list as groups, such as an "every logged-in user" sentinel.
 *
 * A refused save keeps the ticks on screen and says why; success is said only
 * when the answer carries the stored matrix.
 *
 * ```vue
 * <CnActionAuthMatrix endpoint="/apps/myapp/api/admin/action-matrix" />
 * ```
 *
 * @spec openspec/changes/action-auth-matrix/specs/action-auth-matrix/spec.md
 */
export default {
	name: 'CnActionAuthMatrix',

	components: { CnSettingsSection, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard },

	inject: {
		/** The app's translate function; identity outside CnAppRoot. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The matrix endpoint: GET `{ actions, groups, matrix }`, PUT `{ matrix }`. */
		endpoint: {
			type: String,
			required: true,
		},

		/** Groups that always pass: drawn first, ticked, locked, and saved in every list. */
		fixedGroups: {
			type: Array,
			default: () => ['admin'],
		},

		/** Columns that are not Nextcloud groups, as `[{ id, label }]`, drawn after the fixed ones. */
		extraGroups: {
			type: Array,
			default: () => [],
		},

		/** Labels for actions, `{ <action>: label }`, through the app's translate function. */
		actionLabels: {
			type: Object,
			default: () => ({}),
		},

		/** Labels for groups, `{ <group id>: label }`, through the app's translate function. */
		groupLabels: {
			type: Object,
			default: () => ({}),
		},

		/** The section title. Defaults to "Action authorization". */
		name: {
			type: String,
			default: '',
		},

		/** The line under the title. Defaults to a sentence on how the matrix works. */
		description: {
			type: String,
			default: '',
		},
	},

	emits: ['saved'],

	data() {
		return {
			loading: true,
			saving: false,
			loadError: '',
			notice: null,
			actions: [],
			groups: [],
			matrix: {},
			baseline: '{}',
		}
	},

	computed: {
		/** @return {string} The section title. */
		sectionName() {
			return this.name ? this.cnTranslate(this.name) : t('nextcloud-vue', 'Action authorization')
		},

		/** @return {string} The line under the title. */
		sectionDescription() {
			return this.description
				? this.cnTranslate(this.description)
				: t('nextcloud-vue', 'Choose which groups may perform each action. Administrators always may. An action without a ticked group is for administrators only.')
		},

		/** @return {Array<{id: string, label: string, fixed: boolean}>} The columns, fixed first. */
		columns() {
			const fixed = this.fixedGroups.map((id) => ({ id, label: this.groupLabel(id), fixed: true }))
			const extra = this.extraGroups
				.filter((group) => group && typeof group.id === 'string' && !this.fixedGroups.includes(group.id))
				.map((group) => ({ id: group.id, label: group.label ? this.cnTranslate(group.label) : group.id, fixed: false }))
			const taken = new Set([...fixed, ...extra].map((column) => column.id))
			const rest = this.groups
				.filter((id) => !taken.has(id))
				.map((id) => ({ id, label: this.groupLabel(id), fixed: false }))
			return [...fixed, ...extra, ...rest]
		},

		/** @return {boolean} Whether a tick changed since the last read or save. */
		dirty() {
			return JSON.stringify(this.payload()) !== this.baseline
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * A group's label.
		 *
		 * @param {string} id The group id.
		 * @return {string}
		 */
		groupLabel(id) {
			return this.groupLabels[id] ? this.cnTranslate(this.groupLabels[id]) : id
		},

		/**
		 * An action's label.
		 *
		 * @param {string} action The action.
		 * @return {string}
		 */
		actionLabel(action) {
			return this.actionLabels[action] ? this.cnTranslate(this.actionLabels[action]) : action
		},

		/**
		 * Whether a group may perform an action; a fixed group always may.
		 *
		 * @param {string} action The action.
		 * @param {string} group The group id.
		 * @return {boolean}
		 */
		isAllowed(action, group) {
			if (this.fixedGroups.includes(group)) {
				return true
			}
			return (this.matrix[action] || []).includes(group)
		},

		/**
		 * Tick or untick one cell; a fixed group is never changed.
		 *
		 * @param {string} action The action.
		 * @param {string} group The group id.
		 * @param {boolean} allowed The new state.
		 * @return {void}
		 */
		toggle(action, group, allowed) {
			if (this.fixedGroups.includes(group)) {
				return
			}
			const current = (this.matrix[action] || []).filter((id) => id !== group)
			this.matrix = { ...this.matrix, [action]: allowed === true ? [...current, group] : current }
			this.notice = null
		},

		/**
		 * The matrix as saved: the fixed groups, then the ticked ones, per action.
		 *
		 * @return {{[key: string]: Array<string>}}
		 */
		payload() {
			const out = {}
			for (const action of this.actions) {
				const ticked = (this.matrix[action] || []).filter((id) => !this.fixedGroups.includes(id))
				out[action] = [...this.fixedGroups, ...ticked]
			}
			return out
		},

		/**
		 * Read the actions, groups and matrix.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.loadError = ''
			try {
				const { data } = await axios.get(prefixUrl(this.endpoint))
				this.actions = Array.isArray(data?.actions) ? data.actions.filter((action) => typeof action === 'string') : []
				this.groups = Array.isArray(data?.groups) ? data.groups.filter((group) => typeof group === 'string') : []
				this.matrix = matrixOf(data?.matrix, this.actions)
				this.baseline = JSON.stringify(this.payload())
			} catch (error) {
				this.loadError = t('nextcloud-vue', 'The action matrix could not be loaded: {reason}', { reason: serverErrorMessage(error) })
			} finally {
				this.loading = false
			}
		},

		/**
		 * Save the whole matrix; on a refusal keep the ticks and say why.
		 *
		 * @return {Promise<void>}
		 */
		async save() {
			this.saving = true
			this.notice = null
			const sent = this.payload()
			try {
				const { data } = await axios.put(prefixUrl(this.endpoint), { matrix: sent })
				if (!data || typeof data.matrix !== 'object' || data.matrix === null) {
					this.notice = { type: 'error', text: t('nextcloud-vue', 'The server did not confirm the action matrix. Nothing was saved.') }
					return
				}
				this.matrix = matrixOf(data.matrix, this.actions)
				this.baseline = JSON.stringify(this.payload())
				this.notice = { type: 'success', text: t('nextcloud-vue', 'The action matrix is saved.') }
				/**
				 * @event saved The server stored the matrix. Payload: the stored matrix.
				 */
				this.$emit('saved', data.matrix)
			} catch (error) {
				this.notice = { type: 'error', text: t('nextcloud-vue', 'The action matrix was not saved: {reason}', { reason: serverErrorMessage(error) }) }
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-action-auth-matrix__scroll {
	overflow-x: auto;
	margin-bottom: 12px;
}

.cn-action-auth-matrix__table {
	border-collapse: collapse;
	width: 100%;
}

.cn-action-auth-matrix__table th,
.cn-action-auth-matrix__table td {
	border: 1px solid var(--color-border);
	padding: 6px 10px;
	text-align: start;
}

.cn-action-auth-matrix__group {
	white-space: nowrap;
}

.cn-action-auth-matrix__action {
	font-weight: normal;
	white-space: nowrap;
}

.cn-action-auth-matrix__cell {
	text-align: center;
}

.cn-action-auth-matrix__actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 12px;
}
</style>
