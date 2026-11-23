/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `folderSidebar.pane: false` (DqWooVerzoeken, DqKlachten in dossiq's simple
 * profile): the case type comes from the deep link and its scope look
 * applies, but no folder pane is drawn.
 *
 * @spec openspec/changes/folder-sidebar-pane-off/specs/index-page/spec.md#requirement-a-folder-scope-without-a-pane
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const FOLDERS = [
	{ id: 'klacht', name: 'Klachten', title: 'Klachten', countText: '{total} klachten', addLabel: 'Klacht registreren' },
	{ id: 'woo', name: 'Woo-verzoeken', title: 'Woo-verzoeken' },
]

/**
 * Mount an index page with a folder sidebar and a deep-link filter.
 *
 * @param {object} sidebar Extra folderSidebar keys.
 * @param {object} [activeFilters] The deep-link filter.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountPage(sidebar, activeFilters = { caseType: 'klacht' }) {
	return mount(CnIndexPage, {
		props: {
			title: 'Alle zaken',
			schema: { title: 'Zaak', properties: { caseType: { title: 'Soort zaak' } } },
			objects: [{ id: 1 }, { id: 2 }],
			pagination: { page: 1, pages: 1, total: 7, limit: 20 },
			showTitle: true,
			addLabel: 'Zaak toevoegen',
			activeFilters,
			folderSidebar: { source: 'custom', filterField: 'caseType', folders: FOLDERS, ...sidebar },
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true, CnFolderSidebar: true },
		},
	})
}

describe('CnIndexPage folderSidebar pane: false', () => {
	it('draws no folder pane', () => {
		const w = mountPage({ pane: false })
		expect(w.find('.cn-index-page__folder-pane').exists()).toBe(false)
		expect(w.findComponent({ name: 'CnFolderSidebar' }).exists()).toBe(false)
		expect(w.find('.cn-index-page__body').classes()).not.toContain('cn-index-page__body--with-folders')
	})

	it('takes the scope from the deep link and applies its look', async () => {
		const w = mountPage({ pane: false })
		await nextTick()
		expect(w.vm.selectedFolderId).toBe('klacht')
		expect(w.find('h1').text()).toBe('Klachten')
		expect(w.vm.headerDescription).toBe('7 klachten')
		expect(w.vm.resolvedAddLabel).toBe('Klacht registreren')
	})

	it('still draws the pane without the key', () => {
		const w = mountPage({})
		expect(w.find('.cn-index-page__folder-pane').exists()).toBe(true)
		expect(w.find('.cn-index-page__body').classes()).toContain('cn-index-page__body--with-folders')
	})
})
