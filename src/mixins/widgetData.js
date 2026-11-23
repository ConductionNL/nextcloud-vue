/*
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * widgetData — a self-fetching widget tells its host what it shows.
 *
 * A widget that fetches its own data (CnChartWidget, CnStatsBlockWidget)
 * keeps that data to itself, so a host that derives values from it (a
 * dashboard's calculated fields, an export) has nothing to read. A widget
 * using this mixin defines a `widgetData` computed returning a plain,
 * serialisable summary of what it shows, or null while there is nothing yet;
 * the mixin emits `data` with that summary whenever it changes, including the
 * first time it is known.
 *
 * @spec openspec/changes/widget-data-event/specs/widget-data-event/spec.md#requirement-a-self-fetching-widget-tells-its-host-what-it-shows
 */
export default {
	emits: ['data'],

	watch: {
		widgetData: {
			immediate: true,
			/**
			 * Emit the summary once it is known, and on every change.
			 *
			 * @param {object|null} summary The widget's data summary.
			 * @return {void}
			 */
			handler(summary) {
				if (summary !== null && summary !== undefined) {
					/**
					 * What the widget shows, as a plain summary.
					 *
					 * @event data
					 * @type {object}
					 */
					this.$emit('data', summary)
				}
			},
		},
	},
}

/**
 * The sum of the numbers in a chart series: a list of numbers (a pie or
 * donut) or the `data` of its first named series. Non-numbers count as 0.
 *
 * @param {Array<number|object>|undefined} series The series.
 * @return {number|null} The total, or null for no series.
 * @spec openspec/changes/widget-data-event/specs/widget-data-event/spec.md#requirement-a-self-fetching-widget-tells-its-host-what-it-shows
 */
export function seriesTotal(series) {
	if (!Array.isArray(series) || series.length === 0) {
		return null
	}
	const values = typeof series[0] === 'object' && series[0] !== null ? series[0].data : series
	if (!Array.isArray(values)) {
		return null
	}
	return values.reduce((sum, value) => {
		const number = typeof value === 'object' && value !== null ? Number(value.y) : Number(value)
		return Number.isFinite(number) ? sum + number : sum
	}, 0)
}
