<!--
  CnFlowLifecycleControls — which version this is, and what can be done to it.

  ⚠️ THIS RENDERS THE FLOW'S NAME ITSELF, and NcAppSidebar is given no `name`.
  That is deliberate and it is a trade. The version belongs beside the title
  rather than on a line under it, and NcAppSidebar renders its own heading with
  no slot to reach into — only a `name` prop. So the heading is ours: an `h2`
  carrying the health dot, the name, the version and the lifecycle on one line.

  The cost is that this sidebar's heading is no longer NcAppSidebar's, so a
  change to how the fleet's sidebars render their titles will not reach here.
  The h2 and the ordering exist to keep the semantics that prop was providing.

  WHY THIS IS NOT PART OF A TAB
  -----------------------------
  Version, status and Publish used to render inside the sidebar's Steps tab,
  above the palette. They are a property of the FLOW, not of that tab, so
  opening Runs or Flow hid a Publish button that was still perfectly valid, and
  an author looking at a run could not see whether they were looking at a draft.

  So they render in the sidebar HEADER, next to the flow's name, and stay
  visible whichever tab is open. Extracted into their own component because two
  hosts need them: NcAppSidebar's `description` slot in the app layout, and a
  plain header row in the embedded (dialog) variant. One copy, so the two hosts
  cannot drift.

  THE HEALTH DOT LEADS THE LINE. It reports the state of the last RUN, which is
  the question an author opening a flow actually has, and it subsumes the
  enabled/disabled label that used to sit here — a grey dot says "this is not
  going to run" in less space and without competing with the version for the
  eye.

  WHAT IS DELIBERATELY NOT HERE
  -----------------------------
  THE VERBS. Publish, Create draft version and Deprecate live in the header's
  action menu, next to Edit flow and Enable. This states a FACT about the open
  flow: which version it is and whether that version is a draft. Buttons in a
  header compete with the flow's name for the eye and win, and there were three
  of them for something an author does a handful of times in a flow's life.

  The read-only explanation ("create a draft to change its steps") is not here
  either. It is a standing condition of the flow and renders in the canvas
  message area with every other message, beside the graph it is about. Repeating
  it here would put the same sentence in two places and make neither
  authoritative.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<h2 class="cn-flow-lifecycle" data-testid="flow-title">
		<CnFlowHealthDot :enabled="store.flow.enabled === true"
			:last-run-status="store.flow.lastRunStatus || null" />
		<span class="cn-flow-lifecycle__name">{{ name }}</span>
		<span class="cn-flow-lifecycle__pill cn-flow-lifecycle__pill--version"
			data-testid="flow-version">v{{ store.flowVersion }}</span>
		<span class="cn-flow-lifecycle__pill"
			:class="`cn-flow-lifecycle__pill--${store.lifecycleStatus}`"
			data-testid="flow-lifecycle">{{ lifecycleLabel }}</span>
	</h2>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { useFlowStore } from '../../composables/useFlowStore.js'
import CnFlowHealthDot from './CnFlowHealthDot.vue'

export default {
	name: 'CnFlowLifecycleControls',

	components: { CnFlowHealthDot },

	setup() {
		return { store: useFlowStore() }
	},

	computed: {
		/**
		 * The flow's name, or a placeholder while it has none.
		 *
		 * @return {string} The heading text.
		 */
		name() {
			return this.store.flow.name || this.t('nextcloud-vue', 'Flow')
		},

		/**
		 * The lifecycle status, in the author's language.
		 *
		 * @return {string} The label.
		 */
		lifecycleLabel() {
			const labels = {
				draft: this.t('nextcloud-vue', 'Draft'),
				published: this.t('nextcloud-vue', 'Published'),
				deprecated: this.t('nextcloud-vue', 'Deprecated'),
			}

			return labels[this.store.lifecycleStatus] || this.store.lifecycleStatus
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-flow-lifecycle {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin: 0;
	font-size: 1.25em;
}

/* The name may be long and the pills must stay with it rather than wrap alone,
   so the name is the only part allowed to shrink. */
.cn-flow-lifecycle__name {
	min-inline-size: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-flow-lifecycle__pill {
	border-radius: var(--border-radius-pill, 100px);
	padding: 2px 10px;
	font-size: 0.85em;
	/* Tokens, never literals: a pill has to stay legible in the dark theme and
	   under the high-contrast accessibility setting, and a hardcoded pair
	   fails both. */
	background-color: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-flow-lifecycle__pill--version {
	font-weight: bold;
	color: var(--color-main-text);
	/* Tabular figures so v9 and v10 do not shift the badge beside them. */
	font-variant-numeric: tabular-nums;
}

.cn-flow-lifecycle__pill--published {
	background-color: var(--color-success, var(--color-primary-element));
	color: var(--color-primary-element-text, var(--color-main-background));
}

.cn-flow-lifecycle__pill--deprecated {
	background-color: var(--color-warning, var(--color-background-dark));
	color: var(--color-main-text);
}
</style>
