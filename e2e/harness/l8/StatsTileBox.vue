<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Stats-block grids under the board look (?l8=stats-tile-box): "Je week tot nu
  toe" without a box (board PqMijnWerk) and "Vergaderingen en efficiëntie"
  with `tiles: "box"` (board DcRapportages). OpenRegister is stubbed by the
  spec with page.route().
-->
<template>
	<div class="cn-look-board" style="width: 1176px; background: var(--color-background-hover)" data-testid="stats-tile-box">
		<CnDashboardPage
			title="Tegels"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/css/index.css'

const count = (label, note) => ({ label, note, source: { register: 'decidiq', schema: 'meeting', metric: 'count' } })

export default {
	name: 'StatsTileBox',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [
				{
					id: 'my-week',
					type: 'stats-block',
					title: 'Je week tot nu toe',
					showTitle: true,
					content: { layout: 'grid', columns: 2, stats: [count('Beantwoord', '4 vandaag'), count('Binnen de termijn', 'team 88%')] },
				},
				{
					id: 'efficiency',
					type: 'stats-block',
					title: 'Vergaderingen en efficiëntie',
					showTitle: true,
					content: {
						layout: 'grid',
						columns: 4,
						tiles: 'box',
						stats: [
							count('Vergaderingen dit jaar', '20 raad, 38 commissie'),
							count('Gemiddelde duur', 'gepland 2,5 uur'),
							count('Kosten per vergadering', 'op uurtarief van de leden'),
							count('Opkomst', 'raad en commissies'),
						],
					},
				},
			],

			layout: [
				{ id: '1', widgetId: 'my-week', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 },
				{ id: '2', widgetId: 'efficiency', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 3 },
			],
		}
	},
}
</script>
