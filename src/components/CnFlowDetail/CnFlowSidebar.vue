<!--
  CnFlowSidebar — the controls half of the flow editor.

  Nextcloud's own app sidebar (NcAppSidebar), with three tabs: Steps (the
  palette and the selected step), Runs (history and per-step traces), Flow
  (the flow's own settings). Save / Run / Check live on CnFlowDetail's
  toolbar — the actions that concern the graph live on the graph. The two
  halves render in different parts of the tree, so they share `useFlowStore`.

  Closing the sidebar sets `store.sidebarOpen = false`; the canvas toolbar
  offers the re-open button, because a control to bring the sidebar back
  cannot live in the sidebar.

  THE PALETTE IS THE ENGINE'S CATALOGUE, AND NOTHING ELSE. A builder that offers
  a step the engine has never heard of produces a flow that cannot run, which is
  precisely what the component this was ported from did: it drew its palette
  from the catalogue and then matched bare, un-namespaced ids everywhere else.
  An empty palette here means the catalogue could not be read — a visible,
  diagnosable state — never a hard-coded fallback list that might disagree with
  the engine. While the catalogue is still LOADING the palette says so: an
  in-flight request and a failed one are different states.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<!-- `embedded` (CnFlowEditModal) renders the same tabs without
	     NcAppSidebar, whose app-layout positioning has no meaning inside a
	     dialog. -->
	<component :is="embedded ? 'div' : 'NcAppSidebar'"
		v-if="store.sidebarOpen"
		:class="embedded ? 'cn-flow-sidebar cn-flow-sidebar--embedded' : 'cn-flow-sidebar'"
		:name="embedded ? undefined : sidebarName"
		:subname="embedded ? undefined : sidebarSubname"
		@close="onClose">
		<div v-if="embedded" class="cn-flow-sidebar__tabs" role="tablist">
			<button v-for="entry in tabs"
				:key="entry.id"
				class="cn-flow-sidebar__tab"
				:class="{ 'cn-flow-sidebar__tab--active': tab === entry.id }"
				role="tab"
				:aria-selected="tab === entry.id ? 'true' : 'false'"
				@click="tab = entry.id">
				{{ entry.label }}
			</button>
		</div>

		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-show="embedded ? tab === 'nodes' : true"
			:id="embedded ? undefined : 'flow-steps'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Steps')"
			:order="embedded ? undefined : 1">
			<template v-if="!embedded" #icon>
				<Sitemap :size="20" />
			</template>

			<!--
				The server's reason for refusing a save or a run.

				`store.error` was set on every failure and rendered NOWHERE, so a
				refused save looked exactly like a save that worked (#607).
			-->
			<NcNoteCard v-if="store.error" type="error" class="cn-flow-sidebar__failure">
				{{ errorText }}
			</NcNoteCard>

			<section v-if="store.selectedNode" class="cn-flow-sidebar__section">
				<h4>{{ t('nextcloud-vue', 'Selected step') }}</h4>
				<p class="cn-flow-sidebar__selected-name">
					{{ selectedLabel }}
				</p>
				<p v-if="selectedEntry && selectedEntry.description" class="cn-flow-sidebar__hint">
					{{ selectedEntry.description }}
				</p>
				<div class="cn-flow-sidebar__selected-actions">
					<NcButton variant="primary" @click="store.editingNodeId = store.selectedNodeId">
						{{ t('nextcloud-vue', 'Edit step…') }}
					</NcButton>
					<NcButton variant="tertiary" @click="store.removeNode(store.selectedNode.id)">
						{{ t('nextcloud-vue', 'Remove step') }}
					</NcButton>
				</div>
			</section>

			<section class="cn-flow-sidebar__section">
				<h4>{{ t('nextcloud-vue', 'Steps') }}</h4>

				<NcTextField :model-value="paletteSearch"
					:label="t('nextcloud-vue', 'Search steps')"
					trailing-button-icon="close"
					:show-trailing-button="paletteSearch !== ''"
					@trailing-button-click="paletteSearch = ''"
					@update:model-value="paletteSearch = $event" />

				<NcSelect :model-value="roleFilterOption"
					:options="roleFilterOptions"
					:input-label="t('nextcloud-vue', 'Type')"
					:clearable="false"
					@update:model-value="roleFilter = $event ? $event.id : null" />

				<p v-if="store.catalogLoading && !store.nodeCatalog.length" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'Loading the available steps…') }}
				</p>
				<NcNoteCard v-else-if="!store.nodeCatalog.length" type="warning">
					{{ t('nextcloud-vue', 'The list of available steps could not be read, so no steps can be added. This does not mean the instance has none.') }}
				</NcNoteCard>
				<p v-else-if="!paletteEntries.length" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'No step matches this search.') }}
				</p>
				<ul v-else class="cn-flow-sidebar__palette">
					<li v-for="entry in paletteEntries"
						:key="entry.id"
						class="cn-flow-sidebar__palette-item"
						draggable="true"
						:title="entry.description"
						@dragstart="store.paletteDragType = entry.id"
						@dragend="store.paletteDragType = null"
						@click="store.addNode(entry.id)">
						<span class="cn-flow-sidebar__palette-head">
							<span class="cn-flow-sidebar__palette-name">{{ entry.displayName || entry.id }}</span>
							<span class="cn-flow-sidebar__palette-role"
								:class="`cn-flow-sidebar__palette-role--${entry.role}`">
								{{ roleWord(entry.role) }}
							</span>
						</span>
						<span v-if="entry.description" class="cn-flow-sidebar__palette-description">{{ entry.description }}</span>
						<span class="cn-flow-sidebar__palette-id">{{ entry.id }}</span>
					</li>
				</ul>
			</section>
		</component>

		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-show="embedded ? tab === 'runs' : true"
			:id="embedded ? undefined : 'flow-runs'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Runs')"
			:order="embedded ? undefined : 2">
			<template v-if="!embedded" #icon>
				<History :size="20" />
			</template>

			<section class="cn-flow-sidebar__section">
				<h4>{{ t('nextcloud-vue', 'Runs') }}</h4>

				<p v-if="!store.flow.id" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'Save the flow first — an unsaved flow has never run.') }}
				</p>
				<p v-else-if="!store.runs.length" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'This flow has never run.') }}
				</p>
				<ul v-else class="cn-flow-sidebar__runs">
					<li v-for="run in store.runs" :key="run.uuid">
						<button class="cn-flow-sidebar__run" @click="store.inspectRun(run.uuid)">
							<span :class="`cn-flow-sidebar__status cn-flow-sidebar__status--${run.status}`">{{ run.status }}</span>
							<span>{{ run.created }}</span>
						</button>
					</li>
				</ul>

				<div v-if="store.inspectedRunUuid" class="cn-flow-sidebar__steps">
					<h5>{{ t('nextcloud-vue', 'Steps') }}</h5>
					<p v-if="!store.steps.length" class="cn-flow-sidebar__hint">
						{{ t('nextcloud-vue', 'This run recorded no steps.') }}
					</p>
					<ol v-else>
						<li v-for="(step, i) in store.steps" :key="i">
							<strong>{{ step.transition }}</strong>
							<span class="cn-flow-sidebar__hint"> · {{ step.status }}</span>
							<span v-if="step.error" class="cn-flow-sidebar__error"> · {{ step.error }}</span>
						</li>
					</ol>
				</div>
			</section>
		</component>

		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-show="embedded ? tab === 'flow' : true"
			:id="embedded ? undefined : 'flow-settings'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Flow')"
			:order="embedded ? undefined : 3">
			<template v-if="!embedded" #icon>
				<Cog :size="20" />
			</template>

			<NcNoteCard v-if="store.dirty" type="warning">
				{{ t('nextcloud-vue', 'This flow has unsaved changes.') }}
			</NcNoteCard>

			<NcNoteCard v-if="missingEndsMessage" type="error">
				{{ missingEndsMessage }}
			</NcNoteCard>

			<section class="cn-flow-sidebar__section">
				<h4>{{ t('nextcloud-vue', 'Flow') }}</h4>

				<NcTextField :model-value="store.flow.name"
					:label="t('nextcloud-vue', 'Name')"
					@update:model-value="store.setFlowField('name', $event)" />

				<NcTextField :model-value="store.flow.description || ''"
					:label="t('nextcloud-vue', 'Description')"
					@update:model-value="store.setFlowField('description', $event)" />

				<NcSelect :model-value="triggerOption"
					:options="triggerOptions"
					:input-label="t('nextcloud-vue', 'Trigger')"
					:clearable="false"
					@update:model-value="onTrigger" />

				<NcTextField v-if="store.flow.trigger === 'schedule'"
					:model-value="store.flow.cron || ''"
					:label="t('nextcloud-vue', 'Cron schedule')"
					:helper-text="t('nextcloud-vue', 'For example 0 9 * * 1 — 09:00 every Monday.')"
					@update:model-value="store.setFlowField('cron', $event)" />

				<NcTextField :model-value="store.flow.triggerRegister || ''"
					:label="t('nextcloud-vue', 'Restrict to register')"
					:helper-text="t('nextcloud-vue', 'Leave empty for any register.')"
					@update:model-value="store.setFlowField('triggerRegister', $event)" />

				<NcTextField :model-value="store.flow.triggerSchema || ''"
					:label="t('nextcloud-vue', 'Restrict to schema')"
					:helper-text="t('nextcloud-vue', 'Leave empty for any schema.')"
					@update:model-value="store.setFlowField('triggerSchema', $event)" />

				<NcCheckboxRadioSwitch :model-value="store.flow.enabled === true"
					type="switch"
					@update:model-value="store.setFlowField('enabled', $event)">
					{{ t('nextcloud-vue', 'Enabled') }}
				</NcCheckboxRadioSwitch>

				<NcNoteCard v-if="store.flow.enabled && !store.flow.owner" type="warning">
					{{ t('nextcloud-vue', 'This flow has no owner yet, so a trigger will not start it. Saving it makes you its owner.') }}
				</NcNoteCard>
			</section>
		</component>
	</component>
</template>

<script>
import {
	NcAppSidebar,
	NcAppSidebarTab,
	NcButton,
	NcCheckboxRadioSwitch,
	NcNoteCard,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import History from 'vue-material-design-icons/History.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowSidebar',

	components: {
		Cog,
		History,
		NcAppSidebar,
		NcAppSidebarTab,
		NcButton,
		NcCheckboxRadioSwitch,
		NcNoteCard,
		NcSelect,
		NcTextField,
		Sitemap,
	},

	props: {
		/**
		 * Render the tabs without NcAppSidebar chrome. For hosts that are not
		 * the app layout — CnFlowEditModal renders the sidebar inside a
		 * dialog, where NcAppSidebar's positioning has no meaning.
		 */
		embedded: {
			type: Boolean,
			default: false,
		},
	},

	/**
	 * Deprecated: Save and Run moved to CnFlowDetail's toolbar, which emits
	 * these events from the canvas host instead. Declared so an existing
	 * consumer's listeners stay valid; nothing here fires them any more.
	 */
	emits: ['save', 'run'],

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return {
			tab: 'nodes',

			paletteSearch: '',
			roleFilter: null,
		}
	},

	computed: {
		/**
		 * @return {string} The sidebar header: the flow's name.
		 */
		sidebarName() {
			return this.store.flow.name || this.t('nextcloud-vue', 'Flow')
		},

		/**
		 * @return {string} The header's second line: how this flow starts.
		 */
		sidebarSubname() {
			const trigger = this.store.flow.trigger
			if (trigger === 'schedule' && this.store.flow.cron) {
				return `${this.t('nextcloud-vue', 'On a schedule')} · ${this.store.flow.cron}`
			}

			return trigger || ''
		},

		/**
		 * @return {Array<object>} The tab strip, for the embedded variant.
		 */
		tabs() {
			return [
				{ id: 'nodes', label: this.t('nextcloud-vue', 'Steps') },
				{ id: 'runs', label: this.t('nextcloud-vue', 'Runs') },
				{ id: 'flow', label: this.t('nextcloud-vue', 'Flow') },
			]
		},

		/**
		 * @return {object|null} The catalogue entry of the selected node.
		 */
		selectedEntry() {
			return this.store.selectedNode
				? this.store.catalogEntry(this.store.selectedNode.type)
				: null
		},

		/**
		 * @return {string} The selected step's headline: name, or type label.
		 */
		selectedLabel() {
			const node = this.store.selectedNode
			if (!node) {
				return ''
			}

			return node.name
				|| (this.selectedEntry && (this.selectedEntry.displayName || this.selectedEntry.id))
				|| node.type
		},

		/**
		 * The catalogue, searched and filtered, triggers first.
		 *
		 * @return {Array<object>} The entries to offer.
		 */
		paletteEntries() {
			const rank = { trigger: 0, step: 1, end: 2 }
			const needle = this.paletteSearch.trim().toLowerCase()

			return this.store.nodeCatalog
				.map((entry) => ({ ...entry, role: this.store.roleOfNodeType(entry.id) }))
				.filter((entry) => !this.roleFilter || entry.role === this.roleFilter)
				.filter((entry) => {
					if (!needle) {
						return true
					}

					return `${entry.id} ${entry.displayName || ''} ${entry.description || ''}`
						.toLowerCase()
						.includes(needle)
				})
				// Stable: equal roles keep the catalogue's own order.
				.map((entry, index) => ({ entry, index }))
				.sort((a, b) => ((rank[a.entry.role] ?? 1) - (rank[b.entry.role] ?? 1)) || (a.index - b.index))
				.map(({ entry }) => entry)
		},

		/**
		 * @return {Array<object>} The role filter's options.
		 */
		roleFilterOptions() {
			return [
				{ id: null, label: this.t('nextcloud-vue', 'All types') },
				{ id: 'trigger', label: this.t('nextcloud-vue', 'Triggers') },
				{ id: 'step', label: this.t('nextcloud-vue', 'Steps') },
				{ id: 'end', label: this.t('nextcloud-vue', 'End') },
			]
		},

		/**
		 * @return {object} The selected role filter option.
		 */
		roleFilterOption() {
			return this.roleFilterOptions.find((o) => o.id === this.roleFilter) || this.roleFilterOptions[0]
		},

		/**
		 * What stops this flow from finishing, as one readable sentence.
		 *
		 * @return {string|null} The message, or null when nothing is missing.
		 */
		missingEndsMessage() {
			const missing = this.store.missingEnds
			if (missing.trigger && missing.end) {
				return this.t('nextcloud-vue', 'This flow has no trigger and no end step, so it cannot start or finish.')
			}
			if (missing.trigger) {
				return this.t('nextcloud-vue', 'This flow has no trigger, so nothing will start it.')
			}
			if (missing.end) {
				return this.t('nextcloud-vue', 'This flow has no end step, so a run can never finish.')
			}

			return null
		},

		/**
		 * What to show the user when a save or a run was refused.
		 *
		 * Prefers the API's own `error` field, because that is the sentence
		 * written for a person — "A flow needs a name." says what to do, where
		 * "Request failed with status code 400" does not.
		 *
		 * @return {string} The message.
		 */
		errorText() {
			const error = this.store.error
			if (!error) {
				return ''
			}

			return error?.response?.data?.error
				|| error?.response?.data?.message
				|| error?.message
				|| this.t('nextcloud-vue', 'The last action failed.')
		},

		/**
		 * @return {Array<object>} The trigger options, from the event catalogue.
		 */
		triggerOptions() {
			const fromCatalog = this.store.eventCatalog.map((e) => ({ id: e.id, label: e.label || e.id }))

			// `manual` and `schedule` are engine-level triggers rather than
			// dispatched events, so the event catalogue does not carry them.
			return [
				{ id: 'manual', label: this.t('nextcloud-vue', 'Manually only') },
				{ id: 'schedule', label: this.t('nextcloud-vue', 'On a schedule') },
				...fromCatalog,
			]
		},

		/**
		 * @return {object} The currently selected trigger option.
		 */
		triggerOption() {
			const current = this.store.flow.trigger
			return this.triggerOptions.find((o) => o.id === current) || { id: current, label: current }
		},
	},

	methods: {
		/**
		 * A role id as the word the palette badge shows.
		 *
		 * @param {string} role The catalogue role.
		 * @return {string} The word.
		 */
		roleWord(role) {
			if (role === 'trigger') {
				return this.t('nextcloud-vue', 'Trigger')
			}
			if (role === 'end') {
				return this.t('nextcloud-vue', 'End')
			}

			return this.t('nextcloud-vue', 'Step')
		},

		/**
		 * Hide the sidebar. The canvas toolbar offers the way back.
		 *
		 * @return {void}
		 */
		onClose() {
			this.store.sidebarOpen = false
		},

		/**
		 * @param {object} option The chosen trigger option.
		 * @return {void}
		 */
		onTrigger(option) {
			this.store.setFlowField('trigger', option ? option.id : 'manual')
		},
	},
}
</script>

<style scoped>
.cn-flow-sidebar--embedded {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 8px 12px;
}

.cn-flow-sidebar__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

.cn-flow-sidebar__tabs {
	display: flex;
	gap: 4px;
	border-block-end: 1px solid var(--color-border);
}

.cn-flow-sidebar__tab {
	flex: 1 1 0;
	padding: 8px 4px;
	border: none;
	border-block-end: 2px solid transparent;
	background: none;
	color: var(--color-text-maxcontrast);
	font-weight: 600;
	cursor: pointer;
}

.cn-flow-sidebar__tab:hover {
	background: var(--color-background-hover);
}

.cn-flow-sidebar__tab--active {
	color: var(--color-main-text);
	border-block-end-color: var(--color-primary-element);
}

.cn-flow-sidebar__selected-name {
	font-weight: 600;
}

.cn-flow-sidebar__selected-actions {
	display: flex;
	gap: 8px;
}

.cn-flow-sidebar__palette {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-flow-sidebar__palette-item {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: grab;
}

.cn-flow-sidebar__palette-item:hover {
	background: var(--color-background-hover);
}

.cn-flow-sidebar__palette-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}

.cn-flow-sidebar__palette-name {
	font-weight: 600;
}

.cn-flow-sidebar__palette-role {
	font-size: 0.75em;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-sidebar__palette-role--trigger {
	color: var(--color-success-text);
}

.cn-flow-sidebar__palette-role--end {
	color: var(--color-error-text);
}

.cn-flow-sidebar__palette-description {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.cn-flow-sidebar__palette-id,
.cn-flow-sidebar__hint {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-sidebar__error {
	color: var(--color-error-text);
}

.cn-flow-sidebar__run {
	display: flex;
	gap: 8px;
	inline-size: 100%;
	padding: 4px 6px;
	border: none;
	background: none;
	text-align: start;
	cursor: pointer;
}

.cn-flow-sidebar__run:hover {
	background: var(--color-background-hover);
}

.cn-flow-sidebar__status--failed {
	color: var(--color-error-text);
}

.cn-flow-sidebar__status--completed {
	color: var(--color-success-text);
}
</style>
