<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The DqTermijnen header and KPI row under the board look (?l8=termijnen-board):
  a title with three header actions, a description with the segmented period,
  and five stacked stat tiles in the `kpiRow`, at the board's 1148px content
  width (`&w=<px>` narrows it).
-->
<template>
	<div class="cn-look-board" :style="{ width: `${width}px` }" data-testid="termijnen-board">
		<CnDashboardPage
			title="Termijnbewaking"
			description="Week 41 · alle teams"
			:dateRange="dateRange"
			:headerActions="headerActions"
			:widgets="widgets"
			:layout="layout"
			:kpiRow="kpiRow"
			:showWidgetActions="false"
			:allowEdit="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/css/index.css'

function tile(id, label, value, caption) {
	return {
		id,
		type: 'stat',
		title: label,
		content: { label, value, caption, layout: 'stacked' },
	}
}

export default {
	name: 'TermijnenBoard',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		const w = Number(new URLSearchParams(window.location.search).get('w'))
		return {
			width: w > 0 ? w : 1180,
			dateRange: { enabled: true, control: 'segmented', placement: 'description', presets: [{ id: 'week', label: 'Deze week', days: 7 }, { id: 'quarter', label: 'Dit kwartaal', days: 90 }, { id: 'year', label: 'Dit jaar', days: 365 }] },
			headerActions: [
				{ id: 'report', type: 'navigate', label: 'Kwartaalrapport', icon: 'Download', target: '/reports' },
				{ id: 'register', type: 'navigate', label: 'Ingebrekestelling registreren', icon: 'Plus', variant: 'primary', target: '/notices' },
			],

			kpiRow: ['t1', 't2', 't3', 't4', 't5'],
			widgets: [
				tile('t1', 'Lopende termijnen', 64, 'in 9 zaaktypen'),
				tile('t2', 'Verloopt deze week', 7, '3 bij Woo-verzoeken'),
				tile('t3', 'Verlopen', 2, 'Beslis vandaag of verdaag'),
				tile('t4', 'Dwangsom loopt', 340, '1 zaak, dag 9 van 42'),
				tile('t5', 'Op tijd beslist', 92, 'Q3 2026, doel 95 %'),
				{ id: 'w', type: 'text', title: 'Op tijd beslist per zaaktype', content: { text: 'Woo-verzoek 88 %' } },
			],

			layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
		}
	},
}
</script>
