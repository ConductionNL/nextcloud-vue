/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage item-4 fix (ADR-062): a lone registry "card" widget
 * (stat / gauge / delta) rendered in the detail-page grid gets the same titled
 * CnWidgetWrapper card chrome as the dashboard gives it — no bare, uncarded
 * floating text.
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
// Importing the widget's index self-registers `stat` (card: true) into the
// shared dashboard widget registry that isCardWidget consults.
import '../../src/components/CnStatWidget/index.js'

function mountPage() {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Contract',
			layout: [{ id: 1, widgetId: 'kpi', gridX: 0, gridY: 0, gridWidth: 4 }],
			widgets: [{ id: 'kpi', type: 'stat', title: 'Total value', content: { label: 'Total value' } }],
		},
		stubs: { CnStatWidget: true, CnWidgetWrapper: { name: 'CnWidgetWrapper', template: '<div class="stub-wrapper"><slot name="title-icon" /><slot /></div>' } },
	})
}

describe('CnDetailPage — card widget chrome', () => {
	it('recognises a stat widget as a card widget', () => {
		const w = mountPage()
		expect(w.vm.isCardWidget({ widgetId: 'kpi' })).toBe(true)
	})

	it('wraps the card widget in CnWidgetWrapper chrome (card-fit)', () => {
		const w = mountPage()
		expect(w.find('.cn-detail-page__card-fit').exists()).toBe(true)
	})
})
