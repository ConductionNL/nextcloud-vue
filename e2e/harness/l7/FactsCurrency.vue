<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A facts card over an invoice whose amounts are money (?l7=facts-currency),
  as the shillinq invoice page: the total in euros, the open amount in the
  invoice's own currency, and the raw number as a control.
-->
<template>
	<div class="cn-look-board" style="width: 420px" data-testid="facts-currency">
		<CnDetailWidgetHost
			:widget="widget"
			chrome="card"
			objectId="inv-1"
			:object="invoice"
			register="shillinq"
			schema="invoice" />
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../../src/css/index.css'

export default {
	name: 'FactsCurrency',

	components: { CnDetailWidgetHost },

	data() {
		return {
			invoice: { id: 'inv-1', number: 'F-2026-0001', total: 1234.5, open: 250, currency: 'USD' },
			widget: {
				id: 'amounts',
				type: 'facts',
				title: 'Bedragen',
				content: {
					fields: [
						{ path: 'total', label: 'Totaal', format: 'currency' },
						{ path: 'open', label: 'Openstaand', format: 'currency', currencyField: 'currency' },
						{ path: 'total', label: 'Ruw' },
					],
				},
			},
		}
	},
}
</script>
