/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card-grid widget on a dashboard draws no frame of its own
 * (card-grid-dashboard-frame): the dashboard cell already draws the titled
 * card, and the grid's own wrapper drew a second frame, an "Items" title and a
 * second Actions menu inside it. On its own the grid keeps its frame.
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetCardGrid from '../../src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const OBJECTS = [{ id: 'a1', title: 'ING zakelijk' }, { id: 'a2', title: 'Rabobank' }]
const ObjectCard = { props: ['object'], template: '<div class="card">{{ object.title }}</div>' }

function mountPage(type) {
	return mount(CnDashboardPage, {
		props: {
			layout: [{ id: 1, widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 3 }],
			widgets: [{ id: 'w', type, title: 'Rekeningen', content: { objects: OBJECTS } }],
		},
		global: { stubs: { CnObjectCard: ObjectCard } },
	})
}

describe('CnWidgetCardGrid on a dashboard', () => {
	it('is chromeless in a dashboard cell: one frame, one title', () => {
		const w = mountPage('card-grid')
		const grid = w.findComponent(CnWidgetCardGrid)
		expect(grid.exists()).toBe(true)
		expect(grid.props('chromeless')).toBe(true)
		expect(grid.find('.cn-widget-card-grid').classes()).toContain('cn-widget-card-grid--in-cell')
		expect(w.findAll('.cn-widget-wrapper__title').map((t) => t.text())).toEqual(['Rekeningen'])
		expect(w.findAll('.card').map((c) => c.text())).toEqual(['ING zakelijk', 'Rabobank'])
	})

	it('gives no chromeless binding to any other registry widget', () => {
		const w = mountPage('metadata')
		expect(w.vm.cellChromeBindings({ widgetId: 'w' })).toEqual({})
	})

	it('keeps its own frame and title on its own', () => {
		const w = mount(CnWidgetCardGrid, { props: { title: 'Rekeningen', objects: OBJECTS }, global: { stubs: { CnObjectCard: ObjectCard } } })
		expect(w.find('.cn-widget-wrapper').classes()).not.toContain('cn-widget-wrapper--chromeless')
		expect(w.find('.cn-widget-wrapper__title').text()).toBe('Rekeningen')
		expect(w.find('.cn-widget-card-grid').classes()).not.toContain('cn-widget-card-grid--in-cell')
	})
})
