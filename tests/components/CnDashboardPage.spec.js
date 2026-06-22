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

describe('CnDashboardPage — custom-widget date chip (layout dateChip opt-in)', () => {
	// The chip renders inside CnWidgetWrapper's #title-meta slot, so the
	// wrapper stub must forward that named slot (the shared `stubs` above
	// only renders the default slot).
	const chipStubs = {
		...stubs,
		CnWidgetWrapper: {
			template: `
				<div class="cn-widget-wrapper-stub">
					<div class="cn-widget-wrapper-stub__title-meta"><slot name="title-meta" /></div>
					<slot />
				</div>
			`,
			props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor'],
		},
		CnDateRangePicker: { template: '<div class="cn-date-range-picker-stub" />' },
		NcActions: { template: '<div class="nc-actions-stub" v-bind="$attrs"><slot name="icon" /><slot /></div>' },
		NcActionButton: { template: '<button class="nc-action-button-stub"><slot /></button>' },
		NcActionInput: { template: '<input class="nc-action-input-stub" />' },
		NcActionSeparator: { template: '<hr class="nc-action-separator-stub" />' },
	}

	const widgets = [{ id: 'custom1', title: 'Custom analytics', type: 'custom' }]

	const mountWith = (layoutExtra = {}, propsExtra = {}) => mount(CnDashboardPage, {
		propsData: {
			widgets,
			layout: [{ id: '1', widgetId: 'custom1', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, ...layoutExtra }],
			dateRange: { enabled: true },
			...propsExtra,
		},
		scopedSlots: {
			'widget-custom1': '<div class="custom-body">body</div>',
		},
		stubs: chipStubs,
	})

	beforeEach(() => {
		window.localStorage.clear()
	})

	it('renders the shared date chip on a custom widget when layout dateChip is true', () => {
		const wrapper = mountWith({ dateChip: true })
		const chip = wrapper.find('[data-testid="cn-dashboard-page-date-chip-custom1"]')
		expect(chip.exists()).toBe(true)
		// The chip label is the formatted SHARED dashboard range (last-7
		// fallback resolves a from/to window on created()).
		expect(wrapper.find('.cn-dashboard-page__date-chip').text()).not.toHaveLength(0)
		wrapper.destroy()
	})

	it('renders NO chip on a custom widget without the dateChip flag', () => {
		const wrapper = mountWith({})
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-chip-custom1"]').exists()).toBe(false)
		wrapper.destroy()
	})

	it('renders NO chip when the dashboard dateRange feature is disabled', () => {
		const wrapper = mountWith({ dateChip: true }, { dateRange: null })
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-chip-custom1"]').exists()).toBe(false)
		wrapper.destroy()
	})

	it('hides the header picker but keeps the chip when showHeaderPicker is false', () => {
		const wrapper = mountWith({ dateChip: true }, { dateRange: { enabled: true, showHeaderPicker: false } })
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-range"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-dashboard-page-date-chip-custom1"]').exists()).toBe(true)
		wrapper.destroy()
	})
})

describe('CnDashboardPage — per-widget configure cog (ADR-041)', () => {
	// A configure-cog overlay renders per widget in edit mode and opens the
	// style/config editor. The editor itself is stubbed so we can assert the
	// open/save/delete wiring without booting the real modal.
	const editStubs = {
		...stubs,
		// Identify each overlay control so we can target the cog vs the trash.
		NcButton: {
			template: '<button class="nc-button-stub" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
			props: ['type', 'ariaLabel'],
		},
		CnWidgetStyleEditorModal: {
			template: '<div class="cn-widget-style-editor-modal-stub" :data-show="show" :data-widget-id="widget && widget.id" :data-deletable="deletable" />',
			props: ['show', 'widget', 'deletable'],
		},
	}

	const widgets = [{ id: 'w1', title: 'Widget One', type: 'custom' }]
	const layout = [{ id: '1', widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }]

	const mountEditing = (extraWidgets = []) => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets: [...widgets, ...extraWidgets], layout, allowEdit: true },
			scopedSlots: { 'widget-w1': '<div class="custom-body">body</div>' },
			stubs: editStubs,
		})
		// Enter edit mode so the per-widget overlay renders.
		wrapper.vm.toggleEdit()
		return wrapper
	}

	it('renders a configure cog per widget in edit mode', async () => {
		const wrapper = mountEditing()
		await wrapper.vm.$nextTick()
		const cog = wrapper.find('[aria-label="Configure widget"]')
		expect(cog.exists()).toBe(true)
		wrapper.destroy()
	})

	it('does NOT render the overlay when not editing', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout, allowEdit: true },
			scopedSlots: { 'widget-w1': '<div class="custom-body">body</div>' },
			stubs: editStubs,
		})
		expect(wrapper.find('.cn-dashboard-page__widget-edit').exists()).toBe(false)
		expect(wrapper.find('.cn-widget-style-editor-modal-stub').exists()).toBe(false)
		wrapper.destroy()
	})

	it('clicking the cog opens the config modal for that widget', async () => {
		const wrapper = mountEditing()
		await wrapper.vm.$nextTick()
		await wrapper.find('[aria-label="Configure widget"]').trigger('click')
		expect(wrapper.vm.showWidgetConfig).toBe(true)
		expect(wrapper.vm.configWidgetId).toBe('w1')
		const modal = wrapper.find('.cn-widget-style-editor-modal-stub')
		expect(modal.exists()).toBe(true)
		expect(modal.attributes('data-widget-id')).toBe('w1')
		expect(modal.attributes('data-deletable')).toBe('true')
		wrapper.destroy()
	})

	it('save updates the widget definition in place and closes the modal', async () => {
		const wrapper = mountEditing()
		wrapper.vm.configureWidget({ widgetId: 'w1' })
		await wrapper.vm.$nextTick()
		wrapper.vm.onWidgetConfigSave({
			id: 'w1',
			title: 'Renamed',
			styleConfig: { backgroundColor: '#abcdef' },
			showTitle: false,
			customTitle: 'Custom',
			customIcon: 'M1,1',
			content: { foo: 'bar' },
		})
		const def = wrapper.props('widgets').find((w) => w.id === 'w1')
		expect(def.title).toBe('Renamed')
		expect(def.styleConfig).toEqual({ backgroundColor: '#abcdef' })
		expect(def.showTitle).toBe(false)
		expect(def.customTitle).toBe('Custom')
		expect(def.customIcon).toBe('M1,1')
		expect(def.content).toEqual({ foo: 'bar' })
		expect(wrapper.vm.showWidgetConfig).toBe(false)
		expect(wrapper.emitted('layout-change')).toBeTruthy()
		wrapper.destroy()
	})

	it('delete from the editor removes the widget and closes the modal', async () => {
		const wrapper = mountEditing()
		wrapper.vm.configureWidget({ widgetId: 'w1' })
		await wrapper.vm.$nextTick()
		wrapper.vm.onWidgetConfigDelete({ id: 'w1' })
		expect(wrapper.props('layout').some((l) => l.widgetId === 'w1')).toBe(false)
		expect(wrapper.props('widgets').some((w) => w.id === 'w1')).toBe(false)
		expect(wrapper.vm.showWidgetConfig).toBe(false)
		wrapper.destroy()
	})
})
