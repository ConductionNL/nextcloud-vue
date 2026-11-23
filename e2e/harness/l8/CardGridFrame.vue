<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A card-grid widget on a dashboard (?l8=card-grid-frame): the dashboard cell
  draws the titled card, so the grid draws no frame of its own inside it. The
  real CnDashboardPage under the board look, and the same grid on its own
  beside it, which keeps its frame. The objects are given, so no request runs.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="card-grid-frame">
		<CnDashboardPage
			title="Kaarten"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
		<div style="width: 760px; margin-top: 24px" data-testid="card-grid-alone">
			<CnWidgetCardGrid title="Rekeningen" :objects="objects" />
		</div>
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetCardGrid from '../../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

const objects = [
	{ id: 'a1', title: 'ING zakelijk', description: 'NL12 INGB 0001 2345 67' },
	{ id: 'a2', title: 'Rabobank', description: 'NL44 RABO 0123 4567 89' },
	{ id: 'a3', title: 'USD-rekening', description: 'NL71 ABNA 0417 1643 00' },
]

export default {
	name: 'CardGridFrame',

	components: { CnDashboardPage, CnWidgetCardGrid },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			objects,
			widgets: [
				{ id: 'accounts', type: 'card-grid', title: 'Rekeningen', content: { objects } },
				{ id: 'bare', type: 'card-grid', title: 'Rekeningen', content: { objects } },
			],

			layout: [
				{ id: '1', widgetId: 'accounts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 },
				{ id: '2', widgetId: 'bare', gridX: 0, gridY: 3, gridWidth: 12, gridHeight: 2, borderless: true, showTitle: false },
			],
		}
	},
}
</script>
