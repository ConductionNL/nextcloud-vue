/**
 * Tests for the tile config CnDashboardPage hands to CnTileWidget.
 *
 * Regression: a tile added through the Add-widget modal rendered with no icon,
 * no working link and CnTileWidget's fallback blue, while its title showed
 * fine. The modal stores the form's fields in the widget def's `content`, and
 * `getTileConfig` only read the def's top level — where the modal happens to
 * write `title` and nothing else.
 */

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

// Mock browser-only deps to avoid import-graph failures. `jest.mock` is
// hoisted above the imports regardless of where it is written.
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const stubs = {
	// Renders the widget template for every layout item, so the dispatched
	// component and its props are reachable.
	CnDashboardGrid: {
		template: `
			<div class="cn-dashboard-grid-stub">
				<div v-for="item in layout" :key="item.id" class="cn-dashboard-grid-stub__item">
					<slot name="widget" :item="item" />
				</div>
			</div>
		`,
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /></div>', props: ['title'] },
	CnWidgetRenderer: { template: '<div class="cn-widget-renderer-stub" />', props: ['widget'] },
	CnTileWidget: { template: '<div class="cn-tile-widget-stub" />', props: ['tile'] },
	CnChartWidget: { template: '<div class="cn-chart-widget-stub" />', props: ['type'] },
	NcButton: { template: '<button />' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

const LAYOUT = [{ id: 1, widgetId: 't', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2 }]

function tileProp(widgets) {
	const wrapper = mount(CnDashboardPage, {
		propsData: { widgets, layout: LAYOUT },
		stubs,
	})
	return wrapper.findComponent(stubs.CnTileWidget).props('tile')
}

describe('CnDashboardPage — tile config', () => {
	it('reads a tile authored through the Add-widget modal from content', () => {
		// The shape CnBuildiqEditButton.onAddWidgetSubmit writes: the header
		// title at the top level, every tile field inside `content`.
		const tile = tileProp([{
			id: 't',
			type: 'tile',
			title: 'Docs',
			showTitle: true,
			content: {
				title: 'Docs',
				icon: 'M12 0',
				iconType: 'svg',
				backgroundColor: '#ff8800',
				textColor: '#000000',
				linkType: 'url',
				linkValue: 'https://example.com/docs',
			},
		}])

		expect(tile).toEqual({
			title: 'Docs',
			icon: 'M12 0',
			iconType: 'svg',
			backgroundColor: '#ff8800',
			textColor: '#000000',
			linkType: 'url',
			linkValue: 'https://example.com/docs',
		})
	})

	it('still reads a preset/legacy tile from the def top level', () => {
		const tile = tileProp([{
			id: 't',
			type: 'tile',
			title: 'Files',
			icon: 'M12 0',
			iconType: 'svg',
			backgroundColor: '#0082c9',
			textColor: '#fff',
			linkType: 'app',
			linkValue: 'files',
		}])

		expect(tile.icon).toBe('M12 0')
		expect(tile.backgroundColor).toBe('#0082c9')
		expect(tile.linkValue).toBe('files')
	})

	it('prefers content over a top-level value for the same field', () => {
		const tile = tileProp([{
			id: 't',
			type: 'tile',
			title: 'Header title',
			icon: 'chrome-icon',
			backgroundColor: '#000000',
			content: { icon: 'tile-icon', backgroundColor: '#ffffff' },
		}])

		expect(tile.icon).toBe('tile-icon')
		expect(tile.backgroundColor).toBe('#ffffff')
		// The modal resolves the header title, so that one stays authoritative.
		expect(tile.title).toBe('Header title')
	})
})
