<!--
  CnFlowLifecycleControls — which version this is, and what can be done to it.

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
	<div class="cn-flow-lifecycle">
		<p class="cn-flow-lifecycle__version">
			<span class="cn-flow-lifecycle__version-number"
				data-testid="flow-version">v{{ store.flowVersion }}</span>
			<span class="cn-flow-lifecycle__badge"
				:class="`cn-flow-lifecycle__badge--${store.lifecycleStatus}`"
				data-testid="flow-lifecycle">{{ lifecycleLabel }}</span>
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { useFlowStore } from '../../composables/useFlowStore.js'

export default {
	name: 'CnFlowLifecycleControls',

	setup() {
		return { store: useFlowStore() }
	},

	computed: {
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
}

.cn-flow-lifecycle__version {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
}

.cn-flow-lifecycle__version-number {
	font-weight: bold;
}

.cn-flow-lifecycle__badge {
	border-radius: var(--border-radius-pill, 100px);
	padding: 2px 10px;
	font-size: 0.85em;
	/* Tokens, never literals: the badge has to stay legible in the dark theme
	   and under the high-contrast accessibility setting, and a hardcoded pair
	   fails both. */
	background-color: var(--color-background-dark);
	color: var(--color-text-maxcontrast);
}

.cn-flow-lifecycle__badge--published {
	background-color: var(--color-success, var(--color-primary-element));
	color: var(--color-primary-element-text, var(--color-main-background));
}

.cn-flow-lifecycle__badge--deprecated {
	background-color: var(--color-warning, var(--color-background-dark));
	color: var(--color-main-text);
}
</style>
