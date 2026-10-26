/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A chart on a detail page's card surface sits in a titled card, as every
 * other body widget does (ADR-062). The host drew it bare, so a chart's
 * manifest title and subtitle never showed and it floated on the page
 * without an edge (DqHandhaving "Advies volgens de Landelijke
 * Handhavingsstrategie"). In a tab panel (bare) it stays as it is.
 *
 * @spec openspec/changes/detail-chart-titled-card/specs/widget-hosts/spec.md#requirement-a-detail-chart-sits-in-a-titled-card
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const ChartStub = {
	name: 'CnChartWidget',
	props: ['type', 'cellSource', 'objectData'],
	template: '<div class="chart-stub" :data-type="type" />',
}

const WrapperStub = {
	name: 'CnWidgetWrapper',
	props: ['title', 'subtitle'],
	template: '<section class="wrapper-stub" :data-title="title" :data-subtitle="subtitle"><slot /></section>',
}

/**
 * Mount a chart widget through the host.
 *
 * @param {string} chrome The chrome mode.
 * @return {import('@vue/test-utils').VueWrapper} The host.
 */
function mountChart(chrome) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'lhs-matrix', type: 'chart', title: 'Advice', subtitle: 'The chosen cell is outlined', content: { chartKind: 'matrix', cellSource: { register: 'r', schema: 's' } } },
			chrome,
			object: { id: 'o-1', matrixVersion: 1 },
		},
		global: { provide: { cnRegistry: {} }, stubs: { CnChartWidget: ChartStub, CnWidgetWrapper: WrapperStub } },
	})
}

describe('CnDetailWidgetHost chart card', () => {
	it('draws a chart on a card surface in a titled card with its subtitle', () => {
		const w = mountChart('card')
		const card = w.find('.wrapper-stub')
		expect(card.exists()).toBe(true)
		expect(card.attributes('data-title')).toBe('Advice')
		expect(card.attributes('data-subtitle')).toBe('The chosen cell is outlined')
		expect(card.find('.chart-stub').attributes('data-type')).toBe('matrix')
	})

	it('still hands the chart the record, so its tokens resolve', () => {
		const chart = mountChart('card').findComponent(ChartStub)
		expect(chart.props('objectData')).toEqual({ id: 'o-1', matrixVersion: 1 })
		expect(chart.props('cellSource')).toEqual({ register: 'r', schema: 's' })
	})

	it('stays bare in a tab panel', () => {
		const w = mountChart('bare')
		expect(w.find('.wrapper-stub').exists()).toBe(false)
		expect(w.find('.chart-stub').exists()).toBe(true)
	})
})
