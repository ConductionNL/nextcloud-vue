<!--
  CnFlowSidebar — the controls half of the flow editor.

  Nextcloud's own app sidebar (NcAppSidebar), with the flow's version and
  publish controls in its HEADER and three tabs under it: Steps (the palette),
  Runs (history and per-step traces), Flow (the flow's own settings). Save /
  Run / Check live on CnFlowDetail's toolbar, and every message the editor has
  to give lands in the canvas message area beside the graph. The actions and
  the messages that concern the graph live on the graph. The two halves render
  in different parts of the tree, so they share `useFlowStore`.

  Publish state is a property of the FLOW, so it sits in the header and stays
  visible with Runs or Flow open. It used to live inside the Steps tab and
  vanish the moment the author looked at a run.

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
		<!--
			VERSION AND PUBLISH BELONG TO THE FLOW, NOT TO A TAB.

			They used to sit inside the Steps tab, above the palette, and
			disappeared the moment the author opened Runs or Flow — while
			remaining true the whole time. Publish state is a property of the
			flow, so it lives in the flow's header and stays visible whichever
			tab is open.

			NcAppSidebar's `description` slot renders directly under the name
			and subname, above the tab strip. The embedded variant (a dialog,
			no NcAppSidebar) renders the same block itself, below.
		-->
		<template v-if="!embedded" #description>
			<div class="cn-flow-sidebar__header">
				<CnFlowLifecycleControls />
			</div>
		</template>

		<div v-if="embedded" class="cn-flow-sidebar__header">
			<CnFlowLifecycleControls />
		</div>

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
				NO MESSAGE CARDS HERE ANY MORE.

				A refused save, a lifecycle refusal, unsaved changes, a flow that
				can never finish and an unreadable catalogue all render in the
				canvas message area (CnFlowCanvasMessages) beside the graph they
				are about. The refusal for adding a step to a published flow used
				to open this tab, above a scrolling palette, on the other side of
				the screen from the click that caused it — and was missed
				completely. Repeating any of them here would put the same
				sentence in two places and make neither authoritative.

				THE SELECTED STEP HAS NO BLOCK HERE EITHER. Clicking a step opens
				an action menu at the step with Edit, Copy and Delete. A second
				set of the same buttons, further away, is the thing that menu
				replaced.
			-->

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
				<!--
					Why the list is empty, AT the list. One short line, because
					the diagnosis (the catalogue could not be read, and no step
					can be added at all) is a standing condition of the flow and
					renders on the canvas with every other message. A palette
					that simply draws nothing reads as a broken component.
				-->
				<p v-else-if="!store.nodeCatalog.length" class="cn-flow-sidebar__hint">
					{{ t('nextcloud-vue', 'No steps are available to add.') }}
				</p>
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

					<!-- Replay BESIDE the step list, not instead of it: the
					     list stays what it is for reading, the replay plays the
					     same stored log through the canvas animator. Only on a
					     FINISHED run — a run still going is watched live. -->
					<NcButton v-if="canReplay"
						variant="secondary"
						data-testid="flow-replay"
						@click="store.requestReplay()">
						<template #icon>
							<Replay :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Replay on the canvas') }}
					</NcButton>

					<p v-if="!store.steps.length" class="cn-flow-sidebar__hint">
						{{ t('nextcloud-vue', 'This run recorded no steps.') }}
					</p>
					<ol v-else>
						<li v-for="(step, i) in store.steps" :key="i">
							<strong>{{ step.transition }}</strong>
							<span class="cn-flow-sidebar__hint"> · {{ step.status }}</span>
							<span v-if="step.error" class="cn-flow-sidebar__error"> · {{ step.error }}</span>

							<!-- What this step TOUCHED, under the step that did it.
							     A step that wrote nothing is still listed above —
							     it ran, and omitting it would read as though it
							     had not. -->
							<ul v-if="objectsForStep(step).length" class="cn-flow-sidebar__touched">
								<li v-for="obj in objectsForStep(step)" :key="obj.auditUuid">
									<span class="cn-flow-sidebar__touched-action">{{ obj.action }}</span>
									<span class="cn-flow-sidebar__touched-uuid">{{ obj.objectUuid }}</span>
								</li>
							</ul>
						</li>
					</ol>

					<!-- Anything the run touched that no step in the list claims.
					     It should normally be empty; when it is not, the run
					     changed something the step history cannot explain, and
					     hiding that would be the opposite of what this is for. -->
					<div v-if="unclaimedObjects.length" class="cn-flow-sidebar__touched-extra">
						<h5>{{ t('nextcloud-vue', 'Also changed by this run') }}</h5>
						<ul class="cn-flow-sidebar__touched">
							<li v-for="obj in unclaimedObjects" :key="obj.auditUuid">
								<span class="cn-flow-sidebar__touched-action">{{ obj.action }}</span>
								<span class="cn-flow-sidebar__touched-uuid">{{ obj.objectUuid }}</span>
								<span class="cn-flow-sidebar__hint"> · {{ obj.node }}</span>
							</li>
						</ul>
					</div>

					<p v-if="!flatObjects.length" class="cn-flow-sidebar__hint">
						{{ t('nextcloud-vue', 'This run changed no objects.') }}
					</p>
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
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import History from 'vue-material-design-icons/History.vue'
import Replay from 'vue-material-design-icons/Replay.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import { FLOW_RUN_ACTIVE_STATUSES, useFlowStore } from '../../composables/useFlowStore.js'
import CnFlowLifecycleControls from './CnFlowLifecycleControls.vue'

export default {
	name: 'CnFlowSidebar',

	components: {
		CnFlowLifecycleControls,
		Cog,
		History,
		NcAppSidebar,
		NcAppSidebarTab,
		NcButton,
		NcCheckboxRadioSwitch,
		NcSelect,
		NcTextField,
		Replay,
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
		 * The run being inspected, from the loaded history.
		 *
		 * @return {object|null} Its list entry, or null.
		 */
		inspectedRun() {
			return this.store.runs.find((run) => run.uuid === this.store.inspectedRunUuid) || null
		},

		/**
		 * Whether the inspected run can be replayed on the canvas.
		 *
		 * Only a FINISHED run with a recorded log: a run still in the
		 * engine's active set is watched live rather than replayed, and a
		 * log-less run has nothing to play.
		 *
		 * @return {boolean} True when Replay is offered.
		 */
		canReplay() {
			if (this.store.steps.length === 0) {
				return false
			}

			const status = this.inspectedRun?.status
			return status !== undefined && FLOW_RUN_ACTIVE_STATUSES.includes(status) === false
		},

		/**
		 * @return {Array<object>} Every object the inspected run touched, flattened.
		 */
		flatObjects() {
			return (this.store.runObjects || []).flatMap((group) => group.objects || [])
		},

		/**
		 * Objects whose node matches no step in the run's own history.
		 *
		 * Normally empty. When it is not, the run changed something its step
		 * history cannot account for, and that is precisely the case worth
		 * showing rather than quietly dropping — the alternative is a panel
		 * that under-reports what a run did and looks complete doing it.
		 *
		 * @return {Array<object>} The unaccounted-for objects, each carrying its node.
		 */
		unclaimedObjects() {
			const stepNodes = new Set(
				(this.store.steps || []).map((step) => String(step.transition || '')),
			)

			return (this.store.runObjects || [])
				.filter((group) => !stepNodes.has(String(group.node || '')))
				.flatMap((group) => (group.objects || []).map((obj) => ({
					...obj,
					node: group.node,
				})))
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
		 * The objects touched by the node this step ran.
		 *
		 * ⚠️ Matched on the NODE, not on the individual visit. A run that loops
		 * visits the same node more than once, and every visit's objects appear
		 * under each of them. Each object carries its own `step`, so the rows
		 * are still individually attributable — the grouping is what is coarse,
		 * not the data. Narrowing it needs the step's own sequence number, which
		 * the run log does not carry (a step's position in the log is its
		 * index, and the log is per-segment).
		 *
		 * @param {object} step A step from the run's history.
		 * @return {Array<object>} The objects that node wrote during this run.
		 */
		objectsForStep(step) {
			const node = String(step?.transition || '')
			if (!node) {
				return []
			}

			return (this.store.runObjects || [])
				.filter((group) => String(group.node || '') === node)
				.flatMap((group) => group.objects || [])
		},

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

.cn-flow-sidebar__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 0 0 8px;
}

.cn-flow-sidebar__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

/* Version, status and Publish, in the header rather than in a tab. Below the
   flow's name in NcAppSidebar's `description` slot, and above the tab strip in
   the embedded variant, so both hosts read the same way. */
.cn-flow-sidebar__header {
	padding-block-end: 8px;
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

/* The objects a step touched, indented under it. Muted and monospaced: this is
   reference detail somebody scans for one uuid, not prose. */
.cn-flow-sidebar__touched {
	margin: 2px 0 6px 0;
	padding-inline-start: 14px;
	list-style: none;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-sidebar__touched li {
	display: flex;
	gap: 6px;
	align-items: baseline;
}

.cn-flow-sidebar__touched-action {
	flex: 0 0 auto;
	color: var(--color-main-text);
}

/* Breaks anywhere: a uuid has no spaces and would otherwise push the sidebar
   wider than its column. */
.cn-flow-sidebar__touched-uuid {
	font-family: var(--font-face-monospace, monospace);
	overflow-wrap: anywhere;
}

.cn-flow-sidebar__touched-extra {
	margin-block-start: 8px;
}
</style>
