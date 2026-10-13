<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A work list in sections across schemas (?l8=work-sections), as board
  DcMijnActies draws "Mijn acties": a dashboard of record-list cards, each with
  its count after the title and one action ending every row. The reads are
  stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 800px" data-testid="work-sections">
		<CnDashboardPage
			title="Mijn acties"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/css/index.css'

export default {
	name: 'WorkSections',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [
				{
					id: 'votes',
					type: 'record-list',
					title: 'Stemmingen voor u',
					content: {
						register: 'decidiq',
						schema: 'motion',
						title: '{title}',
						meta: '{bodyName}',
						pill: { field: 'status', labels: { voting: 'Ter stemming' }, colorMap: { voting: 'warning' } },
						headerCount: true,
						rowAction: { type: 'navigate', target: 'https://example.org/vote/@object.id', label: 'Stem uitbrengen' },
					},
				},
				{
					id: 'actions',
					type: 'record-list',
					title: 'Actiepunten',
					content: {
						register: 'decidiq',
						schema: 'action-item',
						title: '{title}',
						meta: '{origin}',
						pill: { field: 'status', labels: { open: 'Open', busy: 'Bezig' } },
						headerCount: true,
						rowAction: { type: 'handler', handler: 'complete', label: 'Afronden', labels: { field: 'status', map: { open: 'Starten' } } },
					},
				},
			],

			layout: [
				{ id: '1', widgetId: 'votes', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
				{ id: '2', widgetId: 'actions', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 5 },
			],
		}
	},
}
</script>
