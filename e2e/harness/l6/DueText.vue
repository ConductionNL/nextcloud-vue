<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A due date as text with a tone, in a record list and in a table cell
  (?l6=due-text). The list request is stubbed by the spec.
-->
<template>
	<div data-testid="l6-due-text">
		<CnRecordListWidget :content="content" />
		<CnCellRenderer
			class="l6-due-cell"
			:value="cellValue"
			:row="{}"
			:column="{ key: 'deadline' }"
			widget="date"
			:widgetProps="{ due: { emptyText: 'Geen deadline' } }" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnCellRenderer from '../../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'DueText',

	components: { CnCellRenderer, CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
		const d = new Date()
		d.setDate(d.getDate() - 3)
		return { cellValue: d.toISOString() }
	},

	data() {
		return {
			content: {
				register: 'pipelinq',
				schema: 'ticket',
				title: '{title}',
				due: { field: 'deadline', todayLabel: 'Vandaag', emptyText: 'Geen deadline' },
			},
		}
	},
}
</script>
