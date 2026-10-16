<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list drawn as cards (?l8=record-list-cards), as board ShBank draws
  the four bank accounts from shillinq's cash position. The real
  CnDashboardPage under the board look: the same list once in a titled card
  and once in a borderless cell, as ShBank draws the cards on the page ground.
  The spec stubs the endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 1176px" data-testid="record-list-cards">
		<CnDashboardPage
			title="Bank"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import Bank from 'vue-material-design-icons/Bank.vue'
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'
import { registerIcons } from '../../../src/components/CnIcon/CnIcon.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

registerIcons({ Bank })

export default {
	name: 'RecordListCards',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: ['accounts', 'bare'].map((id) => ({
				id,
				type: 'record-list',
				title: 'Rekeningen',
				content: {
					endpointSource: { url: '/apps/shillinq/api/v1/cash-position', responsePath: 'accounts' },
					presentation: 'cards',
					icon: 'Bank',
					title: '{accountName}',
					meta: '{iban}',
					trailing: 'EUR {ledgerBalance}',
					pill: { field: 'feed', labels: { psd2: 'PSD2', app: 'In de app', import: 'Afschrift importeren' }, colorMap: { psd2: 'success', import: 'warning' } },
				},
			})),

			layout: [
				{ id: '1', widgetId: 'accounts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
				{ id: '2', widgetId: 'bare', gridX: 0, gridY: 4, gridWidth: 12, gridHeight: 2, borderless: true, showTitle: false },
			],
		}
	},
}
</script>
