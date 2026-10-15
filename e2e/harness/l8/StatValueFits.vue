<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Stacked board stat tiles in 162px card-fit cells (?l8=stat-value-fits,
  stat-value-fits, pipelinq's operational dashboard at 1100 wide): a currency
  value too wide for the tile steps its font down instead of being clipped,
  and a short value keeps its size. The values are stubbed by the spec. Beside them a register mapping, which
  labels its register select once.
-->
<template>
	<div class="cn-look-board" data-testid="stat-value-fits">
		<div style="display: flex; gap: 16px">
			<div v-for="tile in tiles"
				:key="tile.label"
				class="stat-value-fits__cell"
				data-testid="stat-value-fits-cell">
				<CnStatWidget :content="tile" />
			</div>
		</div>
		<div style="width: 560px" data-testid="stat-value-fits-mapping">
			<CnRegisterMapping :groups="groups" :configuration="{ register: '5' }" />
		</div>
	</div>
</template>

<script>
import CnRegisterMapping from '../../../src/components/CnRegisterMapping/CnRegisterMapping.vue'
import CnStatWidget from '../../../src/components/CnStatWidget/CnStatWidget.vue'

import '../../../src/css/index.css'

export default {
	name: 'StatValueFits',

	components: { CnRegisterMapping, CnStatWidget },

	provide() {
		return { cnLook: 'board' }
	},

	data() {
		return {
			tiles: [
				{ label: 'Pipeline value', layout: 'stacked', endpointSource: { url: '/apps/pipelinq/api/kpi/pipeline' }, valueField: 'value', format: { style: 'currency', currency: 'EUR', decimals: 0 } },
				{ label: 'Open leads', layout: 'stacked', endpointSource: { url: '/apps/pipelinq/api/kpi/leads' }, valueField: 'value' },
			],

			groups: [{ name: 'Pipelinq Objects', types: [{ slug: 'client', label: 'Client' }] }],
		}
	},
}
</script>

<style scoped>
/* The card-fit content area of CnDashboardPage at 1100 wide. */
.stat-value-fits__cell {
	display: flex;
	flex-direction: column;
	justify-content: safe center;
	width: 162px;
	height: 118px;
	padding: 8px 14px;
	overflow: hidden;
	border: 1px solid var(--color-border);
}
</style>
