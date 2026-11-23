<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Two tabs widgets on one dashboard (?l7=l18-tabs-actions-off), as board
  ShDebiteurenbeheer's strip in shillinq #2031: the first turns its Actions
  menu off with `content.showActions: false`, the second keeps it. The real
  CnDashboardPage under the board look; the spec stubs the lists.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="l18-tabs-actions-off">
		<CnDashboardPage
			title="Debiteurenbeheer"
			:widgets="widgets"
			:layout="layout"
			:showHeader="false" />
	</div>
</template>

<script>
import CnDashboardPage from '../../../src/components/CnDashboardPage/CnDashboardPage.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/components/CnWidgetObjectTable/dashboardRegistration.js'
import '../../../src/css/index.css'

export default {
	name: 'L18TabsActionsOff',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		const table = (schema) => ({ source: { register: 'shillinq', schema }, columns: [{ key: 'title', label: 'Title' }] })
		const tabs = [
			{ widgetId: 'open-invoices', label: 'Open balance' },
			{ widgetId: 'reminder-runs', label: 'Reminder runs' },
		]
		return {
			widgets: [
				{ id: 'quiet-tabs', type: 'tabs', title: 'Receivables', showTitle: false, content: { showActions: false, tabs } },
				{ id: 'menu-tabs', type: 'tabs', title: 'Receivables', showTitle: false, content: { tabs } },
				{ id: 'open-invoices', type: 'object-table', title: 'Open invoices', content: table('ARInvoice') },
				{ id: 'reminder-runs', type: 'object-table', title: 'Reminder runs', content: table('DunningRun') },
			],

			layout: [
				{ id: '1', widgetId: 'quiet-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 5 },
				{ id: '2', widgetId: 'menu-tabs', gridX: 0, gridY: 5, gridWidth: 12, gridHeight: 5 },
			],
		}
	},
}
</script>
