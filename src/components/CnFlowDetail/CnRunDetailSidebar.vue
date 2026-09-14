<!--
  CnRunDetailSidebar — one run: what it changed, what it asked a person to do,
  and what it did.

  WHY THIS IS A SIDEBAR AND NOT A PANEL INSIDE THE FLOW'S
  -------------------------------------------------------
  It used to be a block nested inside the Runs tab, with a tab strip of its own.
  That put TABS INSIDE A TAB: the flow's strip (Steps, Runs) stayed on screen
  above the run's (Objects, Tasks, Logs), and the two competed for the same
  glance. Worse, the flow's tabs were still live — pressing Steps while reading
  a run swapped the panel and left the canvas painted with that run's badges,
  so the graph and the sidebar were describing different things.

  So opening a run REPLACES the flow's sidebar rather than nesting inside it.
  One strip at a time, and the way back is a deliberate act with its own
  control. The canvas keeps the run's replay while this is open, which is now
  consistent rather than accidental: the sidebar and the graph are showing the
  same run because there is no way to make them show anything else.

  WHAT IT DOES NOT OWN
  --------------------
  The run's badges on the canvas. Those are the flow detail's animation, driven
  from `store.inspectedRunUuid` and the stored log. This component reads the
  same run; it does not paint.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-run-sidebar" data-testid="run-detail-sidebar">
		<!--
			THE WAY BACK, FIRST AND ALWAYS. A view that replaces another must
			say what it replaced and how to undo that, or it reads as the
			application having navigated somewhere on its own.
		-->
		<div class="cn-run-sidebar__head">
			<NcButton variant="tertiary"
				data-testid="run-back"
				@click="store.closeRun()">
				<template #icon>
					<ArrowLeft :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Back to the flow') }}
			</NcButton>
		</div>

		<h4 class="cn-run-sidebar__title">
			<span :class="`cn-run-sidebar__status cn-run-sidebar__status--${run?.status}`"
				data-testid="run-status">{{ run?.status || t('nextcloud-vue', 'Run') }}</span>
			<time v-if="run?.created" class="cn-run-sidebar__when" :datetime="run.created">{{ run.created }}</time>
		</h4>

		<p v-if="run?.error" class="cn-run-sidebar__error" data-testid="run-error">
			{{ run.error }}
		</p>

		<!--
			THE STRIP IS NEXTCLOUD'S, NOT OURS.

			These three used to be hand-rolled buttons with a border under the
			active one. They sat directly inside NcAppSidebar, one element away
			from the real thing, so they read as a panel that had been dropped
			into the sidebar rather than as the sidebar's own tabs: no icons,
			the wrong size, the wrong active mark, and none of the keyboard
			behaviour NcAppSidebarTabs brings.

			NcAppSidebarTab registers itself with the sidebar through an
			injection, so the sidebar builds the strip. That also settles which
			tab is open: entering run view leaves `flow-runs` registered by
			nothing, and NcAppSidebarTabs falls back to the first tab it has,
			which is Objects.

			`embedded` (CnFlowEditModal) has no NcAppSidebar to inject that, so
			it keeps a strip of its own. One list of tabs feeds both, so the two
			hosts cannot come to offer different ones.
		-->
		<div v-if="embedded" class="cn-run-sidebar__tabs" role="tablist">
			<button v-for="entry in tabs"
				:key="entry.id"
				class="cn-run-sidebar__tab"
				:class="{ 'cn-run-sidebar__tab--active': tab === entry.id }"
				role="tab"
				:data-testid="`flow-run-tab-${entry.id}`"
				:aria-selected="tab === entry.id ? 'true' : 'false'"
				@click="tab = entry.id">
				{{ entry.label }}
			</button>
		</div>

		<!-- Objects: what the run is about, and what it changed. -->
		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-if="!embedded || tab === 'objects'"
			:id="embedded ? undefined : 'run-objects'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Objects')"
			:order="embedded ? undefined : 1"
			data-testid="flow-run-panel-objects">
			<template v-if="!embedded" #icon>
				<DatabaseOutline :size="20" />
			</template>

			<!--
				THE OBJECTS THE RUN IS ABOUT, FIRST.

				`GET /flow-runs/{uuid}/objects` answers the AUDIT: objects this
				run changed. A run that waited on a locked object and then
				failed changed nothing, so that list is empty while the run's
				own error names the object by uuid — and this panel said "this
				run changed no objects", which reads as the run having had
				nothing to do with it.

				The run record knows better. `subjects` is what it was started
				on and `placeItems` is what it is holding at a step, so both are
				listed here, and each row says which it is. The changed list
				keeps its own heading below: "worked on" and "changed" are
				different claims and this view exists to keep them apart.
			-->
			<template v-if="subjectRows.length">
				<h5 class="cn-run-sidebar__group">
					{{ t('nextcloud-vue', 'Objects this run is about') }}
				</h5>
				<ul class="cn-run-sidebar__touched" data-testid="flow-run-subjects">
					<!--
						SEPARATED IN THE TEXT, not only by layout. Three adjacent
						spans render as one run-on string: "triggerDakkapel
						Kerkstraat 122e98a265-..." was what the live instance
						showed. A gap would fix the look and leave the text
						itself unreadable, which is what anything reading the
						DOM gets, so the separator is a character.
					-->
					<li v-for="obj in subjectRows" :key="`${obj.role}-${obj.uuid}`">
						<span class="cn-run-sidebar__touched-action">{{ obj.role }}</span>
						<span v-if="obj.title"> · {{ obj.title }}</span>
						<span class="cn-run-sidebar__touched-uuid"> · {{ obj.uuid }}</span>
					</li>
				</ul>
			</template>

			<h5 v-if="subjectRows.length" class="cn-run-sidebar__group">
				{{ t('nextcloud-vue', 'Changed by this run') }}
			</h5>
			<p v-if="!objectRows.length" class="cn-run-sidebar__hint">
				{{ t('nextcloud-vue', 'This run changed no objects.') }}
			</p>
			<ul v-else class="cn-run-sidebar__touched">
				<!-- Same separator as the subject rows above, and for the same
				     reason: "create" and the uuid ran together as "createobj-1"
				     with nothing between them. -->
				<li v-for="obj in objectRows" :key="obj.auditUuid">
					<span class="cn-run-sidebar__touched-action">{{ obj.action }}</span>
					<span class="cn-run-sidebar__touched-uuid"> · {{ obj.objectUuid }}</span>
					<span class="cn-run-sidebar__hint"> · {{ obj.node }}</span>
					<!--
						A change the run's own step history cannot account for.
						It should normally never appear; when it does, hiding it
						would be the opposite of what this view is for.
					-->
					<span v-if="obj.unaccounted"
						class="cn-run-sidebar__error"
						data-testid="flow-object-unaccounted">
						{{ t('nextcloud-vue', 'no matching step') }}
					</span>
				</li>
			</ul>
		</component>

		<!-- Tasks: what the run asked a person to do. -->
		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-if="!embedded || tab === 'tasks'"
			:id="embedded ? undefined : 'run-tasks'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Tasks')"
			:order="embedded ? undefined : 2"
			data-testid="flow-run-panel-tasks">
			<template v-if="!embedded" #icon>
				<CheckboxMarkedOutline :size="20" />
			</template>

			<p v-if="!store.runTasks.length"
				class="cn-run-sidebar__hint"
				data-testid="flow-run-tasks-empty">
				{{ t('nextcloud-vue', 'This run raised no tasks.') }}
			</p>
			<ul v-else class="cn-run-sidebar__list">
				<li v-for="task in store.runTasks" :key="task.uuid">
					<!-- The task's one stable address, the same one the
					     notification buttons and the VTODO already resolve to. -->
					<a class="cn-run-sidebar__row"
						:href="taskUrl(task.uuid)"
						data-testid="flow-task-link">
						<span :class="`cn-run-sidebar__status cn-run-sidebar__status--${task.state}`">{{ task.state }}</span>
						<span>{{ task.title || task.uuid }}</span>
					</a>
				</li>
			</ul>
		</component>

		<!-- Logs: what the engine did, in its own order. -->
		<component :is="embedded ? 'div' : 'NcAppSidebarTab'"
			v-if="!embedded || tab === 'logs'"
			:id="embedded ? undefined : 'run-logs'"
			:name="embedded ? undefined : t('nextcloud-vue', 'Logs')"
			:order="embedded ? undefined : 3"
			data-testid="flow-run-panel-logs">
			<template v-if="!embedded" #icon>
				<FormatListBulleted :size="20" />
			</template>

			<!-- Replay BESIDE the step list, not instead of it: the list stays
			     what it is for reading, the replay plays the same stored log
			     through the canvas animator. Only on a FINISHED run — a run
			     still going is watched live. -->
			<NcButton v-if="canReplay"
				variant="secondary"
				data-testid="flow-replay"
				@click="store.requestReplay()">
				<template #icon>
					<Replay :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Replay on the canvas') }}
			</NcButton>

			<p v-if="!store.steps.length" class="cn-run-sidebar__hint">
				{{ t('nextcloud-vue', 'This run recorded no steps.') }}
			</p>
			<ol v-else class="cn-run-sidebar__steps">
				<li v-for="(step, i) in store.steps" :key="i">
					<strong>{{ step.transition }}</strong>
					<span class="cn-run-sidebar__hint"> · {{ step.status }}</span>
					<span v-if="step.error" class="cn-run-sidebar__error"> · {{ step.error }}</span>
				</li>
			</ol>
		</component>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcAppSidebarTab, NcButton } from '@nextcloud/vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import Replay from 'vue-material-design-icons/Replay.vue'
import { FLOW_RUN_ACTIVE_STATUSES, useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnRunDetailSidebar',

	components: {
		ArrowLeft,
		CheckboxMarkedOutline,
		DatabaseOutline,
		FormatListBulleted,
		NcAppSidebarTab,
		NcButton,
		Replay,
	},

	props: {
		/**
		 * Render the panels without NcAppSidebarTab, for a host that is not
		 * NcAppSidebar. CnFlowEditModal renders this sidebar inside a dialog,
		 * where there is no sidebar to register a tab with, so that host keeps
		 * a strip of its own.
		 */
		embedded: {
			type: Boolean,
			default: false,
		},
	},

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return { tab: 'objects' }
	},

	computed: {
		/**
		 * The run being read.
		 *
		 * The run's OWN record first, the history list second. The list is
		 * capped at 25, so a run opened from a `?run=` deep link need not be in
		 * it, and reading only the list left such a run with no status, no time
		 * and no error on screen.
		 *
		 * @return {object|null} The run being read.
		 */
		run() {
			const detail = this.store.runDetail
			if (detail && String(detail.uuid || '') === String(this.store.inspectedRunUuid || '')) {
				return detail
			}

			return this.store.runs.find((r) => r.uuid === this.store.inspectedRunUuid) || null
		},

		/**
		 * The objects the run is ABOUT, as opposed to the ones it changed.
		 *
		 * Two sources, both on the run's own record. `subjects` is what the run
		 * was started on, keyed by the role that supplied it (`trigger` for a
		 * run a trigger started). `placeItems` is what the run is holding at a
		 * step right now, keyed by that step.
		 *
		 * Deduplicated by uuid, because a run's subject is normally also the
		 * item sitting in a place and listing it twice would suggest two
		 * objects. The subject wins the row: it is the more durable fact.
		 *
		 * @return {Array<object>} The rows, subjects first.
		 */
		subjectRows() {
			const run = this.run
			if (!run) {
				return []
			}

			// The held items first, because they are the half that carries a
			// TITLE. A subject record is a uuid, a register and a schema; the
			// item sitting in a place is the object itself. Merging the two
			// gives a subject row a name a reader recognises instead of a uuid.
			const held = new Map()
			for (const [node, items] of Object.entries(run.placeItems || {})) {
				for (const item of items || []) {
					const uuid = String(item?.json?.id || item?.id || '')
					if (uuid === '' || held.has(uuid)) {
						continue
					}

					held.set(uuid, {
						// Named by the step that is holding it, because that is
						// the useful half: "which step is this stuck at".
						role: this.t('nextcloud-vue', 'at {node}', { node }),
						uuid,
						title: item?.json?.title || '',
					})
				}
			}

			const rows = []
			const seen = new Set()

			for (const [role, subject] of Object.entries(run.subjects || {})) {
				const uuid = String(subject?.uuid || '')
				if (uuid === '' || seen.has(uuid)) {
					continue
				}

				seen.add(uuid)
				rows.push({
					role,
					uuid,
					title: subject?.title || held.get(uuid)?.title || '',
				})
			}

			for (const [uuid, row] of held.entries()) {
				if (seen.has(uuid) === false) {
					seen.add(uuid)
					rows.push(row)
				}
			}

			return rows
		},

		/**
		 * @return {Array<object>} The strip.
		 */
		tabs() {
			return [
				{ id: 'objects', label: this.t('nextcloud-vue', 'Objects') },
				{ id: 'tasks', label: this.t('nextcloud-vue', 'Tasks') },
				{ id: 'logs', label: this.t('nextcloud-vue', 'Logs') },
			]
		},

		/**
		 * Every object the run touched, flattened, each marked with the step
		 * that accounts for it.
		 *
		 * @return {Array<object>} The rows.
		 */
		objectRows() {
			const stepNodes = new Set((this.store.steps || []).map((step) => String(step.transition || '')))

			return (this.store.runObjects || []).flatMap((group) => (group.objects || []).map((obj) => ({
				...obj,
				node: group.node,
				unaccounted: !stepNodes.has(String(group.node || '')),
			})))
		},

		/**
		 * @return {boolean} True when Replay is offered.
		 */
		canReplay() {
			if (this.store.steps.length === 0) {
				return false
			}

			const status = this.run?.status
			return status !== undefined && FLOW_RUN_ACTIVE_STATUSES.includes(status) === false
		},
	},

	methods: {
		t,

		/**
		 * @param {string} uuid The task uuid.
		 * @return {string} The task's own URL.
		 */
		taskUrl(uuid) {
			return generateUrl(`/apps/openregister/flow-tasks/${uuid}`)
		},
	},
}
</script>

<style scoped>
.cn-run-sidebar {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 12px;
}

.cn-run-sidebar__head {
	display: flex;
}

.cn-run-sidebar__title {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
}

.cn-run-sidebar__when {
	color: var(--color-text-maxcontrast);
	font-weight: normal;
	font-size: 0.9em;
	font-variant-numeric: tabular-nums;
}

.cn-run-sidebar__error {
	color: var(--color-error-text, var(--color-error));
}

.cn-run-sidebar__hint {
	color: var(--color-text-maxcontrast);
}

.cn-run-sidebar__group {
	margin: 8px 0 0;
	color: var(--color-text-maxcontrast);
	font-weight: bold;
}

.cn-run-sidebar__tabs {
	display: flex;
	gap: 4px;
	border-block-end: 1px solid var(--color-border);
}

.cn-run-sidebar__tab {
	border: none;
	background: none;
	padding: 8px 12px;
	cursor: pointer;
	color: var(--color-main-text);
	border-block-end: 2px solid transparent;
}

.cn-run-sidebar__tab--active {
	border-block-end-color: var(--color-primary-element);
	font-weight: bold;
}

.cn-run-sidebar__list,
.cn-run-sidebar__touched,
.cn-run-sidebar__steps {
	margin: 0;
	padding-inline-start: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-run-sidebar__steps {
	list-style: decimal;
	padding-inline-start: 20px;
}

.cn-run-sidebar__row {
	display: flex;
	gap: 8px;
	align-items: center;
	color: inherit;
	padding: 6px 8px;
	border-radius: var(--border-radius-large, 12px);
	background: var(--color-background-hover);
}

.cn-run-sidebar__touched-uuid {
	font-family: monospace;
	font-size: 0.9em;
}

/* A uuid is long and the sidebar is narrow, so a row wraps rather than
   pushing the panel wider. The gap keeps the parts apart on the line the
   separators already keep apart in the text. */
.cn-run-sidebar__touched li {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0 4px;
}
</style>
