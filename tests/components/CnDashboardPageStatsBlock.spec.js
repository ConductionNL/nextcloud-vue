/**
 * Tests for CnDashboardPage's stats-block widget dispatcher — focused on the
 * `getStatsBlockProps` allowlist after the `iconClass` forwarding addition
 * (manifest-icons-and-page-actions change).
 *
 * Verifies that:
 * - `props.iconClass` is forwarded through to CnStatsBlockWidget
 * - Existing allowlisted props (countLabel, variant, …) still forward
 * - Unknown `props.*` keys are still dropped at the dispatcher boundary
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

// The widget's setup() calls useDataSource which kicks off a real
// network fetch by default; stub it so the test stays synchronous and
// we only assert the v-bind payload reaching CnStatsBlockWidget.
jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({ data: { count: 7 }, loading: false, error: null }),
}))

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const baseLayout = [{ id: 1, widgetId: 'sources', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4 }]

const stubs = {
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
	// Stub CnStatsBlockWidget so we can read the v-bind payload off its
	// attributes — the dispatcher passes all keys from getStatsBlockProps
	// plus :data-source, and we want to assert iconClass arrives.
	CnStatsBlockWidget: {
		template: '<div class="cn-stats-block-widget-stub" :data-icon-class="iconClass" :data-title="title" :data-count-label="countLabel" :data-variant="variant" />',
		props: ['title', 'dataSource', 'countLabel', 'variant', 'showZeroCount', 'horizontal', 'route', 'iconClass'],
	},
	CnTileWidget: { template: '<div class="cn-tile-widget-stub" />', props: ['tile'] },
	CnChartWidget: { template: '<div class="cn-chart-widget-stub" />' },
	CnWidgetRenderer: { template: '<div class="cn-widget-renderer-stub" />' },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

describe('CnDashboardPage — stats-block iconClass forwarding', () => {
	it('forwards props.iconClass through getStatsBlockProps to CnStatsBlockWidget', () => {
		const widgets = [{
			id: 'sources',
			title: 'Sources',
			type: 'stats-block',
			props: { iconClass: 'icon-link', countLabel: 'sources', variant: 'primary' },
			dataSource: { register: 'oc', schema: 'sources', aggregate: 'count' },
		}]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout: baseLayout }, stubs })

		const stub = wrapper.find('.cn-stats-block-widget-stub')
		expect(stub.exists()).toBe(true)
		expect(stub.attributes('data-icon-class')).toBe('icon-link')
		expect(stub.attributes('data-count-label')).toBe('sources')
		expect(stub.attributes('data-variant')).toBe('primary')
	})

	it('returns the full allowlist via getStatsBlockProps()', () => {
		const widgets = [{
			id: 'sources',
			title: 'Sources',
			type: 'stats-block',
			props: {
				iconClass: 'icon-link',
				countLabel: 'sources',
				variant: 'warning',
				showZeroCount: false,
				horizontal: true,
				route: { name: 'SourcesIndex' },
				unknownKey: 'should-be-dropped',
			},
			dataSource: { register: 'oc', schema: 'sources', aggregate: 'count' },
		}]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout: baseLayout }, stubs })

		const out = wrapper.vm.getStatsBlockProps({ widgetId: 'sources' })
		expect(out).toEqual({
			title: 'Sources',
			iconClass: 'icon-link',
			countLabel: 'sources',
			variant: 'warning',
			showZeroCount: false,
			horizontal: true,
			route: { name: 'SourcesIndex' },
		})
		expect(out).not.toHaveProperty('unknownKey')
	})

	it('omits iconClass from the v-bind payload when the widgetDef does not declare it', () => {
		const widgets = [{
			id: 'sources',
			title: 'Sources',
			type: 'stats-block',
			props: { countLabel: 'sources' },
			dataSource: { register: 'oc', schema: 'sources', aggregate: 'count' },
		}]
		const wrapper = mount(CnDashboardPage, { propsData: { widgets, layout: baseLayout }, stubs })
		const out = wrapper.vm.getStatsBlockProps({ widgetId: 'sources' })
		expect(out).not.toHaveProperty('iconClass')
	})
})
