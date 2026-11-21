<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  A drill-down dashboard's charts taking new data (?l7=chart-filter-update),
  as launchpad's cross-widget filter feeds them: a 30-bar wijk chart across the
  row and a status chart beside a gemeente chart. `?quiet=1` turns the
  host's animations off, as launchpad's measurement does. `window.__chartFilter(i)`
  swaps in gemeente i's wijken and statuses, the way a filtered group-by
  answer replaces both the series and the categories at once.
-->
<template>
	<div data-testid="chart-filter-update" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px; width: 1280px">
		<div style="grid-column: span 6; height: 300px">
			<CnChartWidget
				data-testid="chart-filter-a"
				type="bar"
				:selectable="true"
				:options="options"
				:series="gemeenteSeries"
				:categories="gemeenten" />
		</div>
		<div style="grid-column: span 6; height: 300px">
			<CnChartWidget
				data-testid="chart-filter-e"
				type="bar"
				:options="options"
				:series="statusSeries"
				:categories="statuses" />
		</div>
		<div style="grid-column: span 12; height: 300px">
			<CnChartWidget
				data-testid="chart-filter-b"
				type="bar"
				:selectable="true"
				:options="options"
				:series="wijkSeries"
				:categories="wijken" />
		</div>
		<!-- ?heavy=<n>: n table rows under the charts, for a page as full as a live dashboard. -->
		<HeavyRows v-if="heavy > 0" :rows="heavy" style="grid-column: span 12" />
	</div>
</template>

<script>
import { h } from 'vue'
import CnChartWidget from '../../../src/components/CnChartWidget/CnChartWidget.vue'

/** Rows of filler, in their own component so a filter step does not re-render them. */
const HeavyRows = {
	name: 'HeavyRows',
	props: { rows: { type: Number, required: true } },
	render() {
		return h('table', Array.from({ length: this.rows }, (_, row) => h('tr', { key: row }, Array.from({ length: 6 }, (__, cell) => h('td', { key: cell }, [h('span', `${row}.${cell}`)])))))
	},
}

const GEMEENTEN = Array.from({ length: 12 }, (_, i) => `GM${String(300 + i * 7).padStart(4, '0')}`)
const STATUSES = ['nieuw', 'in behandeling', 'afgerond', 'geannuleerd']

/**
 * A deterministic pseudo-random count, so every run draws the same bars.
 *
 * @param {number} seed The seed.
 * @return {number} A count between 20 and 1,700.
 */
function count(seed) {
	return 20 + Math.abs(Math.round(Math.sin(seed * 9301 + 49297) * 1680))
}

export default {
	name: 'ChartFilterUpdate',

	components: { CnChartWidget, HeavyRows },

	data() {
		const query = new URLSearchParams(window.location.search)
		const quiet = query.get('quiet') === '1'
		return {
			heavy: Number(query.get('heavy') || 0),
			options: quiet ? { chart: { animations: { enabled: false } } } : {},
			gemeenten: GEMEENTEN,
			gemeenteSeries: [{ name: 'count', data: GEMEENTEN.map((_, i) => count(i)) }],
			wijken: [],
			wijkSeries: [{ name: 'count', data: [] }],
			statuses: STATUSES,
			statusSeries: [{ name: 'count', data: STATUSES.map((_, i) => count(100 + i)) }],
		}
	},

	created() {
		this.apply(0)
		window.__chartFilter = (index) => this.apply(index)
	},

	methods: {
		/**
		 * Show gemeente `index`'s 30 wijken and its status counts.
		 *
		 * @param {number} index The gemeente.
		 * @return {void}
		 */
		apply(index) {
			const code = GEMEENTEN[index % GEMEENTEN.length].slice(2)
			const wijken = Array.from({ length: 30 }, (_, i) => `WK${code}${String(i).padStart(2, '0')}`)
			this.wijken = wijken
			this.wijkSeries = [{ name: 'count', data: wijken.map((_, i) => count(index * 31 + i)) }]
			this.statusSeries = [{ name: 'count', data: STATUSES.map((_, i) => count(index * 5 + i + 200)) }]
		},
	},
}
</script>
