<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A tabs widget on a dashboard whose tabs' widgets declare `headerLink`
  (?l7=l18-tabs-header-link), as board ShDebiteurenbeheer's strip in
  shillinq #2031: the real CnDashboardPage under the board look, a router to
  follow. The spec stubs the lists.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="l18-tabs-header-link">
		<CnDashboardPage
			title="Debiteurenbeheer"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
		<p data-testid="l18-route">
			{{ $route ? $route.name : '' }}
		</p>
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/components/CnWidgetObjectTable/dashboardRegistration.js'
import '../../../src/css/index.css'

export default {
	name: 'L18TabsHeaderLink',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		const table = (schema) => ({ source: { register: 'shillinq', schema }, columns: [{ key: 'title', label: 'Title' }] })
		return {
			widgets: [
				{
					id: 'receivables-tabs',
					type: 'tabs',
					title: 'Receivables',
					showTitle: false,
					content: {
						tabs: [
							{ widgetId: 'open-invoices', label: 'Open balance' },
							{ widgetId: 'reminder-runs', label: 'Reminder runs' },
							{ widgetId: 'payment-request-table', label: 'Payment requests' },
						],
					},
				},
				{ id: 'open-invoices', type: 'object-table', title: 'Open invoices', content: table('ARInvoice'), headerLink: { label: 'Alle verkoopfacturen', route: 'AccountsReceivable' } },
				{ id: 'reminder-runs', type: 'object-table', title: 'Reminder runs', content: table('DunningRun') },
				{ id: 'payment-request-table', type: 'object-table', title: 'Payment requests', content: table('PaymentRequest'), headerLink: { label: 'All payment requests', route: 'PaymentRequests' } },
			],

			layout: [{ id: '1', widgetId: 'receivables-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6 }],
		}
	},
}
</script>
