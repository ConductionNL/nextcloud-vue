/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `bulkBandAlways` draws the bulk band before a selection only in a view that
 * can select rows: the table, the cards, the list and the board. The map
 * selects nothing, so DqZakenKaart draws no idle band above it.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnObjectList: true,
	CnBoardView: true,
	CnMapWidget: true,
	CnPagination: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnActionsBar: { name: 'CnActionsBar', props: ['bulkBandAlways'], template: '<div />' },
}

/**
 * Mount an index page in one view mode, asking for the idle band.
 *
 * @param {string} viewMode The view mode.
 * @return {boolean} The bulkBandAlways the actions bar gets.
 */
function bandAlwaysIn(viewMode) {
	const w = mount(CnIndexPage, {
		propsData: {
			title: 'Zaken',
			schema: { title: 'Zaak', properties: { title: { type: 'string' } } },
			objects: [{ id: '1', title: 'A' }],
			bulkBandAlways: true,
			viewMode,
			mapConfig: { geoField: 'geometry' },
		},
		global: { stubs },
	})
	return w.findComponent({ name: 'CnActionsBar' }).props('bulkBandAlways')
}

describe('the idle bulk band follows the view', () => {
	it.each(['table', 'cards', 'list', 'board'])('is drawn in the %s view, which selects rows', (viewMode) => {
		expect(bandAlwaysIn(viewMode)).toBe(true)
	})

	it('is not drawn above the map, which selects nothing', () => {
		expect(bandAlwaysIn('map')).toBe(false)
	})
})
