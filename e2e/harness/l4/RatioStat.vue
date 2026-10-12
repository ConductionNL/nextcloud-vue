<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A share tile, an average tile and a count tile in a KPI row (?l4=ratio-stat).
  The aggregation, list and object reads are stubbed by the spec with page.route().
-->
<template>
	<div class="ratio-stat-harness" data-testid="ratio-stat-harness">
		<div v-for="tile in tiles"
			:key="tile.id"
			class="ratio-stat-harness__tile"
			:data-testid="'tile-' + tile.id">
			<CnStatWidget :content="tile.content" />
		</div>
	</div>
</template>

<script>
import { provide, ref } from 'vue'
import CnStatWidget from '../../../src/components/CnStatWidget/CnStatWidget.vue'

export default {
	name: 'RatioStat',

	components: { CnStatWidget },

	setup() {
		provide('cnWorkspaceContext', ref({}))
	},

	data() {
		const base = { register: 'pipelinq', schema: 'ticket' }
		return {
			tiles: [
				{
					id: 'ratio',
					content: {
						label: 'Binnen de termijn',
						format: { style: 'percent', decimals: 0 },
						source: { ...base, kind: 'ratio', metric: 'count', numerator: { filter: { inTime: 'yes' } }, denominator: { filter: { status: 'resolved' } } },
					},
				},
				{
					id: 'elapsed',
					content: {
						label: 'Gemiddelde antwoordtijd',
						format: { style: 'decimal', decimals: 1, suffix: ' dagen' },
						source: { ...base, kind: 'elapsed', from: 'occurredAt', to: 'resolvedAt', unit: 'days' },
					},
				},
				{
					id: 'open',
					content: {
						label: 'Open op mij',
						source: { ...base, metric: 'count', filter: { status: { notIn: ['resolved', 'closed'] } } },
					},
				},
			],
		}
	},
}
</script>

<style scoped>
.ratio-stat-harness {
	display: grid;
	gap: 16px;
	grid-template-columns: repeat(3, 240px);
}
</style>
