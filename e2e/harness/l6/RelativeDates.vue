<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Relative dates in a table cell and in a record-list meta line
  (?l6=relative-dates): "vandaag, 09.42", "gisteren", then a short date.
  The record-list request is stubbed by the spec.
-->
<template>
	<div class="l6-relative-dates" data-testid="l6-relative-dates">
		<ul class="l6-relative-dates__cells">
			<li v-for="(row, i) in rows" :key="i" :data-testid="'cell-' + i">
				<CnCellRenderer
					:value="row.at"
					:row="row"
					:column="{ key: 'at' }"
					widget="date"
					:widgetProps="{ relative: true, showTime: true }" />
			</li>
		</ul>
		<CnRecordListWidget :content="content" />
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnCellRenderer from '../../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnRecordListWidget from '../../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

export default {
	name: 'RelativeDates',

	components: { CnCellRenderer, CnRecordListWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		const at = (daysAgo, hours, minutes) => {
			const d = new Date()
			d.setDate(d.getDate() - daysAgo)
			d.setHours(hours, minutes, 0, 0)
			return d.toISOString()
		}
		return {
			rows: [{ at: at(0, 9, 42) }, { at: at(1, 23, 12) }, { at: at(4, 8, 5) }],
			content: {
				register: 'portaliq',
				schema: 'inzending',
				title: '{title}',
				meta: '{app} · {submittedAt|relativetime}',
			},
		}
	},
}
</script>
