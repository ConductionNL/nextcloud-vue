/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A library widget's card can carry a muted line under its title
 * (`subtitle` on the widget or in its content), as the boards draw
 * "Elke suggestie wordt vastgelegd, ook als niemand hem gebruikt"
 * (DqZaakAssistent) under "Wat de assistent op deze zaak deed".
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const MapPane = { name: 'MapPane', props: ['objectId'], template: '<div class="map-pane" />' }

function mountHost(widget) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'case-map', title: 'Locaties', ...widget }, chrome: 'card', objectId: 'case-1', cnRegistry: { 'case-map': { component: MapPane, chrome: 'card' } } },
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: a card subtitle', () => {
	it('draws the widget\'s subtitle under the card title', () => {
		const w = mountHost({ subtitle: 'Elke suggestie wordt vastgelegd' })
		expect(w.find('[data-testid="cn-widget-wrapper-subtitle"]').text()).toBe('Elke suggestie wordt vastgelegd')
	})

	it('reads it from the content as well', () => {
		const w = mountHost({ content: { subtitle: 'Uit de inhoud' } })
		expect(w.find('[data-testid="cn-widget-wrapper-subtitle"]').text()).toBe('Uit de inhoud')
	})

	it('draws none without one', () => {
		expect(mountHost({}).find('[data-testid="cn-widget-wrapper-subtitle"]').exists()).toBe(false)
	})
})
