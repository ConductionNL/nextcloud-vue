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

		<div class="cn-run-sidebar__tabs" role="tablist">
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

		<!-- Objects: the audit attribution, run-wide. -->
		<template v-if="tab === 'objects'">
			<p v-if="!objectRows.length" class="cn-run-sidebar__hint">
				{{ t('nextcloud-vue', 'This run changed no objects.') }}
			</p>
			<ul v-else class="cn-run-sidebar__touched">
				<li v-for="obj in objectRows" :key="obj.auditUuid">
					<span class="cn-run-sidebar__touched-action">{{ obj.action }}</span>
					<span class="cn-run-sidebar__touched-uuid">{{ obj.objectUuid }}</span>
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
		</template>

		<!-- Tasks: what the run asked a person to do. -->
		<template v-else-if="tab === 'tasks'">
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
		</template>

		<!-- Logs: what the engine did, in its own order. -->
		<template v-else>
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
		</template>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import ArrowLeft from 'vue-material-design-icons/ArrowLeft.vue'
import Replay from 'vue-material-design-icons/Replay.vue'
import { FLOW_RUN_ACTIVE_STATUSES, useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnRunDetailSidebar',

	components: { ArrowLeft, NcButton, Replay },

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		return { tab: 'objects' }
	},

	computed: {
		/**
		 * @return {object|null} The run being read.
		 */
		run() {
			return this.store.runs.find((r) => r.uuid === this.store.inspectedRunUuid) || null
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
</style>
