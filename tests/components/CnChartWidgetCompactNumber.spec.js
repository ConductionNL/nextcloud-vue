/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A chart value can be written short, without a currency: 38000 reads "38K"
 * (PqVerkoopoverzicht "Open pijplijn per fase", "Omzet per bron").
 *
 * @spec openspec/changes/chart-compact-number/specs/chart-compact-number/spec.md#requirement-a-chart-value-can-be-written-short
 */
import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const short = (value) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 0 }).format(value)

describe('CnChartWidget valueFormat "compact"', () => {
	it('writes a bar-list value short, with no currency sign', () => {
		const wrapper = mount(CnChartWidget, {
			props: { type: 'bar-list', valueFormat: 'compact', categories: ['Nieuw', 'Voorstel'], series: [{ name: 'v', data: [38000, 237400] }] },
		})
		const values = wrapper.findAll('.cn-chart-widget__bar-value').map((node) => node.text())
		expect(values).toEqual([short(38000), short(237400)])
		expect(values[0]).not.toMatch(/€|EUR/)
	})

	it('takes decimals in the object form', () => {
		const wrapper = mount(CnChartWidget, {
			props: { type: 'bar-list', valueFormat: { name: 'compact', decimals: 1 }, categories: ['a'], series: [{ name: 'v', data: [1250] }] },
		})
		expect(wrapper.find('.cn-chart-widget__bar-value').text()).toBe(new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(1250))
	})

	it('leaves a value that is not a number as it is', () => {
		const wrapper = mount(CnChartWidget, {
			props: { type: 'bar-list', valueFormat: 'compact', categories: ['a'], series: [{ name: 'v', data: [12] }] },
		})
		expect(wrapper.find('.cn-chart-widget__bar-value').text()).toBe('12')
	})
})
