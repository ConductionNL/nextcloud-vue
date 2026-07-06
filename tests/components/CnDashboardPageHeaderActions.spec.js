/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Verifies CnDashboardPage renders CnActionButtons from its declarative
 * `headerActions` prop (#91 Wave 3) — the surface CnPageRenderer fills
 * from pages[].config.headerActions.
 */

import { shallowMount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

function mountDash(propsData = {}) {
	return shallowMount(CnDashboardPage, {
		propsData,
		stubs: {
			CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="action-buttons-stub" />' },
		},
	})
}

describe('CnDashboardPage — headerActions (#91 Wave 3)', () => {
	it('renders CnActionButtons with the declarative headerActions', () => {
		const headerActions = [
			{ id: 'new-lead', label: 'New lead', type: 'open-form', schema: 'lead' },
		]
		const wrapper = mountDash({ title: 'Dash', headerActions })
		const surface = wrapper.findComponent({ name: 'CnActionButtons' })
		expect(surface.exists()).toBe(true)
		expect(surface.props('actions')).toEqual(headerActions)
	})

	it('does not render the surface when headerActions is empty (additive default)', () => {
		const wrapper = mountDash({ title: 'Dash' })
		expect(wrapper.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
	})
})

describe('CnDashboardPage — chart endpointSource forwarding (#91 Wave 2/3)', () => {
	function mountChartDash(propsData) {
		return shallowMount(CnDashboardPage, {
			propsData,
			stubs: {
				CnChartWidget: { name: 'CnChartWidget', props: ['endpointSource', 'dataSource', 'views'], template: '<div class="chart-stub" />' },
				CnWidgetWrapper: { name: 'CnWidgetWrapper', template: '<div><slot /></div>' },
				CnDashboardGrid: {
					name: 'CnDashboardGrid',
					props: ['layout'],
					template: '<div><template v-for="item in layout"><slot name="widget" :item="item" /></template></div>',
				},
			},
		})
	}

	it('forwards a chart widget endpointSource to CnChartWidget (unblocks the fleet trend charts)', () => {
		const endpointSource = {
			url: '/apps/pipelinq/api/analytics/trends',
			responsePath: 'series',
			labelsPath: 'date',
			series: [{ name: 'Leads', path: 'value' }],
		}
		const wrapper = mountChartDash({
			title: 'Analytics',
			widgets: [{ id: 'trend', type: 'chart', props: { chartKind: 'line', endpointSource } }],
			layout: [{ id: 'l1', widgetId: 'trend', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }],
		})
		const chart = wrapper.findComponent({ name: 'CnChartWidget' })
		expect(chart.exists()).toBe(true)
		expect(chart.props('endpointSource')).toEqual(endpointSource)
	})

	it('forwards a chart widget dataSource (aggregate/drilldown ride inside it)', () => {
		const dataSource = {
			register: 'crm', schema: 'request',
			aggregate: { groupBy: 'status', topN: 5, otherBucket: true },
			drilldown: { route: 'Requests', filterParam: 'status' },
		}
		const wrapper = mountChartDash({
			title: 'Breakdown',
			widgets: [{ id: 'byStatus', type: 'chart', props: { chartKind: 'donut' }, dataSource }],
			layout: [{ id: 'l1', widgetId: 'byStatus', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }],
		})
		const chart = wrapper.findComponent({ name: 'CnChartWidget' })
		expect(chart.props('dataSource')).toEqual(dataSource)
	})
})
