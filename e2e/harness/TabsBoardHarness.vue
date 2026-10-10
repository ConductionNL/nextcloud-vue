<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnTabsWidget in the board look, inside a detail page (?tabswidget=board).
  The look's stylesheets are not loaded by the harness entry, because every
  rule in them is scoped under `.cn-look-board` and loading them globally
  would change the environment of every other spec. The spec injects them.
-->
<template>
	<div class="cn-look-board tabs-board">
		<div class="cn-detail-page">
			<div class="tw-box" data-testid="tw-widget">
				<CnTabsWidget
					:content="content"
					:availableWidgets="widgets"
					objectId="case-1"
					:objectData="object"
					objectType="case"
					:schemaObject="schemaObject"
					register="dossiq"
					schema="case" />
			</div>
		</div>
	</div>
</template>

<script>
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

export default {
	name: 'TabsBoardHarness',

	components: { CnTabsWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			content: {
				ariaLabel: 'Panels',
				tabs: [
					{ widgetId: 'tb-a', label: 'Overview' },
					{ widgetId: 'tb-b', label: 'Documents' },
				],
			},

			widgets: [
				{ id: 'tb-a', type: 'data', title: 'Case data' },
				{ id: 'tb-b', type: 'custom', title: 'Documents' },
			],

			schemaObject: {
				title: 'Case',
				properties: {
					title: { type: 'string', title: 'Title' },
					reference: { type: 'string', title: 'Reference' },
				},
			},

			object: { id: 'case-1', title: 'Street lighting Lindelaan', reference: '2026-0082' },
		}
	},
}
</script>

<style scoped>
.tabs-board {
	width: 820px;
	padding: 24px;
	background: var(--color-main-background);
}
</style>
