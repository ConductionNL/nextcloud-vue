/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The selection a host shows on a CnChartWidget (`selected`): which drawn
 * categories it names, how their ApexCharts marks are flagged for the
 * shadow-root outline, and the ApexCharts options that leave the selection to
 * the host.
 */

import { SELECTABLE_MARKS } from './chartShadow.js'

/**
 * The indices of the categories whose raw key is selected, never the folded
 * "Other" bucket.
 *
 * @param {Array<string|number>} keys The raw category keys, index-aligned with the drawn categories.
 * @param {Array<string|number>} selected The raw keys to show as selected.
 * @param {string} otherKey The raw key of the folded "Other" bucket.
 * @return {number[]} The selected indices.
 * @spec openspec/changes/chart-widget-selected/specs/chart-widget-selected/spec.md#requirement-a-chart-shows-the-categories-a-host-marks-as-selected
 */
export function selectedIndicesOf(keys, selected, otherKey) {
	const wanted = new Set((Array.isArray(selected) ? selected : []).map((key) => String(key)))
	if (wanted.size === 0 || !Array.isArray(keys)) {
		return []
	}
	return keys
		.map((key, index) => (key !== otherKey && wanted.has(String(key)) ? index : -1))
		.filter((index) => index !== -1)
}

/**
 * Flag the drawn bars and slices of the selected indices with
 * `data-cn-selected`, and clear the flag on every other mark.
 *
 * @param {Element|null} root The chart container.
 * @param {number[]} indices The selected indices.
 * @return {void}
 * @spec openspec/changes/chart-widget-selected/specs/chart-widget-selected/spec.md#requirement-a-chart-shows-the-categories-a-host-marks-as-selected
 */
export function markSelectedMarks(root, indices) {
	if (!root || typeof root.querySelectorAll !== 'function') {
		return
	}
	const wanted = indices.map((index) => String(index))
	root.querySelectorAll(SELECTABLE_MARKS).forEach((mark) => {
		if (wanted.includes(mark.getAttribute('j'))) {
			mark.setAttribute('data-cn-selected', 'true')
		} else {
			mark.removeAttribute('data-cn-selected')
		}
	})
}

/**
 * The ApexCharts options of a chart whose selection the host owns: its own
 * click darkening off and, for a pie or donut, no slice expansion, both of
 * which would linger after the host clears the selection.
 *
 * @param {boolean} isPie Whether the chart is a pie, donut or radial bar.
 * @return {object} The options to merge into the defaults.
 * @spec openspec/changes/chart-widget-selected/specs/chart-widget-selected/spec.md#requirement-a-chart-shows-the-categories-a-host-marks-as-selected
 */
export function hostSelectionOptions(isPie) {
	const options = { states: { active: { filter: { type: 'none' } } } }
	if (isPie) {
		options.plotOptions = { pie: { expandOnClick: false } }
	}
	return options
}
