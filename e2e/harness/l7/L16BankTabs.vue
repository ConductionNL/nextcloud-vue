<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A tabs widget on a dashboard (?l7=l16-bank-tabs), as board ShBank's
  Rekeningen / Afschriften strip: the real CnDashboardPage under the board
  look, each tab an object-table the page declares. The spec stubs the lists.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="l16-bank-tabs">
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
import '../../../src/components/CnWidgetObjectTable/dashboardRegistration.js'
import '../../../src/css/index.css'

export default {
	name: 'L16BankTabs',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [
				{
					id: 'bank-tabs',
					type: 'tabs',
					title: 'Bank',
					content: {
						tabs: [
							{ widgetId: 'accounts', label: 'Rekeningen', countFrom: 'widget' },
							{ widgetId: 'statements', label: 'Afschriften', countFrom: 'widget' },
						],
					},
				},
				{
					id: 'accounts',
					type: 'object-table',
					title: 'Rekeningen',
					content: { source: { register: 'shillinq', schema: 'BankAccount' }, columns: [{ key: 'name', label: 'Naam' }] },
				},
				{
					id: 'statements',
					type: 'object-table',
					title: 'Afschriften',
					content: { source: { register: 'shillinq', schema: 'BankStatement' }, columns: [{ key: 'reference', label: 'Kenmerk' }] },
				},
			],

			layout: [{ id: '1', widgetId: 'bank-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 5 }],
		}
	},
}
</script>
