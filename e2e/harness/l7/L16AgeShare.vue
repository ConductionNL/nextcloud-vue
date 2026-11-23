<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A stat tile whose caption is a share (?l7=l16-age-share), as board
  ShDebiteurenbeheer's "EUR 14.320,00, 15% van open". The real CnDashboardPage
  under the board look; the spec stubs OpenRegister's aggregation endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 760px" data-testid="l16-age-share">
		<CnDashboardPage
			title="Debiteuren"
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
	name: 'L16AgeShare',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [{
				id: 'aging-1-30',
				type: 'stat',
				title: '1 tot 30 dagen',
				content: {
					label: '1 tot 30 dagen',
					layout: 'stacked',
					source: { register: 'shillinq', schema: 'ARInvoice', metric: 'sum', field: 'grossAmount', filter: { bucket: 'b1' } },
					caption: '{ratio}% van open',
					captionSource: { kind: 'ratio', denominator: { metric: 'sum', field: 'grossAmount', filter: { open: true } } },
				},
			}],

			layout: [{ id: '1', widgetId: 'aging-1-30', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }],
		}
	},
}
</script>
