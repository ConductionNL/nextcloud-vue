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

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

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
