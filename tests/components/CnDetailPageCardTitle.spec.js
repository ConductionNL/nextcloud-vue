/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's card-widget (stat / gauge / delta) header title.
 *
 * These renderers draw their own label from `content.label`, so the wrapper's
 * header carrying the same manifest title printed it TWICE — once as card
 * chrome, once inside the tile. `showTitle: false` on the layout item was
 * honoured only by the grid `<h3>`, not by the card wrapper, so a consumer had
 * no way to switch the duplicate off short of dropping the widget's title
 * (which also removes its name from edit mode). One layout key, the same
 * meaning on both of this component's title-rendering paths.
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function mountWithCardWidget(layoutExtra = {}) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Agent',
			widgets: [{
				id: 'kpi-total-runs',
				type: 'stat',
				title: 'Total runs',
				content: { label: 'Total runs', value: 12 },
			}],
			layout: [{
				id: '1',
				widgetId: 'kpi-total-runs',
				gridX: 0,
				gridY: 0,
				gridWidth: 3,
				gridHeight: 2,
				...layoutExtra,
			}],
		},
	})
}

describe('CnDetailPage — card widget title', () => {
	it('shows the wrapper header by default (a lone stat must not read as uncarded text)', () => {
		const w = mountWithCardWidget()
		expect(w.vm.showCardTitle(w.vm.bodyGridLayout[0])).toBe(true)
	})

	it('honours showTitle: false on the layout item', () => {
		const w = mountWithCardWidget({ showTitle: false })
		expect(w.vm.showCardTitle(w.vm.bodyGridLayout[0])).toBe(false)
	})

	it('shows no header when neither the widget nor its content declares a title', () => {
		const w = mount(CnDetailPage, {
			propsData: {
				title: 'Agent',
				widgets: [{ id: 'bare', type: 'stat', content: { value: 1 } }],
				layout: [{ id: '1', widgetId: 'bare', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
			},
		})
		expect(w.vm.showCardTitle(w.vm.bodyGridLayout[0])).toBe(false)
	})

	it('falls back to a title declared on content', () => {
		const w = mount(CnDetailPage, {
			propsData: {
				title: 'Agent',
				widgets: [{ id: 'c', type: 'stat', content: { title: 'From content', value: 1 } }],
				layout: [{ id: '1', widgetId: 'c', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
			},
		})
		expect(w.vm.showCardTitle(w.vm.bodyGridLayout[0])).toBe(true)
	})

	it('does not throw for a layout item whose widget is missing', () => {
		const w = mount(CnDetailPage, {
			propsData: {
				title: 'Agent',
				widgets: [],
				layout: [{ id: '1', widgetId: 'gone', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
			},
		})
		expect(() => w.vm.showCardTitle(w.vm.bodyGridLayout[0])).not.toThrow()
		expect(w.vm.showCardTitle(w.vm.bodyGridLayout[0])).toBe(false)
	})

	it('keeps showGridTitle and showCardTitle agreeing on showTitle: false', () => {
		const w = mountWithCardWidget({ showTitle: false })
		const item = w.vm.bodyGridLayout[0]
		expect(w.vm.showGridTitle(item)).toBe(false)
		expect(w.vm.showCardTitle(item)).toBe(false)
	})
})
