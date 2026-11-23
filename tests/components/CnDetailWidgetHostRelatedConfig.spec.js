/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `type: 'related'` widget is configured from its manifest `content`: which
 * groups it shows, the sections it reads itself and the buttons under it. The
 * DqZaakGerelateerd board draws no "Hoofdzaak" card with an Objects tab, and
 * dossiq's parent-case card says so (`showObjects: false`, one parent section);
 * the host has to hand those switches to the widget.
 */
import { shallowMount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'

function relatedProps(content) {
	const w = shallowMount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'case-related-card', type: 'related', title: 'Hoofdzaak', content },
			chrome: 'card',
			objectId: 'case-1',
			register: 'dossiq',
			schema: 'case',
		},
		global: { mocks: { t: (_a, s) => s } },
	})
	return w.findComponent(CnRelatedObjectsWidget).props()
}

describe('CnDetailWidgetHost: a related widget follows its content', () => {
	it('hands over the group switches', () => {
		const p = relatedProps({ showObjects: false, showFiles: false, showIntegrations: false, showContracts: true })
		expect(p.showObjects).toBe(false)
		expect(p.showFiles).toBe(false)
		expect(p.showIntegrations).toBe(false)
		expect(p.showContracts).toBe(true)
	})

	it('hands over the sections it reads and the buttons under it', () => {
		const referenceSections = [{ key: 'parent', label: 'Hoofdzaak', field: 'parentCase', register: 'dossiq', schema: 'case' }]
		const extraSources = [{ key: 'planned', label: 'Gepland', endpoint: '/apps/dossiq/api/cases/@objectId/planned' }]
		const footerActions = [{ label: 'Zaak koppelen', type: 'open-modal', target: 'CnActionDialog' }]
		const p = relatedProps({ referenceSections, extraSources, footerActions, layout: 'sections', groupByRelation: true })
		expect(p.referenceSections).toEqual(referenceSections)
		expect(p.extraSources).toEqual(extraSources)
		expect(p.footerActions).toEqual(footerActions)
		expect(p.layout).toBe('sections')
		expect(p.groupByRelation).toBe(true)
	})

	it('keeps the widget defaults when the content says nothing', () => {
		const p = relatedProps({})
		expect(p.showObjects).toBe(true)
		expect(p.showFiles).toBe(true)
		expect(p.referenceSections).toEqual([])
		expect(p.footerActions).toEqual([])
	})
})
