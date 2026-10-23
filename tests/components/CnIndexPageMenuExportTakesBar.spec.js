/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An Actions menu that lists `export` takes the export over, as an Export
 * header button does: the actions bar then draws no Export menu of its own
 * (DqAanMijToegewezen's toolbar shows no "Exporteren" beside Filter).
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * @param {Array<object>} headerButtons The header buttons.
 * @return {object} The wrapper.
 */
function mountPage(headerButtons) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			register: 'dossiq',
			schema: { slug: 'case', title: 'Case', exportable: true, properties: {} },
			objects: [],
			showTitle: true,
			allowExport: true,
			headerButtons,
		},
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		},
	})
}

describe('the export in the Actions menu', () => {
	it('keeps the bar\'s Export menu while no header control exports', () => {
		expect(mountPage([{ action: 'actions-menu', items: ['header-actions', 'refresh'] }]).vm.barShowsExportMenu).toBe(true)
	})

	it('takes the bar\'s Export menu over when the Actions menu lists export', () => {
		const w = mountPage([{ action: 'actions-menu', items: ['header-actions', 'export'] }])
		expect(w.vm.barShowsExportMenu).toBe(false)
		expect(w.vm.headerMenuEntries(w.vm.resolvedHeaderButtons[0]).map((entry) => entry.key)).toContain('export')
	})

	it('still yields to an Export header button', () => {
		expect(mountPage([{ action: 'export', label: 'Download' }]).vm.barShowsExportMenu).toBe(false)
	})
})
