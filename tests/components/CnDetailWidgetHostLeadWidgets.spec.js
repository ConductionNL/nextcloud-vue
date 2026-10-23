/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card can lead with other widgets: `content.leadWidgetIds` draws them
 * inside the card, before its own content (DqZaakDocumenten: the review
 * summary inside the Files card).
 *
 * @spec openspec/changes/widget-lead-widgets-in-card/specs/widget-lead-widgets/spec.md#requirement-a-card-can-lead-with-other-widgets
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Pane = { name: 'Pane', props: ['objectId'], template: '<div class="pane" />' }
const Lead = { name: 'Lead', props: ['objectId'], template: '<div class="lead">4 van 7 beoordeeld</div>' }
const REGISTRY = { pane: { component: Pane, chrome: 'card' }, lead: { component: Lead } }

function mountHost(leadWidgetIds, available) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'files', type: 'pane', title: 'Bestanden', content: { leadWidgetIds } },
			chrome: 'card',
			objectId: 'case-1',
			object: { id: 'case-1', review: true },
			availableWidgets: available,
			cnRegistry: REGISTRY,
		},
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: lead widgets', () => {
	it('draws a lead widget inside the card, before the widget\'s own content', () => {
		const w = mountHost(['verdicts'], [{ id: 'verdicts', type: 'lead' }])
		const card = w.find('.cn-widget-wrapper')
		expect(card.find('.lead').exists()).toBe(true)
		const html = card.html()
		expect(html.indexOf('class="lead"')).toBeLessThan(html.indexOf('class="pane"'))
		expect(card.findAll('.cn-widget-wrapper').length).toBe(0)
	})

	it('draws a lead widget only while its visibleWhen holds', () => {
		const hidden = mountHost(['verdicts'], [{ id: 'verdicts', type: 'lead', visibleWhen: { field: 'review', op: 'eq', value: false } }])
		expect(hidden.find('.lead').exists()).toBe(false)
	})

	it('draws nothing for an id that names no widget, or without the key', () => {
		expect(mountHost(['missing'], []).find('.lead').exists()).toBe(false)
		expect(mountHost(undefined, [{ id: 'verdicts', type: 'lead' }]).find('.lead').exists()).toBe(false)
	})
})
