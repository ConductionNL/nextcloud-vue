/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * vue3-apexcharts is loaded with the first chart on a page, not with the
 * bundle that imports CnChartWidget, so a page without charts never fetches it.
 */

let component = null
let pending = null

/**
 * The vue3-apexcharts component once it has loaded, otherwise null.
 *
 * @return {object|null} The component.
 */
export function loadedApexCharts() {
	return component
}

/**
 * Load the vue3-apexcharts component once for every chart on the page.
 *
 * @return {Promise<object|null>} The component, or null when it failed to load.
 */
export function loadApexCharts() {
	if (component) {
		return Promise.resolve(component)
	}
	if (!pending) {
		pending = import('vue3-apexcharts')
			.then((mod) => {
				component = mod.default || mod
				return component
			})
			.catch((error) => {
				pending = null
				// eslint-disable-next-line no-console
				console.error('[CnChartWidget] vue3-apexcharts could not be loaded', error)
				return null
			})
	}
	return pending
}
