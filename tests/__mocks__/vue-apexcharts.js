/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Global Jest stub for `vue-apexcharts`.
 *
 * The real `vue-apexcharts` pulls in `apexcharts`, whose renderer needs a
 * live DOM (querySelectorAll on the mounted node) and throws in jsdom. Chart
 * specs each declared a local `jest.mock('vue-apexcharts', …, { virtual: true })`,
 * but any OTHER spec that imports CnChartWidget transitively (CnDashboardPage,
 * CnWidgetWrapper, …) WITHOUT that mock loaded the REAL module into the worker
 * — and under some full-suite file orderings the real renderer then ran inside
 * a chart spec, throwing `Cannot read properties of undefined (reading 'filter'
 * / 'querySelectorAll')`. Mapping the module to this stub GLOBALLY (jest.config
 * moduleNameMapper) means no test ever loads real apexcharts, so the stub
 * applies deterministically regardless of file order.
 *
 * The stub is a minimal Vue 2 functional-ish component named
 * `vue-apexcharts-stub` (the name the chart specs assert on) that renders an
 * empty div and accepts every prop as an attribute.
 */
module.exports = {
	__esModule: true,
	default: {
		name: 'vue-apexcharts-stub',
		render(h) {
			return h('div', { class: 'vue-apexcharts-stub' })
		},
		methods: {
			// CnChartWidget calls this.$refs.chart.refresh() on resize.
			refresh() {},
		},
	},
}
