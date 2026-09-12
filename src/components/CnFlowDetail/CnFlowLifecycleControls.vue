<!--
  CnFlowLifecycleControls — which version this is, and what can be done to it.

  ⚠️ WHO RENDERS THE NAME DEPENDS ON THE HOST, and that is what `showName` is.

  This used to render the name always, with NcAppSidebar handed no `name` at
  all, so that the version could sit BESIDE the title instead of on the line
  under it. The cost was not only the trade it was written as: `name` is a
  REQUIRED prop, so the app layout logged a Vue warning on every mount and
  NcAppSidebar rendered its own heading EMPTY. An empty `h2` above the real one
  is a heading that names nothing, which a screen reader still announces.

  So under NcAppSidebar the name is the sidebar's heading again and this row
  carries the dot, the version and the lifecycle under it. In the embedded
  (dialog) host there is no sidebar heading to use, so the name stays here and
  the row stays an `h2`. One component, two hosts, one heading each.

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
	<component :is="showName ? 'h2' : 'div'"
		class="cn-flow-lifecycle"
		data-testid="flow-title">
		<CnFlowHealthDot :enabled="store.flow.enabled === true"
			:lastRunStatus="store.flow.lastRunStatus || null" />
		<!-- Only where nothing else is rendering it. Under NcAppSidebar the
		     name is the sidebar's own heading, and printing it here too would
		     put the flow's name on screen twice. -->
		<span v-if="showName" class="cn-flow-lifecycle__name">{{ name }}</span>
		<span class="cn-flow-lifecycle__pill cn-flow-lifecycle__pill--version"
			:title="versionTitle"
			data-testid="flow-version">v{{ store.flowVersionLabel }}</span>
		<span class="cn-flow-lifecycle__pill"
			:class="`cn-flow-lifecycle__pill--${store.lifecycleStatus}`"
			data-testid="flow-lifecycle">{{ lifecycleLabel }}</span>
	</component>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnFlowHealthDot from './CnFlowHealthDot.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowLifecycleControls',

	components: { CnFlowHealthDot },

	props: {
		/**
		 * Render the flow's name in this row, and make the row a heading.
		 *
		 * True for a host with no heading of its own, which is the embedded
		 * dialog. Under NcAppSidebar the name is the sidebar's heading, so the
		 * row is a plain div carrying the dot and the pills under it.
		 */
		showName: {
			type: Boolean,
			default: true,
		},
	},

	setup() {
		return { store: useFlowStore() }
	},

	computed: {
		/**
		 * What the pill is showing, said in words on hover.
		 *
		 * A back-filled version matters here: the repair that stamped historic
		 * versions could not know whether any of them was breaking, so it
		 * counted minors. Saying so is what lets somebody distrust it
		 * correctly — a number that silently claims to be derived cannot be.
		 *
		 * @return {string} The explanation.
		 */
		versionTitle() {
			if (!this.store.flow.semver) {
				return this.t('nextcloud-vue', 'Version number. A semantic version appears once the flow is published.')
			}

			if (this.store.flow.semverSource === 'backfill') {
				return this.t('nextcloud-vue', 'Numbered when semantic versions were introduced, not derived from a comparison.')
			}

			return this.t('nextcloud-vue', 'A major version means a step, a connection or a setting was removed.')
		},

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
