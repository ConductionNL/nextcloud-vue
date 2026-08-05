/**
 * Tests for CnDashboardPage's `content[]` widget-ref support.
 *
 * Covers the `manifest-widget-ref-page-content-type` spec (nc-vue #200 §1):
 *  - `content[]` with `widget-ref` items renders CnWidgetRefItem for each entry.
 *  - `hasWidgets` is true when only `content` is set (no layout).
 *  - `widgetRefItems` computed filters out non-widget-ref items and warns.
 *  - Empty `content[]` still falls through to the empty-state.
 *  - Back-compat: existing `widgets`+`layout` dashboards are unaffected.
 */

// Mock browser-only deps to avoid import-graph failures.
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub' }), { virtual: true })

import { shallowMount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

// Lightweight stubs — we only care about structural assertions.
const stubs = {
	CnDashboardGrid: { template: '<div class="cn-dashboard-grid-stub" />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /></div>', props: ['title'] },
	CnWidgetRenderer: { template: '<div class="cn-widget-renderer-stub" />', props: ['widget'] },
	CnTileWidget: { template: '<div class="cn-tile-widget-stub" />', props: ['tile'] },
	CnChartWidget: { template: '<div class="cn-chart-widget-stub" />', props: ['type'] },
	CnStatsBlockWidget: { template: '<div class="cn-stats-block-widget-stub" />', props: ['title'] },
	// CnWidgetRefItem stub — renders a distinguishable element with the ref URI.
	CnWidgetRefItem: {
		template: '<div class="cn-widget-ref-item-stub" :data-ref-uri="refUri" />',
		props: ['refUri'],
	},
	NcButton: { template: '<button />' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
	ViewDashboardOutline: { template: '<span />' },
	AlertCircleOutline: { template: '<span />' },
}

const mountPage = (propsData) => shallowMount(CnDashboardPage, { propsData, stubs })

describe('CnDashboardPage — widget-ref content items', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('widgetRefItems computed', () => {
		it('returns all widget-ref items from content[]', () => {
			const wrapper = mountPage({
				content: [
					{ type: 'widget-ref', ref: 'openregister://widget/regulation/coverageGrid' },
					{ type: 'widget-ref', ref: 'openregister://widget/regulation/boardProof' },
				],
			})
			expect(wrapper.vm.widgetRefItems).toHaveLength(2)
			expect(wrapper.vm.widgetRefItems[0].ref).toBe('openregister://widget/regulation/coverageGrid')
			expect(wrapper.vm.widgetRefItems[1].ref).toBe('openregister://widget/regulation/boardProof')
		})

		it('returns an empty array when content is empty', () => {
			const wrapper = mountPage({ content: [] })
			expect(wrapper.vm.widgetRefItems).toEqual([])
		})

		it('skips and warns on unknown content item types', () => {
			const wrapper = mountPage({
				content: [
					{ type: 'widget-ref', ref: 'openregister://widget/regulation/coverageGrid' },
					{ type: 'component-ref', name: 'MyComponent' },
				],
			})
			expect(wrapper.vm.widgetRefItems).toHaveLength(1)
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"component-ref"'))
		})

		it('returns empty array when content prop is not set (back-compat)', () => {
			const wrapper = mountPage({ widgets: [], layout: [] })
			expect(wrapper.vm.widgetRefItems).toEqual([])
		})
	})

	describe('hasWidgets computed', () => {
		it('is true when content[] has widget-ref items (no layout)', () => {
			const wrapper = mountPage({
				content: [{ type: 'widget-ref', ref: 'openregister://widget/regulation/coverageGrid' }],
			})
			expect(wrapper.vm.hasWidgets).toBe(true)
		})

		it('is true when layout has items (no content)', () => {
			const wrapper = mountPage({
				widgets: [{ id: 'kpis', title: 'KPIs', type: 'custom' }],
				layout: [{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
			})
			expect(wrapper.vm.hasWidgets).toBe(true)
		})

		it('is false when both layout and content are empty', () => {
			const wrapper = mountPage({ content: [], widgets: [], layout: [] })
			expect(wrapper.vm.hasWidgets).toBe(false)
		})
	})

	describe('template rendering', () => {
		it('renders CnWidgetRefItem for each widget-ref content item', () => {
			const wrapper = mountPage({
				content: [
					{ type: 'widget-ref', ref: 'openregister://widget/regulation/coverageGrid' },
					{ type: 'widget-ref', ref: 'openregister://widget/regulation/boardProof' },
				],
			})
			const items = wrapper.findAll('.cn-widget-ref-item-stub')
			expect(items).toHaveLength(2)
			expect(items.at(0).attributes('data-ref-uri')).toBe('openregister://widget/regulation/coverageGrid')
			expect(items.at(1).attributes('data-ref-uri')).toBe('openregister://widget/regulation/boardProof')
		})

		it('renders the empty state when content[] is empty and no layout', () => {
			const wrapper = mountPage({ content: [], layout: [] })
			expect(wrapper.find('.nc-empty-content-stub').exists()).toBe(true)
			expect(wrapper.findAll('.cn-widget-ref-item-stub')).toHaveLength(0)
		})

		it('does NOT render CnDashboardGrid when content items are present (content wins)', () => {
			const wrapper = mountPage({
				content: [{ type: 'widget-ref', ref: 'openregister://widget/regulation/coverageGrid' }],
			})
			expect(wrapper.find('.cn-dashboard-grid-stub').exists()).toBe(false)
			expect(wrapper.find('.cn-widget-ref-item-stub').exists()).toBe(true)
		})

		it('renders CnDashboardGrid when layout is present and no content items', () => {
			const wrapper = mountPage({
				widgets: [{ id: 'kpis', title: 'KPIs', type: 'custom' }],
				layout: [{ id: 1, widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
			})
			expect(wrapper.find('.cn-dashboard-grid-stub').exists()).toBe(true)
			expect(wrapper.findAll('.cn-widget-ref-item-stub')).toHaveLength(0)
		})
	})
})
