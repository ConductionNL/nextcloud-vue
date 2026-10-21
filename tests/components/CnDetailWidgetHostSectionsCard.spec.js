/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A titled `sections` widget in the side column or a tab stack is one titled
 * card, as the boards draw DqZaak "Status" and DqSociaalDomein "Gezinsplan",
 * instead of untitled strips with no card. A grid cell (its own card), a tab
 * panel (bare) and `content.cards` (a card per section) keep their look.
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

function mountHost(widget, props = {}) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'w', type: 'sections', title: 'Status', content: { dividers: false, sections: [] }, ...widget },
			chrome: 'card',
			objectId: 'case-1',
			...props,
		},
		global: { mocks: { t: (_a, s) => s } },
	})
}

const card = '[data-testid="cn-detail-widget-sections-card"]'

describe('CnDetailWidgetHost: a titled sections widget', () => {
	it('draws one titled card around the sections on a card surface', () => {
		const w = mountHost({})
		expect(w.find(card).exists()).toBe(true)
		expect(w.find(card).text()).toContain('Status')
		expect(w.find(`${card} [data-testid="cn-sections-widget"]`).exists()).toBe(true)
	})

	it('keeps a grid cell, a tab panel and a card-per-section widget as they were', () => {
		expect(mountHost({}, { inGridCell: true }).find(card).exists()).toBe(false)
		expect(mountHost({}, { chrome: 'bare' }).find(card).exists()).toBe(false)
		expect(mountHost({ content: { cards: true, sections: [] } }).find(card).exists()).toBe(false)
	})

	it('draws no card for an untitled one', () => {
		expect(mountHost({ title: '' }).find(card).exists()).toBe(false)
	})
})
