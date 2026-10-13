<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Three charts with a fixed height (?l7=chart-box-fits), as pipelinq's
  Rapportage draws them in 518px cards: a bar, a line and a donut chart.
-->
<template>
	<div data-testid="chart-box-fits" style="display: flex; flex-direction: column; gap: 16px; width: 518px">
		<CnChartWidget
			type="bar"
			:height="250"
			:series="[{ name: 'Leads', data: [4, 7, 3, 9, 5] }]"
			:categories="['jun', 'jul', 'aug', 'sep', 'okt']" />
		<CnChartWidget
			type="line"
			:height="265"
			:series="[{ name: 'Gewonnen', data: [1, 3, 2, 5, 4] }]"
			:categories="['jun', 'jul', 'aug', 'sep', 'okt']" />
		<CnChartWidget
			type="donut"
			:height="250"
			:series="[5, 3, 2]"
			:labels="['Web', 'E-mail', 'Telefoon']" />
	</div>
</template>

<script>
import CnChartWidget from '../../../src/components/CnChartWidget/CnChartWidget.vue'

export default {
	name: 'ChartBoxFits',

	components: { CnChartWidget },
}
</script>
