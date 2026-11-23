/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's own widget (consumer registry) on a card surface, the side column
 * or a tab stack, gets the titled card a catalog widget gets when its registry
 * entry asks for it with `chrome: "card"` (detail-consumer-widget-card).
 * Without it, and in a body grid cell, the widget is drawn bare as before.
 *
 * @spec openspec/changes/detail-consumer-widget-card/specs/detail-page/spec.md#requirement-a-consumer-widget-on-a-card-surface-gets-the-titled-card
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const MapPane = { name: 'MapPane', props: ['objectId'], template: '<div class="map-pane">{{ objectId }}</div>' }

function mountHost(entry, props = {}) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'case-map', title: 'Locaties' }, chrome: 'card', objectId: 'case-1', cnRegistry: { 'case-map': entry }, ...props },
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: a consumer widget on a card surface', () => {
	it('gets the titled card when its registry entry asks for it', () => {
		const w = mountHost({ component: MapPane, chrome: 'card' })
		const card = w.find('[data-testid="cn-detail-widget-consumer-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__title').text()).toBe('Locaties')
		expect(card.find('.map-pane').text()).toBe('case-1')
	})

	it('stays bare without chrome: "card", as before', () => {
		for (const entry of [MapPane, { component: MapPane }]) {
			const w = mountHost(entry)
			expect(w.find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
			expect(w.find('.map-pane').exists()).toBe(true)
		}
	})

	it('stays bare in a body grid cell and in bare chrome', () => {
		const entry = { component: MapPane, chrome: 'card' }
		expect(mountHost(entry, { inGridCell: true }).find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
		expect(mountHost(entry, { chrome: 'bare' }).find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
	})
})
