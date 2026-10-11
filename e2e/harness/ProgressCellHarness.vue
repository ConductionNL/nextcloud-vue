<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Progress cells as PqLeads' Winkans column (?progresscell=1).
-->
<template>
	<table class="progress-cell-harness" data-testid="progress-cell-harness">
		<tbody>
			<tr v-for="row in rows" :key="row.id" :data-testid="`progress-row-${row.id}`">
				<td>
					<CnCellRenderer
						:value="row.qualificationScore"
						:row="row"
						widget="progress"
						:widgetProps="widgetProps" />
				</td>
			</tr>
		</tbody>
	</table>
</template>

<script>
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'

const ago = (days) => new Date(Date.now() - days * 86400000 - 3600000).toISOString()

export default {
	name: 'ProgressCellHarness',

	components: { CnCellRenderer },

	data() {
		return {
			rows: [
				{ id: 'good', qualificationScore: 70, status: 'open', '@self': { updated: ago(1) } },
				{ id: 'stale', qualificationScore: 22, status: 'open', '@self': { updated: ago(24) } },
			],

			widgetProps: {
				badge: { label: 'Verouderd {days} dagen', afterDays: 14, when: { status: 'open' } },
			},
		}
	},
}
</script>

<style scoped>
.progress-cell-harness td {
	padding: 12px;
	width: 320px;
}
</style>
