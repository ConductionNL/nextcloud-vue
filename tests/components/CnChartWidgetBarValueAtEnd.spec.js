/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A bar list can draw each bar without a track, its value right after the
 * bar's end (DqProcesanalyse "Doorlooptijd per status"); the dashboard hands
 * the option through.
 *
 * @spec openspec/changes/chart-bar-list-value-at-end/specs/chart-bar-list-value-at-end/spec.md#requirement-a-bar-list-can-put-each-value-at-its-bars-end
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const props = { type: 'bar-list', categories: ['Ontvangst', 'Advies'], series: [{ name: 'h', data: [31, 432] }] }

describe('CnChartWidget bar-list: value at the bar end', () => {
	it('puts the value inside the bar row after the bar, without a track column', () => {
		const wrapper = mount(CnChartWidget, { props: { ...props, barValueAtEnd: true } })
		expect(wrapper.find('.cn-chart-widget__bar-list').classes()).toContain('cn-chart-widget__bar-list--value-at-end')
		const track = wrapper.findAll('.cn-chart-widget__bar-track')[1]
		expect(track.find('.cn-chart-widget__bar-value').text()).toBe('432')
		expect(track.find('.cn-chart-widget__bar-fill').attributes('style')).toContain('flex-basis: 100%')
		expect(wrapper.findAll('.cn-chart-widget__bar-track')[0].find('.cn-chart-widget__bar-fill').attributes('style')).toMatch(/flex-basis: 7\.\d+%/)
	})

	it('keeps the track and the value column by default', () => {
		const wrapper = mount(CnChartWidget, { props })
		expect(wrapper.find('.cn-chart-widget__bar-list').classes()).not.toContain('cn-chart-widget__bar-list--value-at-end')
		expect(wrapper.find('.cn-chart-widget__bar-track .cn-chart-widget__bar-value').exists()).toBe(false)
	})

	it('is a dashboard chart option', () => {
		const page = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')
		expect(page).toMatch(/'barValueAtEnd',/)
	})
})
