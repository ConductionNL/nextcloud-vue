<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The chart chrome that ApexCharts draws outside its SVG, for a look check
  (?l7=chart-shadow-look): a bar chart with its toolbar and legend, a line
  chart whose hover shows the crosshair axis tooltip, a donut with legend
  values, and a container-fitting area chart. `?dark=1` sets Nextcloud's dark
  theme tokens and `?nlds=1` an NL Design System style font and palette, the
  way a theme app hands them down as custom properties.
-->
<template>
	<div data-testid="chart-shadow-look" class="chart-shadow-look" :class="{ 'chart-shadow-look--dark': dark, 'chart-shadow-look--nlds': nlds }">
		<div data-testid="look-bar" class="chart-shadow-look__cell">
			<CnChartWidget
				type="bar"
				:height="260"
				:toolbar="true"
				:legend="true"
				:series="[{ name: 'Open', data: [4, 7, 3, 9, 5] }, { name: 'Gesloten', data: [2, 5, 6, 4, 8] }]"
				:categories="['jun', 'jul', 'aug', 'sep', 'okt']" />
		</div>
		<div data-testid="look-line" class="chart-shadow-look__cell">
			<CnChartWidget
				type="line"
				:height="260"
				:options="{ xaxis: { crosshairs: { show: true }, tooltip: { enabled: true } } }"
				:series="[{ name: 'Gewonnen', data: [1, 3, 2, 5, 4] }]"
				:categories="['jun', 'jul', 'aug', 'sep', 'okt']" />
		</div>
		<div data-testid="look-donut" class="chart-shadow-look__cell">
			<CnChartWidget
				type="donut"
				:height="260"
				:legendValues="true"
				:series="[5, 3, 2]"
				:labels="['Web', 'E-mail', 'Telefoon']" />
		</div>
		<div data-testid="look-fit" class="chart-shadow-look__cell" style="height: 260px">
			<CnChartWidget
				type="area"
				height="100%"
				:series="[{ name: 'Zaken', data: [12, 18, 9, 22, 15, 26] }]"
				:categories="['mei', 'jun', 'jul', 'aug', 'sep', 'okt']" />
		</div>
	</div>
</template>

<script>
import CnChartWidget from '../../../src/components/CnChartWidget/CnChartWidget.vue'

export default {
	name: 'ChartShadowLook',

	components: { CnChartWidget },

	data() {
		const query = new URLSearchParams(window.location.search)
		return {
			dark: query.get('dark') === '1',
			nlds: query.get('nlds') === '1',
		}
	},
}
</script>

<style scoped>
.chart-shadow-look {
	display: grid;
	grid-template-columns: repeat(2, 480px);
	gap: 16px;
	padding: 16px;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.chart-shadow-look__cell {
	min-height: 260px;
}

/* Nextcloud's dark theme (apps/theming DarkTheme), as custom properties. */
.chart-shadow-look--dark {
	--color-main-text: #ebebeb;
	--color-main-background: #171717;
	--color-background-hover: #212121;
	--color-text-maxcontrast: #9e9e9e;
	--color-border: #292929;
	--color-box-shadow: #000000;
}

/* An NL Design System theme hands its font and palette down the same way. */
.chart-shadow-look--nlds {
	--default-font: Georgia, 'Times New Roman', serif;
	--color-primary-element: #154273;
	--color-main-text: #1b1b1b;
	font-family: var(--default-font);
}
</style>
