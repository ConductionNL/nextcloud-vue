/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card can end with other widgets: `content.trailWidgetIds` draws them
 * inside the card, after its own content (DqZaak Zaakplan: the case's goals
 * under the plan).
 *
 * @spec openspec/changes/widget-trail-widgets-in-card/specs/widget-lead-widgets/spec.md#requirement-a-card-can-end-with-other-widgets
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Pane = { name: 'Pane', props: ['objectId'], template: '<div class="pane" />' }
const Trail = { name: 'Trail', props: ['objectId'], template: '<div class="trail">Doelen</div>' }
const REGISTRY = { pane: { component: Pane, chrome: 'card' }, trail: { component: Trail } }

/**
 * Mount a card naming its trail widgets.
 *
 * @param {unknown} trailWidgetIds The ids.
 * @param {object[]} available The page's widgets.
 * @return {import('@vue/test-utils').VueWrapper} The host.
 */
function mountHost(trailWidgetIds, available) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'plan', type: 'pane', title: 'Zaakplan', content: { trailWidgetIds } },
			chrome: 'card',
			objectId: 'case-1',
			object: { id: 'case-1', goals: true },
			availableWidgets: available,
			cnRegistry: REGISTRY,
		},
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: trail widgets', () => {
	it('draws a trail widget inside the card, after the widget\'s own content', () => {
		const w = mountHost(['goals'], [{ id: 'goals', type: 'trail' }])
		const card = w.find('.cn-widget-wrapper')
		expect(card.find('.trail').exists()).toBe(true)
		const html = card.html()
		expect(html.indexOf('class="trail"')).toBeGreaterThan(html.indexOf('class="pane"'))
		expect(card.findAll('.cn-widget-wrapper').length).toBe(0)
	})

	it('draws a trail widget only while its visibleWhen holds', () => {
		const hidden = mountHost(['goals'], [{ id: 'goals', type: 'trail', visibleWhen: { field: 'goals', op: 'eq', value: false } }])
		expect(hidden.find('.trail').exists()).toBe(false)
	})

	it('draws nothing for an id that names no widget, or without the key', () => {
		expect(mountHost(['missing'], []).find('.trail').exists()).toBe(false)
		expect(mountHost(undefined, [{ id: 'goals', type: 'trail' }]).find('.trail').exists()).toBe(false)
	})
})
