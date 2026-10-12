<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A money amount in a record-list template and in a table cell
  (?l6=currency-format). The list request is stubbed by the spec.
-->
<template>
	<div data-testid="l6-currency-format">
		<CnRecordListWidget :content="content" />
		<CnCellRenderer
			class="l6-money-cell"
			:value="2500"
			:row="{ currency: 'USD' }"
			:column="{ key: 'amount' }"
			:format="{ style: 'currency', currencyField: 'currency' }" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnCellRenderer from '../../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'CurrencyFormat',

	components: { CnCellRenderer, CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		return {
			content: {
				register: 'pipelinq',
				schema: 'lead',
				title: '{title}',
				trailing: '{value|currency:EUR}',
			},
		}
	},
}
</script>
