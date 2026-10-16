<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A reports page whose card holds boxed stat tiles (?l8=stats-box-card), as
  board DcRapportages draws "Vergaderingen en efficiëntie", beside a card of
  plain stat tiles that keeps its own inset. The metrics are given, so no
  request runs.
-->
<template>
	<div class="cn-look-board" style="width: 1176px; background: var(--color-background-hover)" data-testid="stats-box-card">
		<CnDashboardPage
			title="Rapportages"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

const stat = (label, value, note) => ({ label, value, note })

export default {
	name: 'StatsBoxCard',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		const stats = [
			stat('Vergaderingen dit jaar', 58, '20 raad, 38 commissie'),
			stat('Gemiddelde duur', 2.7, 'gepland 2,5 uur'),
			stat('Kosten per vergadering', 1840, 'op uurtarief van de leden'),
			stat('Opkomst', 91, 'raad en commissies'),
		]
		return {
			widgets: [
				{ id: 'box', type: 'stats-block', title: 'Vergaderingen en efficiëntie', showTitle: true, content: { layout: 'grid', columns: 4, tiles: 'box', stats } },
				{ id: 'plain', type: 'stats-block', title: 'Je week tot nu toe', showTitle: true, content: { layout: 'grid', columns: 4, stats } },
			],

			layout: [
				{ id: '1', widgetId: 'box', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 },
				{ id: '2', widgetId: 'plain', gridX: 0, gridY: 2, gridWidth: 12, gridHeight: 2 },
			],
		}
	},
}
</script>
