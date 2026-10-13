<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A stat tile whose caption has a count of its own (?l7=stat-caption-source),
  as PtDashboard's "Open toegangsverzoeken: 3, 1 wacht al 6 dagen". The real
  CnDashboardPage under the board look; the spec stubs OpenRegister's
  aggregation endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 760px" data-testid="stat-caption-source">
		<CnDashboardPage
			title="Dashboard"
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
	name: 'StatCaptionSource',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [{
				id: 'open-requests',
				type: 'stat',
				title: 'Open toegangsverzoeken',
				content: {
					label: 'Open toegangsverzoeken',
					layout: 'stacked',
					source: { register: 'portaliq', schema: 'portalAccessRequest', filter: { state: 'pending' } },
					caption: '{count} wacht al lang',
					captionSource: { filter: { state: 'pending', escalated: true }, zeroText: 'Niemand wacht lang' },
					captionVariantWhen: [{ op: 'gte', value: 1, variant: 'error' }],
				},
			}],

			layout: [{ id: '1', widgetId: 'open-requests', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }],
		}
	},
}
</script>
