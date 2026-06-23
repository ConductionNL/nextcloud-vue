/**
 * Tests for per-widget Refresh visibility on CnDashboardPage.
 *
 * Each widget's overflow menu inherits the page-level `showRefresh` prop by
 * default, so a read-only dashboard (`showRefresh: false`) drops the dead
 * Refresh item from every widget while keeping Request-a-feature. A widget
 * can override individually via `showRefresh` / `hideRefresh` on its
 * definition or layout entry.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

// CnWidgetWrapper stub that records the resolved show-refresh per widget id.
const WidgetWrapperStub = {
	name: 'CnWidgetWrapper',
	props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor', 'showRefresh'],
	template: '<div class="cn-widget-wrapper-stub" :data-title="title" :data-show-refresh="String(showRefresh)"><slot /></div>',
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
	.wrappers.find((w) => w.attributes('data-title') === title)
	.attributes('data-show-refresh')

describe('CnDashboardPage — per-widget Refresh visibility', () => {
	it('widgets show Refresh by default (page showRefresh defaults true)', () => {
		const wrapper = mountPage()
		expect(refreshOf(wrapper, 'Alpha')).toBe('true')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('page-level showRefresh:false cascades to every widget', () => {
		const wrapper = mountPage({ showRefresh: false })
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('false')
	})

	it('a widget definition can opt out individually while the page keeps Refresh on', () => {
		const wrapper = mountPage({
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', showRefresh: false }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})

	it('hideRefresh on a widget definition also drops Refresh', () => {
		const wrapper = mountPage({
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', hideRefresh: true }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
	})

	it('a widget can opt back IN via showRefresh:true while the page turns Refresh off', () => {
		const wrapper = mountPage({
			showRefresh: false,
			widgets: [{ id: 'alpha', title: 'Alpha', type: 'custom', showRefresh: true }, { id: 'beta', title: 'Beta', type: 'custom' }],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('true')
		expect(refreshOf(wrapper, 'Beta')).toBe('false')
	})

	it('a per-layout-entry showRefresh override is honoured too', () => {
		const wrapper = mountPage({
			layout: [
				{ id: 1, widgetId: 'alpha', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, showRefresh: false },
				{ id: 2, widgetId: 'beta', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
			],
		})
		expect(refreshOf(wrapper, 'Alpha')).toBe('false')
		expect(refreshOf(wrapper, 'Beta')).toBe('true')
	})
})
