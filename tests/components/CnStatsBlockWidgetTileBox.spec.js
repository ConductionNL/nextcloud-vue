/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stats-block grid with `tiles: "box"` draws each tile on a surface of its
 * own (screens-stats-block-tile-box, board DcRapportages); without it the
 * tiles stay parts of the card (board PqMijnWerk).
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => new Promise(() => {})) },
}))

import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnStatsBlockWidget from '../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue'

const stats = [{ label: 'Vergaderingen dit jaar' }, { label: 'Opkomst' }]

describe('stats-block grid tiles', () => {
	it('boxes the tiles with tiles: "box"', () => {
		const wrapper = mount(CnStatsBlockWidget, { props: { title: 'Vergaderingen en efficiëntie', layout: 'grid', columns: 4, stats, tiles: 'box' } })
		expect(wrapper.classes()).toContain('cn-stats-block-widget--tiles-box')
		expect(wrapper.findAll('[data-testid="cn-stats-block-grid-stat"]')).toHaveLength(2)
		wrapper.unmount()
	})

	it('keeps the tiles without a box by default', () => {
		const wrapper = mount(CnStatsBlockWidget, { props: { title: 'Je week tot nu toe', layout: 'grid', stats } })
		expect(wrapper.classes()).not.toContain('cn-stats-block-widget--tiles-box')
		wrapper.unmount()
	})

	it('ignores tiles outside the grid layout', () => {
		const wrapper = mount(CnStatsBlockWidget, { props: { title: 'Open', tiles: 'box', dataSource: { register: 'r', schema: 's', metric: 'count' } } })
		expect(wrapper.classes()).not.toContain('cn-stats-block-widget--tiles-box')
		wrapper.unmount()
	})

	it('the dashboard forwards content.tiles to the widget', () => {
		const def = { id: 'efficiency', type: 'stats-block', title: 'Vergaderingen en efficiëntie', content: { layout: 'grid', columns: 4, tiles: 'box', stats } }
		const ctx = { getWidgetDef: () => def, effectiveTranslate: (text) => text }
		const props = CnDashboardPage.methods.getStatsBlockProps.call(ctx, { widgetId: 'efficiency' })
		expect(props).toMatchObject({ layout: 'grid', columns: 4, tiles: 'box', stats })
	})

	it('the dashboard leaves tiles out when the widget names none', () => {
		const def = { id: 'my-week', type: 'stats-block', content: { layout: 'grid', stats } }
		const ctx = { getWidgetDef: () => def, effectiveTranslate: (text) => text }
		expect(CnDashboardPage.methods.getStatsBlockProps.call(ctx, { widgetId: 'my-week' })).not.toHaveProperty('tiles')
	})
})
