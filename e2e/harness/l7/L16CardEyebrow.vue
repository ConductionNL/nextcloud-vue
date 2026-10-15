<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A widget card with a line above its title (?l7=l16-card-eyebrow), as board
  ShLiquiditeit's "Saldo per week" above "Prognose 13 weken". The real
  CnDashboardPage under the board look.
-->
<template>
	<div class="cn-look-board" style="width: 900px" data-testid="l16-card-eyebrow">
		<CnDashboardPage
			title="Liquiditeit"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

export default {
	name: 'L16CardEyebrow',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [
				{ id: 'forecast', type: 'text', title: 'Prognose 13 weken', eyebrow: 'Saldo per week', content: { text: 'Week 41' } },
				{ id: 'recurring', type: 'text', title: 'Terugkerende kosten', content: { text: 'Huur' } },
			],

			layout: [
				{ id: '1', widgetId: 'forecast', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 },
				{ id: '2', widgetId: 'recurring', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 3 },
			],
		}
	},
}
</script>
