<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Dashboard cards under the board look (?l8=board-card-titles): a work page with a
  titled record list and a two-column stats grid (board PqMijnWerk), and a
  reports page with a four-tile stats grid under its cards (board
  DcRapportages). OpenRegister is stubbed by the spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1176px; background: var(--color-background-hover)" data-testid="board-card-titles">
		<div data-testid="board-cards-work">
			<CnDashboardPage
				title="Mijn werk"
				:widgets="workWidgets"
				:layout="workLayout"
				:showHeader="false" />
		</div>
		<div data-testid="board-cards-reports">
			<CnReportsPage
				title="Rapportages"
				:cards="cards"
				:widgets="reportWidgets"
				:layout="reportLayout" />
		</div>
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnReportsPage from '../../../src/components/CnReportsPage/CnReportsPage.vue'

import '../../../src/css/index.css'

const count = (label, note) => ({ label, note, source: { register: 'decidiq', schema: 'meeting', metric: 'count' } })

export default {
	name: 'BoardCardTitles',

	components: { CnDashboardPage, CnReportsPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			workWidgets: [
				{
					id: 'today',
					type: 'record-list',
					title: 'Vandaag beantwoorden',
					content: { register: 'pipelinq', schema: 'ticket', title: '{title}' },
				},
				{
					id: 'my-week',
					type: 'stats-block',
					title: 'Je week tot nu toe',
					showTitle: true,
					content: { layout: 'grid', columns: 2, stats: [count('Beantwoord', '4 vandaag'), count('Binnen de termijn', 'team 88%')] },
				},
			],

			workLayout: [
				{ id: '1', widgetId: 'today', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 3 },
				{ id: '2', widgetId: 'my-week', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 3 },
			],

			cards: [
				{ id: 'Decisions', label: 'Besluiten', description: 'Wat er besloten is.', route: 'DecisionsReport' },
				{ id: 'Meetings', label: 'Vergaderingen en aanwezigheid', description: 'Waar vergaderingen staan.', route: 'MeetingsReport' },
			],

			reportWidgets: [{
				id: 'efficiency',
				type: 'stats-block',
				title: 'Vergaderingen en efficiëntie',
				showTitle: true,
				headerLink: { label: 'Hele rapportage', href: '#efficiency' },
				content: {
					layout: 'grid',
					columns: 4,
					stats: [
						count('Vergaderingen dit jaar', '20 raad, 38 commissie'),
						count('Gemiddelde duur', 'gepland 2,5 uur'),
						count('Kosten per vergadering', 'op uurtarief van de leden'),
						count('Opkomst', 'raad en commissies'),
					],
				},
			}],

			reportLayout: [{ id: '1', widgetId: 'efficiency', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
		}
	},
}
</script>
