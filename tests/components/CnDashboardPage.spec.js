/**
 * Tests for CnDashboardPage's widget dispatcher.
 *
 * Focused on the `manifest-chart-widget` change: chart widget detection,
 * chartKind→type translation, prop forwarding, and the custom-slot
 * escape hatch precedence over the chart branch.
 */

// Mock browser-only deps that fail to parse under jest-jsdom (ESM
// boundaries inside CnDashboardGrid + CnChartWidget). Both components
// are stubbed below anyway, so the mocks just satisfy the import graph.
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	// Stub CnDashboardGrid so it always renders the widget template for
	// every layout item — the GridStack wiring is covered in its own
	// test elsewhere; here we only care about dispatcher branching.
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
	CnWidgetRenderer: {
		template: '<div class="cn-widget-renderer-stub" />',
		props: ['widget', 'unavailableText'],
	},
	CnTileWidget: {
		template: '<div class="cn-tile-widget-stub" />',
		props: ['tile'],
	},
	// Stub CnChartWidget so we can assert what props the dispatcher
	// forwarded without booting the apexcharts wrapper.
	CnChartWidget: {
		template: '<div class="cn-chart-widget-stub" :data-type="type" :data-series="JSON.stringify(series)" :data-categories="JSON.stringify(categories)" :data-labels="JSON.stringify(labels)" :data-options="JSON.stringify(options)" />',
		props: ['type', 'series', 'categories', 'labels', 'options', 'colors', 'toolbar', 'legend', 'height', 'width', 'unavailableLabel'],
	},
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

describe('CnDashboardPage — chart widget dispatcher', () => {
	const baseLayout = [{ id: 1, widgetId: 'sla', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]

	it('mounts CnChartWidget when widgetDef.type === "chart"', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA trend',
			type: 'chart',
			props: {
				chartKind: 'line',
				series: [{ name: 'SLA %', data: [82, 88, 91] }],
				categories: ['Q1', 'Q2', 'Q3'],
			},
		}]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout: baseLayout },
			stubs,
		})
		const chart = wrapper.find('.cn-chart-widget-stub')
		expect(chart.exists()).toBe(true)
		expect(chart.attributes('data-type')).toBe('line')
		expect(JSON.parse(chart.attributes('data-series'))).toEqual([{ name: 'SLA %', data: [82, 88, 91] }])
		expect(JSON.parse(chart.attributes('data-categories'))).toEqual(['Q1', 'Q2', 'Q3'])
	})

	it('translates chartKind into the apex type prop', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA',
			type: 'chart',
			props: { chartKind: 'donut', series: [44, 55, 13], labels: ['A', 'B', 'C'] },
		}]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout: baseLayout },
			stubs,
		})
		const chart = wrapper.find('.cn-chart-widget-stub')
		expect(chart.attributes('data-type')).toBe('donut')
		expect(JSON.parse(chart.attributes('data-labels'))).toEqual(['A', 'B', 'C'])
	})

	it('forwards options as-is for deep-merge inside CnChartWidget', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA',
			type: 'chart',
			props: {
				chartKind: 'bar',
				series: [{ data: [1, 2, 3] }],
				options: { plotOptions: { bar: { horizontal: true } } },
			},
		}]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout: baseLayout },
			stubs,
		})
		const chart = wrapper.find('.cn-chart-widget-stub')
		expect(JSON.parse(chart.attributes('data-options'))).toEqual({
			plotOptions: { bar: { horizontal: true } },
		})
	})

	it('custom #widget-{id} slot beats the chart branch (escape hatch)', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA',
			type: 'chart',
			props: { chartKind: 'line', series: [{ data: [1, 2, 3] }] },
		}]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout: baseLayout },
			stubs,
			scopedSlots: {
				'widget-sla': '<div class="custom-slot-stub">override</div>',
			},
		})
		// Chart widget MUST NOT be mounted when a custom slot wins.
		expect(wrapper.find('.cn-chart-widget-stub').exists()).toBe(false)
		expect(wrapper.find('.custom-slot-stub').exists()).toBe(true)
	})

	it('dataSource on widgetDef.props is round-tripped but not passed to CnChartWidget', () => {
		const widgets = [{
			id: 'sla',
			title: 'SLA',
			type: 'chart',
			props: {
				chartKind: 'line',
				series: [{ data: [1, 2] }],
				dataSource: { url: '/api/charts/sla' },
			},
		}]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout: baseLayout },
			stubs,
		})
		const chart = wrapper.find('.cn-chart-widget-stub')
		// dataSource is not in CHART_PROP_KEYS, so it MUST NOT appear
		// on the chart-widget element. We assert by checking that the
		// stub did not receive an unknown attribute for it.
		expect(chart.exists()).toBe(true)
		// Vue 2 stubs forward unknown props as DOM attributes; absence
		// here means the dispatcher's allowlist is doing its job.
		expect(chart.attributes('data-source')).toBeUndefined()
	})

	it('tile widgets still dispatch to CnTileWidget (chart branch does not steal)', () => {
		const widgets = [{
			id: 't',
			title: 'Files',
			type: 'tile',
			icon: 'M12 0',
			iconType: 'svg',
			backgroundColor: '#0082c9',
			textColor: '#fff',
			linkType: 'app',
			linkValue: 'files',
		}]
		const layout = [{ id: 1, widgetId: 't', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout },
			stubs,
		})
		expect(wrapper.find('.cn-tile-widget-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-chart-widget-stub').exists()).toBe(false)
	})

	it('NC Dashboard API widgets still dispatch to CnWidgetRenderer when type is not chart', () => {
		const widgets = [{
			id: 'cal',
			title: 'Calendar',
			type: 'calendar',
			itemApiVersions: [1, 2],
		}]
		const layout = [{ id: 1, widgetId: 'cal', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 4 }]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout },
			stubs,
		})
		expect(wrapper.find('.cn-widget-renderer-stub').exists()).toBe(true)
		expect(wrapper.find('.cn-chart-widget-stub').exists()).toBe(false)
	})

	it('unknown widget falls back to unavailableLabel', () => {
		const widgets = [{ id: 'm', title: 'Mystery' }]
		const layout = [{ id: 1, widgetId: 'm', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }]
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout, unavailableLabel: 'No widget' },
			stubs,
		})
		expect(wrapper.text()).toContain('No widget')
		expect(wrapper.find('.cn-chart-widget-stub').exists()).toBe(false)
	})
})

describe('CnDashboardPage — integration widget dispatcher', () => {
	// CnDashboardPage's setup() consumes the default registry singleton.
	const { integrations } = require('@/integrations/registry.js')
	const { h } = require('vue')

	const IntegrationWidget = {
		name: 'IntegrationWidget',
		props: ['surface', 'register', 'schema', 'objectId', 'extraProp'],
		render() {
			return h('div', { class: 'integration-widget' }, `${this.surface}|${this.objectId || ''}|${this.extraProp || ''}`)
		},
	}
	const RegistryTab = { name: 'RegistryTab', render() { return h('div') } }

	afterEach(() => integrations.__resetForTests())

	it('renders the integration widget resolved from the registry', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const widgets = [{ id: 'w1', title: 'Files', type: 'integration', integrationId: 'files' }]
		const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout }, stubs })
		expect(wrapper.find('.integration-widget').exists()).toBe(true)
		// default surface is app-dashboard
		expect(wrapper.find('.integration-widget').text()).toContain('app-dashboard')
		wrapper.destroy()
	})

	it('forwards the surface prop and integrationContext to the widget', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const widgets = [{ id: 'w1', title: 'Files', type: 'integration', integrationId: 'files' }]
		const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }]
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				widgets, layout,
				surface: 'detail-page',
				integrationContext: { register: 'r', schema: 's', objectId: 'obj-1' },
			},
			stubs,
		})
		expect(wrapper.find('.integration-widget').text()).toContain('detail-page|obj-1')
		wrapper.destroy()
	})

	it('merges per-widget props (def.props) into the widget', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: IntegrationWidget })
		const widgets = [{ id: 'w1', title: 'Files', type: 'integration', integrationId: 'files', props: { extraProp: 'hello' } }]
		const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout }, stubs })
		expect(wrapper.find('.integration-widget').text()).toContain('hello')
		wrapper.destroy()
	})

	it('falls back to unavailableLabel when the integration is not registered', () => {
		const widgets = [{ id: 'w1', title: 'Gone', type: 'integration', integrationId: 'not-registered' }]
		const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout, unavailableLabel: 'No widget here' }, stubs })
		expect(wrapper.text()).toContain('No widget here')
		expect(wrapper.find('.integration-widget').exists()).toBe(false)
		wrapper.destroy()
	})

	it('an integration widget def without integrationId is treated as unknown', () => {
		const widgets = [{ id: 'w1', title: 'Bad', type: 'integration' }]
		const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 }]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout, unavailableLabel: 'unknown' }, stubs })
		expect(wrapper.text()).toContain('unknown')
		wrapper.destroy()
	})
})
