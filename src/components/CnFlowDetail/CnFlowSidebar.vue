<!--
  CnFlowSidebar — the controls half of the flow editor.

  Nextcloud's own app sidebar (NcAppSidebar), with the flow's identity in its
  HEADER and its RUNS under it. Save / Run / Check / Add a step live on
  CnFlowDetail's toolbar, and every message the editor has to give lands in the
  canvas message area beside the graph.

  ⚠️ THE PALETTE IS NOT HERE ANY MORE. A live instance serves SIXTY-FIVE step
  types, and a one-per-row list that long in a 300px column is a scroll rather
  than a chooser. It is `CnFlowStepPickerModal`, opened from the toolbar, where
  the same entries render as a grid. With it went the Steps tab, and with that
  the tab strip: one tab is chrome around nothing. The actions and
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
		:name="embedded ? undefined : flowName"
		:active="embedded ? undefined : tab"
		@update:active="tab = $event"
		@close="onClose">
		<!--
			THE FLOW'S IDENTITY, IN THE FLOW'S HEADER.

			Version and lifecycle used to sit inside the Steps tab and vanish
			the moment the author opened Runs, while remaining true the whole
			time. They are properties of the FLOW, so they belong beside its
			name.

			⚠️ NO `subname`. A small grey "manual" under the title announced the
			trigger to an author who was not about to change it from there, and
			it is edited in the settings modal with every other field.

			⚠️ THE NAME IS THE SIDEBAR'S, THE REST IS OURS. `name` is a REQUIRED
			prop, and this component used to pass none so that the version could
			sit beside the title in CnFlowLifecycleControls' own h2. NcAppSidebar
			then rendered its heading EMPTY, above ours: a heading naming
			nothing, announced as such, with a Vue warning on every mount. So the
			flow's name is handed over, the lifecycle row renders under it
			without a name of its own, and there is one heading again.
		-->
		<template v-if="!embedded" #description>
			<div class="cn-flow-sidebar__header">
				<CnFlowLifecycleControls :show-name="false" />
			</div>
		</template>

		<!--
			THE FLOW'S VERBS, top right beside the close button.

			NcAppSidebar wraps this slot in its own NcActions, so these are
			plain items. The embedded variant has no sidebar to do that and
			brings its own menu below — the ITEMS come from one computed either
			way, so the two hosts cannot offer different things.
		-->
		<template v-if="!embedded" #secondary-actions>
			<NcActionButton v-for="action in flowActions"
				:key="action.id"
				:data-testid="action.testid"
				:disabled="action.disabled"
				:closeAfterClick="true"
				@click="action.run()">
				<template #icon>
					<component :is="action.icon" :size="20" />
				</template>
				{{ action.label }}
			</NcActionButton>
		</template>

		<div v-if="embedded" class="cn-flow-sidebar__header">
			<CnFlowLifecycleControls />
			<NcActions :aria-label="t('nextcloud-vue', 'Flow actions')">
				<NcActionButton v-for="action in flowActions"
					:key="action.id"
					:data-testid="action.testid"
					:disabled="action.disabled"
					:closeAfterClick="true"
					@click="action.run()">
					<template #icon>
						<component :is="action.icon" :size="20" />
					</template>
					{{ action.label }}
				</NcActionButton>
			</NcActions>
		</div>

		<!--
			ONE STRIP AT A TIME. Reading a run REPLACES the flow's tabs rather
			than nesting under them: the run used to render inside the Runs tab
			with a strip of its own, so Steps and Runs stayed live above
			Objects, Tasks and Logs — and pressing Steps while reading a run
			swapped the panel while leaving the canvas painted with that run's
			badges, so the graph and the sidebar described different things.
		-->
		<!--
			`embedded` travels: inside a dialog there is no NcAppSidebar to
			register a tab with, so the run's panels render as plain blocks
			under a strip of their own rather than injecting into nothing.
		-->
		<CnRunDetailSidebar v-if="inRunView" :embedded="embedded" />

		<!--
			THE SIDEBAR IS THE FLOW'S RUNS. The palette moved to a modal off the
			toolbar, and with it the only other thing this sidebar showed. A tab
			strip with one tab in it is chrome around nothing, so the strip goes
			too — what is left renders directly.
		-->
		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-if="!inRunView"
			:id="embedded ? undefined : 'flow-runs'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Runs')"
			:order="embedded ? undefined : 1">
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
						<!--
							A REAL LINK, NOT A BUTTON WITH A HANDLER.

							A run is a thing an author wants open beside the flow
							while they read it, so middle-click and ctrl-click
							have to work — and only an `<a href>` gets that from
							the browser. A `router.push` on a `<button>` looks
							identical right up until somebody tries either, and
							then does nothing, with no error to explain it.

							A PLAIN click still inspects in place: `onRunClick`
							stands down for any modified click and lets the
							browser have it, so the two gestures do not fight.
						-->
						<a class="cn-flow-sidebar__run"
							:class="{ 'cn-flow-sidebar__run--open': run.uuid === store.inspectedRunUuid }"
							:href="runUrl(run.uuid)"
							:aria-current="run.uuid === store.inspectedRunUuid ? 'true' : undefined"
							data-testid="flow-run-link"
							@click="onRunLinkClick($event, run.uuid)">
							<span class="cn-flow-sidebar__run-top">
								<span :class="`cn-flow-sidebar__status cn-flow-sidebar__status--${run.status}`">{{ run.status }}</span>
								<time class="cn-flow-sidebar__run-when" :datetime="run.created">{{ run.created }}</time>
							</span>
							<span v-if="run.error" class="cn-flow-sidebar__run-error">{{ run.error }}</span>
						</a>
					</li>
				</ul>
			</section>
		</component>

		<CnFlowSettingsModal v-if="settingsOpen" @close="settingsOpen = false" />
		<CnFlowPublishDialog v-if="publishOpen" @close="publishOpen = false" />
	</component>
</template>

<script>
import { generateUrl } from '@nextcloud/router'
import {
	NcActionButton,
	NcActions,
	NcAppSidebar,
	NcAppSidebarTab,
	NcButton,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import ContentDuplicate from 'vue-material-design-icons/ContentDuplicate.vue'
import History from 'vue-material-design-icons/History.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Publish from 'vue-material-design-icons/Publish.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import CnFlowPublishDialog from '../../dialogs/CnFlowPublishDialog.vue'
import CnFlowSettingsModal from '../../dialogs/CnFlowSettingsModal.vue'
import CnFlowLifecycleControls from './CnFlowLifecycleControls.vue'
import CnRunDetailSidebar from './CnRunDetailSidebar.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowSidebar',

	components: {
		Cancel,
		CheckCircleOutline,
		CnFlowLifecycleControls,
		CnRunDetailSidebar,
		CnFlowPublishDialog,
		CnFlowSettingsModal,
		Cog,
		ContentDuplicate,
		History,
		NcActionButton,
		NcActions,
		NcAppSidebar,
		NcAppSidebarTab,
		NcButton,
		NcSelect,
		NcTextField,
		Pencil,
		Publish,
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
			// The open tab, by the SAME id NcAppSidebarTab registers under, so
			// one value drives both hosts. The embedded strip used to have ids
			// of its own (`nodes`, `runs`), which meant nothing outside this
			// component could ask for a tab and be understood by both.
			// One tab remains, and NcAppSidebar still wants to be told which is
			// active. `flow-runs` is the id that tab registers under.
			tab: 'flow-runs',

			// Which question about the inspected run is being asked.

			// Whether the flow's settings dialog is open.
			settingsOpen: false,

			// 🔴 PUBLISH ASKS FIRST. It is the one irreversible thing in this
			// menu — it deprecates the live version and locks the graph — and
			// it was a single click that also silently decided what the new
			// version would be CALLED. The dialog says both before it happens.
			publishOpen: false,

		}
	},

	computed: {

		/**
		 * The run being inspected, from the loaded history.
		 *
		 * @return {object|null} Its list entry, or null.
		 */
		inspectedRun() {
			return this.store.runs.find((run) => run.uuid === this.store.inspectedRunUuid) || null
		},

		/**
		 * What NcAppSidebar puts in its heading.
		 *
		 * The same fallback CnFlowLifecycleControls uses for the embedded host,
		 * so a flow with no name yet reads the same either way rather than
		 * leaving the sidebar's required heading empty.
		 *
		 * @return {string} The flow's name.
		 */
		flowName() {
			return this.store.flow.name || this.t('nextcloud-vue', 'Flow')
		},

		/**
		 * Whether the sidebar is showing a RUN rather than the flow.
		 *
		 * 🔑 THE STORE'S GETTER, WHICH ALSO COUNTS A RUN BEING OPENED. Reading
		 * `inspectedRunUuid` alone meant the sidebar stayed on the flow for the
		 * length of the load, so a visitor following a run link was told to
		 * "save the flow first" on a flow that had run many times, while the
		 * canvas beside it had already entered run view.
		 *
		 * @return {boolean} True while a run is open or being opened.
		 */
		inRunView() {
			return this.store.inRunView
		},

		/**
		 * The verbs that apply to the open flow, for the header's menu.
		 *
		 * ONE LIST, TWO HOSTS. NcAppSidebar wraps its `secondary-actions` slot
		 * in an NcActions of its own; the embedded variant has no sidebar and
		 * brings its own. Both render THIS, so the app layout and the dialog
		 * cannot come to offer different things.
		 *
		 * ⚠️ THE ITEMS CANNOT BE WRAPPED IN A COMPONENT OF THEIR OWN. NcActions
		 * inspects its slot children and keeps the ones that are NcAction*; a
		 * wrapper renders as one child of an unrecognised type and is dropped,
		 * silently, leaving an empty menu. So the v-for is written out in both
		 * places and only the data is shared.
		 *
		 * @return {Array<object>} The actions, in the order they are offered.
		 */
		flowActions() {
			const actions = [{
				id: 'edit',
				testid: 'flow-action-edit',
				icon: 'Pencil',
				label: this.t('nextcloud-vue', 'Edit flow'),
				disabled: false,
				run: () => {
					this.settingsOpen = true
				},
			}]

			// The label says which way the switch will GO, not which way it is
			// pointing. A menu item that always reads "Enable" tells the author
			// nothing about the state they are in.
			actions.push({
				id: 'enabled',
				testid: 'flow-toggle-enabled',
				icon: this.store.flow.enabled ? 'Cancel' : 'CheckCircleOutline',
				label: this.store.flow.enabled
					? this.t('nextcloud-vue', 'Disable')
					: this.t('nextcloud-vue', 'Enable'),
				disabled: false,
				run: () => this.store.setFlowField('enabled', !this.store.flow.enabled),
			})

			if (this.store.isDraft) {
				actions.push({
					id: 'publish',
					testid: 'flow-publish',
					icon: 'Publish',
					label: this.t('nextcloud-vue', 'Publish'),
					disabled: this.store.transitioning || !this.store.flow.id,
					run: () => {
						this.publishOpen = true
					},
				})
			}

			if (this.store.graphLocked) {
				actions.push({
					id: 'create-draft',
					testid: 'flow-create-draft',
					icon: 'ContentDuplicate',
					label: this.t('nextcloud-vue', 'Create draft version'),
					disabled: this.store.transitioning,
					run: () => this.store.createDraft(),
				})
			}

			if (this.store.isPublished) {
				actions.push({
					id: 'deprecate',
					testid: 'flow-deprecate',
					icon: 'Cancel',
					label: this.t('nextcloud-vue', 'Deprecate'),
					disabled: this.store.transitioning,
					run: () => this.store.deprecate(),
				})
			}

			return actions
		},

	},

	watch: {
		/**
		 * Follow a run that has just started.
		 *
		 * Pressing Run and being left looking at the palette is how an author
		 * concludes that nothing happened: the run appears in a tab they are
		 * not on. Only on a run STARTING — clearing the watch (the run finished,
		 * the editor tore down) must not yank anyone anywhere.
		 *
		 * @param {string|null} uuid The run now being watched.
		 * @return {void}
		 */
		'store.watchedRunUuid': function(uuid) {
			if (uuid) {
				this.tab = 'flow-runs'
			}
		},

		/**
		 * Follow a run somebody arrived at by its own URL.
		 *
		 * ⚠️ A SEPARATE WATCH FROM THE ONE ABOVE, AND IT HAS TO BE. `watchedRunUuid`
		 * is a run this editor STARTED and is polling; a deep-linked run is
		 * inspected and never watched. Switching on the watch alone left a
		 * visitor who followed a run's address looking at the palette, with the
		 * run they asked for loaded into a tab they were not on.
		 *
		 * @param {string|null} uuid The run now being inspected.
		 * @return {void}
		 */
		'store.inspectedRunUuid': function(uuid) {
			if (uuid) {
				this.tab = 'flow-runs'
			}
		},
	},

	methods: {

		/**
		 * Hide the sidebar. The canvas toolbar offers the way back.
		 *
		 * @return {void}
		 */
		onClose() {
			this.store.sidebarOpen = false
		},

		/**
		 * The address of one run.
		 *
		 * A real URL, not a router path: it is put in an `href` so the browser
		 * can open it in a tab of its own.
		 *
		 * @param {string} uuid The run uuid.
		 * @return {string} The run's own URL.
		 */
		runUrl(uuid) {
			return generateUrl(`/apps/openregister/flow-runs/${uuid}`)
		},

		/**
		 * Inspect a run in place, unless the click asked for a new tab.
		 *
		 * 🔑 THE MODIFIER CHECK IS THE WHOLE POINT OF THE `<a>`. Handling every
		 * click here would open the run in this panel AND in a new tab on a
		 * ctrl-click, which is neither of the two things the author asked for.
		 * A middle click never reaches `click` at all, so the browser has that
		 * one either way.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {string}     uuid  The run uuid.
		 * @return {void}
		 */
		onRunLinkClick(event, uuid) {
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
				return
			}

			event.preventDefault()
			this.store.inspectRun(uuid)
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

/* THE RUNS LIST IS A STACK OF CARDS. */
.cn-flow-sidebar__runs {
	display: flex;
	flex-direction: column;
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
}

/* A CARD, NOT A ROW. A run is a thing with a verdict, a time and sometimes a
   reason it failed, and a single flex row could only ever show the first two
   before the third pushed the date off the edge. The card gives the error its
   own line and the run a hit area big enough to be a target, not a text link. */
.cn-flow-sidebar__run {
	display: flex;
	flex-direction: column;
	gap: 4px;
	inline-size: 100%;
	padding: 10px 12px;
	border: 2px solid transparent;
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-background-hover);
	text-align: start;
	cursor: pointer;
	color: inherit;
}

.cn-flow-sidebar__run-top {
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: space-between;
}

.cn-flow-sidebar__run-when {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	font-variant-numeric: tabular-nums;
}

/* The failure's own words, clamped: a stack trace in a sidebar card pushes
   every other run off the screen, and the card is an index, not the log. */
.cn-flow-sidebar__run-error {
	color: var(--color-error-text, var(--color-error));
	font-size: 0.9em;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* WHICH RUN IS OPEN, stated by more than a background: a border survives
   forced-colors mode, where a background tint does not. */
.cn-flow-sidebar__run--open {
	border-color: var(--color-primary-element);
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
