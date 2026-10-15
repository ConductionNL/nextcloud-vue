<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A dashboard table whose customer column holds an id (?l7=l16-invoice-customers),
  as board ShDebiteurenbeheer's open invoices: the real CnDashboardPage under
  the board look. The first column names its target with `resolve`, the second
  reads it off the invoice schema's `$ref`. The spec stubs OpenRegister.
-->
<template>
	<div class="cn-look-board" style="width: 1100px" data-testid="l16-invoice-customers">
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
import '../../../src/components/CnWidgetObjectTable/dashboardRegistration.js'
import '../../../src/css/index.css'

export default {
	name: 'L16InvoiceCustomers',

	components: { CnDashboardPage },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			widgets: [{
				id: 'open-invoices',
				type: 'object-table',
				title: 'Openstaande facturen',
				content: {
					source: { register: 'shillinq', schema: 'ARInvoice' },
					columns: [
						{ key: 'customerId', label: 'Klant', labelField: 'legalName', resolve: { register: 'shillinq', schema: 'CustomerMaster' } },
						{ key: 'payerId', label: 'Betaler', labelField: 'legalName' },
						{ key: 'invoiceNumber', label: 'Factuur' },
					],
				},
			}],

			layout: [{ id: '1', widgetId: 'open-invoices', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		}
	},
}
</script>
