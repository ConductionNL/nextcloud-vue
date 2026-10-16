<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A case tabs widget in the board look (?l7=l28-tabs-board-overflow), as
  boards DqZaakMeer and DqZaakBesluiten draw it: five tabs in the strip and
  the other panels at the top of the Actions menu beside it.
-->
<template>
	<div class="cn-look-board l28-tabs" data-testid="l28-tabs-board-overflow">
		<CnTabsWidget
			:content="content"
			:availableWidgets="widgets"
			objectId="case-1"
			:objectData="object"
			objectType="case"
			register="dossiq"
			schema="case" />
	</div>
</template>

<script>
import CnTabsWidget from '../../../src/components/CnTabsWidget/CnTabsWidget.vue'

const PANELS = ['Overview', 'Files', 'Contact', 'Tasks', 'Notes', 'Decisions', 'Archiving']

export default {
	name: 'L28TabsBoardOverflow',

	components: { CnTabsWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			content: {
				ariaLabel: 'Case parts',
				maxVisibleTabs: 5,
				tabs: [
					...PANELS.slice(0, 4).map((label) => ({ widgetId: `p-${label}`, label })),
					{ widgetId: 'p-history' },
					...PANELS.slice(4).map((label) => ({ widgetId: `p-${label}`, label, overflow: true })),
				],
			},

			widgets: [
				...PANELS.map((label) => ({ id: `p-${label}`, type: 'custom', title: label })),
				{ id: 'p-history', type: 'audit-trail', title: 'Audit trail' },
			],

			object: { id: 'case-1', title: 'Street lighting Lindelaan' },
		}
	},
}
</script>

<style scoped>
.l28-tabs {
	width: 1000px;
	padding: 24px;
	background: var(--color-main-background);
}
</style>
