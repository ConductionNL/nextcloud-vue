/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for chart tiles fitting their dashboard tile instead of scrolling
 * inside it.
 *
 * The defect: CnChartWidget's standalone default is a pinned 250px height, and
 * CnDashboardPage forwarded nothing, so on a tile whose content box is shorter
 * than 250px (an h=4 tile is 4 × cellHeight less the widget header) the
 * wrapper's `overflow: auto` content area turned into a scroll region — the
 * user had to scroll the tile to see the whole graph.
 *
 * The fix has two halves, and both are asserted here because either one alone
 * is inert: the dashboard passes `height: '100%'`, and CnChartWidget renders a
 * leftover-sized canvas box so apexcharts' percentage maths resolves against
 * the available space rather than against the chart's own height.
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper (both the
// Vue-2 and Vue-3 package names map to it).
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: jest.fn(),
	}),
}))

import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const barProps = {
	type: 'bar',
	series: [{ name: 'Revenue', data: [10, 20] }],
	categories: ['Q1', 'Q2'],
}

const mountChart = (props = {}) => mount(CnChartWidget, { propsData: props })

const dashboardStubs = {
	CnDashboardGrid: {
		template: `
			<div class="cn-dashboard-grid-stub">
				<div v-for="item in layout" :key="item.id" class="cn-dashboard-grid-stub__item" :data-widget-id="item.widgetId">
					<slot name="widget" :item="item" />
				</div>
			</div>
		`,
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: {
		template: '<div class="cn-widget-wrapper-stub"><slot /></div>',
		props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor'],
	},
	CnChartWidget: {
		template: '<div class="cn-chart-widget-stub" :data-height="String(height)" />',
		props: ['type', 'series', 'categories', 'labels', 'options', 'colors', 'toolbar', 'legend', 'height', 'width', 'unavailableLabel'],
	},
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

const chartWidgetDef = (props = {}) => ([{
	id: 'sla',
	title: 'SLA trend',
	type: 'chart',
	props: { chartKind: 'line', series: [{ name: 'SLA %', data: [1, 2] }], ...props },
}])

const chartLayout = [{ id: 1, widgetId: 'sla', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }]

const mountDashboard = (widgets) => mount(CnDashboardPage, {
	propsData: { widgets, layout: chartLayout },
	stubs: dashboardStubs,
})

describe('CnChartWidget — container fitting', () => {
	it('keeps the pinned-height rendering by default (regression)', () => {
		const wrapper = mountChart(barProps)
		expect(wrapper.vm.fitToContainer).toBe(false)
		expect(wrapper.vm.computedHeight).toBe(250)
		expect(wrapper.classes()).not.toContain('cn-chart-widget--fit')
	})

	it('treats a percentage height as container fitting', () => {
		const wrapper = mountChart({ ...barProps, height: '100%' })
		expect(wrapper.vm.fitToContainer).toBe(true)
		expect(wrapper.classes()).toContain('cn-chart-widget--fit')
	})

	it('forwards the percentage to apexcharts rather than resolving it itself', () => {
		// apexcharts owns the percentage maths (Core.js setSVGDimensions), so
		// the prop must arrive unconverted.
		expect(mountChart({ ...barProps, height: '50%' }).vm.computedHeight).toBe('50%')
	})

	it('does not mistake a pixel string or "auto" for a percentage', () => {
		expect(mountChart({ ...barProps, height: '300px' }).vm.fitToContainer).toBe(false)
		expect(mountChart({ ...barProps, height: 'auto' }).vm.fitToContainer).toBe(false)
	})

	it('mounts the chart inside a canvas box, which is what the percentage resolves against', () => {
		// apexcharts measures `el.parentNode`. If the chart were a direct child
		// of the root, the percentage would resolve against a box the chart
		// itself sizes — circular, and it would ignore the view-switcher row.
		const wrapper = mountChart({ ...barProps, height: '100%' })
		const canvas = wrapper.find('.cn-chart-widget__canvas')
		expect(canvas.exists()).toBe(true)
		expect(canvas.find('.vue-apexcharts-stub').exists()).toBe(true)
	})
})

describe('CnDashboardPage — chart tiles fit their tile', () => {
	it('passes a container-fitting height when the manifest authors none', () => {
		const chart = mountDashboard(chartWidgetDef()).find('.cn-chart-widget-stub')
		expect(chart.attributes('data-height')).toBe('100%')
	})

	it('an authored height still wins', () => {
		const chart = mountDashboard(chartWidgetDef({ height: 180 })).find('.cn-chart-widget-stub')
		expect(chart.attributes('data-height')).toBe('180')
	})

	it('an authored height on the in-app `content` config also wins', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA trend',
			type: 'chart',
			content: { chartKind: 'line', height: 200 },
		}]
		const chart = mountDashboard(widgets).find('.cn-chart-widget-stub')
		expect(chart.attributes('data-height')).toBe('200')
	})

	it('marks the chart wrapper so its content area stops scrolling', () => {
		// The class is the hook for the :deep(.cn-widget-wrapper__content)
		// overflow override — without it the wrapper's default `overflow: auto`
		// still shows a scrollbar on any rounding difference.
		const wrapper = mountDashboard(chartWidgetDef())
		expect(wrapper.find('.cn-widget-wrapper-stub').classes()).toContain('cn-dashboard-page__chart-fit')
	})

	// That class carries `overflow: hidden`, which is right for a graph sized to
	// the tile and wrong for one pinned taller than it: the bottom of the chart
	// became unreachable, with the scroll affordance removed.
	it('does NOT clip a tile whose chart has an authored pixel height', () => {
		const wrapper = mountDashboard(chartWidgetDef({ height: 400 }))
		expect(wrapper.find('.cn-widget-wrapper-stub').classes()).not.toContain('cn-dashboard-page__chart-fit')
	})

	it('treats an authored percentage height as fitting', () => {
		const wrapper = mountDashboard(chartWidgetDef({ height: '80%' }))
		expect(wrapper.find('.cn-widget-wrapper-stub').classes()).toContain('cn-dashboard-page__chart-fit')
	})

	it('does not clip an authored height on the in-app `content` config either', () => {
		const widgets = [{ id: 'sla', title: 'SLA trend', type: 'chart', content: { chartKind: 'line', height: 200 } }]
		expect(mountDashboard(widgets).find('.cn-widget-wrapper-stub').classes())
			.not.toContain('cn-dashboard-page__chart-fit')
	})
})

// `vue3-apexcharts`' refresh() is destroy() + init(): it throws the instance
// away, rebuilds it and replays the entry animation. With fitted charts now the
// dashboard default, every GridStack layout settle ran that for every chart tile.
describe('CnChartWidget — resize redraw', () => {
	it('re-measures through apexcharts own resize path, not a rebuild', () => {
		const wrapper = mountChart({ ...barProps, height: '100%' })
		const windowResize = jest.fn()
		const refresh = jest.spyOn(wrapper.vm.$refs.chart, 'refresh')
		wrapper.vm.$refs.chart.chart = { _windowResize: windowResize }

		wrapper.vm.redrawForResize()

		expect(windowResize).toHaveBeenCalledTimes(1)
		expect(refresh).not.toHaveBeenCalled()
	})

	it('falls back to a rebuild when the instance is not reachable', () => {
		const wrapper = mountChart({ ...barProps, height: '100%' })
		const refresh = jest.spyOn(wrapper.vm.$refs.chart, 'refresh')

		wrapper.vm.redrawForResize()

		expect(refresh).toHaveBeenCalledTimes(1)
	})
})
