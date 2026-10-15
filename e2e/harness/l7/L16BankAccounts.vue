<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A record list fed by an app endpoint on a dashboard (?l7=l16-bank-accounts),
  as board ShBank's accounts with the balances only the cash position endpoint
  has. The real CnDashboardPage under the board look; the spec stubs the endpoint.
-->
<template>
	<div class="cn-look-board" style="width: 760px" data-testid="l16-bank-accounts">
		<CnDashboardPage
			title="Bank"
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
	name: 'L16BankAccounts',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [{
				id: 'accounts',
				type: 'record-list',
				title: 'Rekeningen',
				content: {
					endpointSource: { url: '/apps/shillinq/api/v1/cash-position', responsePath: 'accounts' },
					title: '{name}',
					meta: '{iban}',
					trailing: '{balance|currency}',
					headerCount: true,
				},
			}],

			layout: [{ id: '1', widgetId: 'accounts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		}
	},
}
</script>
