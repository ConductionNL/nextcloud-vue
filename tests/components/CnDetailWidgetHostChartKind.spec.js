/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A chart on a detail page reads `content.chartKind` as its `type`, as the
 * dashboard dispatcher does (DqHandhaving). The host passed only declared
 * props, CnChartWidget declares `type` and not `chartKind`, so the kind was
 * dropped and the chart drew the default area chart or nothing.
 *
 * @spec openspec/changes/detail-chart-kind/specs/widget-hosts/spec.md#requirement-a-detail-chart-reads-chartkind-as-its-type
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const ChartStub = {
	name: 'CnChartWidget',
	props: ['type', 'categories', 'series', 'content'],
	template: '<div class="chart-stub" :data-type="type" />',
}

/**
 * Mount a chart widget through the host.
 *
 * @param {object} content The widget content.
 * @return {import('@vue/test-utils').VueWrapper} The host.
 */
function mountChart(content) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'matrix', type: 'chart', content }, chrome: 'card' },
		global: { provide: { cnRegistry: {} }, stubs: { CnChartWidget: ChartStub } },
	})
}

describe('CnDetailWidgetHost chartKind', () => {
	it('passes content.chartKind as the chart type', () => {
		const w = mountChart({ chartKind: 'matrix', categories: ['A'], series: [] })
		expect(w.vm.declaredContent.type).toBe('matrix')
		expect(w.vm.declaredContent.chartKind).toBeUndefined()
	})

	it('keeps an explicit content.type', () => {
		const w = mountChart({ chartKind: 'matrix', type: 'bar' })
		expect(w.vm.declaredContent.type).toBe('bar')
	})

	it('changes nothing without chartKind', () => {
		const w = mountChart({ type: 'line' })
		expect(w.vm.declaredContent.type).toBe('line')
	})
})
