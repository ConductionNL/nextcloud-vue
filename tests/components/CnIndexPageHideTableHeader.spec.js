/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTeamwachtrij draws its list as plain rows: no column headers and no
 * checkboxes. `hideTableHeader` (manifest `config.hideTableHeader`) reaches
 * CnDataTable's `hideHeader`; `selectable: false` already drops the checkboxes.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * The data table the page draws.
 *
 * @param {object} props Page props.
 * @return {object} The CnDataTable stub's wrapper.
 */
function tableOfPage(props = {}) {
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Teamwachtrij', schema: { title: 'Zaak', properties: {} }, objects: [], ...props },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
	})
	return wrapper.findComponent({ name: 'CnDataTable' })
}

describe('CnIndexPage hideTableHeader', () => {
	it('keeps the header row by default', () => {
		expect(tableOfPage().props('hideHeader')).toBe(false)
	})

	it('hands hideTableHeader to the table as hideHeader, with selection off', () => {
		const table = tableOfPage({ hideTableHeader: true, selectable: false })
		expect(table.props('hideHeader')).toBe(true)
		expect(table.props('selectable')).toBe(false)
	})
})
