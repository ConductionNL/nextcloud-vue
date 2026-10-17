/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's own widget (consumer registry) on a card surface, the side column
 * or a tab stack, gets the titled card a catalog widget gets
 * (detail-consumer-widget-card). A registry entry with `selfChromed: true`
 * keeps drawing its own. A body grid cell, which has its own card, keeps the
 * widget bare.
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
	it('gets the titled card', () => {
		const w = mountHost(MapPane)
		const card = w.find('[data-testid="cn-detail-widget-consumer-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__title').text()).toBe('Locaties')
		expect(card.find('.map-pane').text()).toBe('case-1')
	})

	it('accepts a { component } registry entry', () => {
		const w = mountHost({ component: MapPane })
		expect(w.find('[data-testid="cn-detail-widget-consumer-card"] .map-pane').exists()).toBe(true)
	})

	it('stays bare when the registry entry is selfChromed', () => {
		const w = mountHost({ component: MapPane, selfChromed: true })
		expect(w.find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
		expect(w.find('.map-pane').exists()).toBe(true)
	})

	it('stays bare in a body grid cell and in bare chrome', () => {
		expect(mountHost(MapPane, { inGridCell: true }).find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
		expect(mountHost(MapPane, { chrome: 'bare' }).find('[data-testid="cn-detail-widget-consumer-card"]').exists()).toBe(false)
	})
})
