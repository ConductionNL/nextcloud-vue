/**
 * Tests for per-widget Refresh visibility on CnDashboardPage.
 *
 * Custom-slot widgets resolve Refresh via the `widgetShowRefresh` tri-state
 * (explicit prop, else a wired `@widget-refresh` listener — see
 * CnDashboardPageActionsMenu.spec) and are independent of the page-level
 * `showRefresh` prop, which governs the built-in chart / NC / integration
 * widgets. On top of that a widget can override individually via
 * `showRefresh` / `hideRefresh` on its definition or layout entry.
 */

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

// CnWidgetWrapper stub that records the resolved show-refresh per widget id.
const WidgetWrapperStub = {
	name: 'CnWidgetWrapper',
	props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor', 'showRefresh', 'widgetId'],
	template: '<div class="cn-widget-wrapper-stub" :data-title="title" :data-show-refresh="String(showRefresh)" :data-widget-id="widgetId"><slot /></div>',
}

const stubs = {
	CnDashboardGrid: {
		template: `
			<div class="grid">
				<div v-for="item in layout" :key="item.id" :data-widget-id="item.widgetId">
					<slot name="widget" :item="item" />
				</div>
			</div>`,
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: WidgetWrapperStub,
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const layout = [
	{ id: 1, widgetId: 'alpha', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 },
	{ id: 2, widgetId: 'beta', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
]
const widgets = [{ id: 'alpha', title: 'Alpha', type: 'custom' }, { id: 'beta', title: 'Beta', type: 'custom' }]

const mountPage = (propsData = {}) => mount(CnDashboardPage, {
	propsData: { widgets, layout, ...propsData },
	stubs,
	scopedSlots: {
		'widget-alpha': '<div class="body" />',
		'widget-beta': '<div class="body" />',
	},
})

const refreshOf = (wrapper, title) => wrapper.findAll('.cn-widget-wrapper-stub')
	.find((w) => w.attributes('data-title') === title)
	.attributes('data-show-refresh')

describe('CnDashboardPage — per-widget Refresh visibility', () => {
	it('custom widgets hide Refresh by default (no listener / widgetShowRefresh)', () => {
		const wrapper = mountPage()
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('false')
	})

	it('widgetShowRefresh:true shows Refresh on every custom widget', () => {
		const wrapper = mountPage({ widgetShowRefresh: true })
		expect(refreshOf(wrapper, 'Alpha')).toBe('true')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('custom widgets ignore the page-level showRefresh prop (it governs built-in widgets)', () => {
		// Page-level Refresh off, but widgetShowRefresh keeps custom widgets on.
		const wrapper = mountPage({ showRefresh: false, widgetShowRefresh: true })
		expect(refreshOf(wrapper, 'Alpha')).toBe('true')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('a widget definition can opt out via showRefresh:false while the rest keep Refresh', () => {
		const wrapper = mountPage({
			widgetShowRefresh: true,
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', showRefresh: false }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('hideRefresh on a widget definition also drops Refresh', () => {
		const wrapper = mountPage({
			widgetShowRefresh: true,
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', hideRefresh: true }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('a widget can opt back IN via showRefresh:true while widgetShowRefresh is off', () => {
		const wrapper = mountPage({
			widgetShowRefresh: false,
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', showRefresh: true }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('true')
		expect(refreshOf(wrapper, 'Beta')).toBe('false')
	})

	it('a per-layout-entry showRefresh override is honoured too', () => {
		const wrapper = mountPage({
			widgetShowRefresh: true,
			layout: [
				{ id: 1, widgetId: 'alpha', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, showRefresh: false },
				{ id: 2, widgetId: 'beta', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
			],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})
})

// The chrome's Refresh broadcasts `cn:widget:refresh` with the wrapper's
// `widgetId` in the payload; without the id the payload matches no
// subscriber and the per-widget Refresh silently does nothing (only the
// page-level Refresh — which needs no id — worked).
describe('CnDashboardPage — a per-widget Refresh reaches the widget (widget-id wiring)', () => {
	const RegistryProbe = {
		name: 'RegistryProbe',
		props: ['widgetId', 'content'],
		template: '<div class="registry-probe" :data-widget-id="widgetId" />',
	}
	registerDashboardWidget('refresh-probe', { renderer: RegistryProbe, form: {}, defaultContent: {}, displayName: 'P', icon: 'X' })

	it('gives the custom-slot chrome the layout item widget id', () => {
		const wrapper = mountPage({ widgetShowRefresh: true })
		const alpha = wrapper.findAll('.cn-widget-wrapper-stub')
			.find((w) => w.attributes('data-title') === 'Alpha')
		expect(alpha.attributes('data-widget-id')).toBe('alpha')
	})

	it('gives a registry widget the id on BOTH sides: the broadcasting chrome and the subscribing renderer', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				widgets: [{ id: 'queue', title: 'Queue', type: 'refresh-probe' }],
				layout: [{ id: 1, widgetId: 'queue', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }],
			},
			stubs,
		})
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-widget-id')).toBe('queue')
		expect(wrapper.find('.registry-probe').attributes('data-widget-id')).toBe('queue')
	})
})
