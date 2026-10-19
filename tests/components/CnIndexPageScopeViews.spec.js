/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `folderSidebar.scopeViews` limits a case type's look (title, count line,
 * columns) to the named view modes, so the board view keeps the page's
 * generic look (DqWerkbord) while the scope still filters it.
 *
 * @spec openspec/changes/index-scope-views/specs/index-page/spec.md#requirement-a-scope-look-can-be-limited-to-view-modes
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const FOLDERS = [{ id: 'klacht', name: 'Klachten', title: 'Klachten', countText: '{total} klachten', columns: ['title'] }]

/**
 * Mount a cases page scoped to Klachten in a view mode.
 *
 * @param {string} viewMode The view mode.
 * @param {object} [sidebar] Extra folderSidebar keys.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The page.
 */
async function mountPage(viewMode, sidebar = { scopeViews: ['table', 'list'] }) {
	const w = mount(CnIndexPage, {
		props: {
			title: 'Alle zaken',
			schema: { title: 'Zaak', properties: { title: { title: 'Titel' }, status: { title: 'Status' } } },
			columns: [{ key: 'title', label: 'Titel' }, { key: 'status', label: 'Status' }],
			objects: [{ id: 1, title: 'A', status: 'open' }],
			pagination: { page: 1, pages: 1, total: 7, limit: 20 },
			showTitle: true,
			viewMode,
			activeFilters: { caseType: 'klacht' },
			folderSidebar: { source: 'custom', filterField: 'caseType', folders: FOLDERS, pane: false, ...sidebar },
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true, CnFolderSidebar: true, CnKanbanView: true, CnObjectList: true },
		},
	})
	await nextTick()
	return w
}

describe('CnIndexPage folderSidebar.scopeViews', () => {
	it('applies the scope look in a listed view', async () => {
		const w = await mountPage('table')
		expect(w.vm.selectedFolderId).toBe('klacht')
		expect(w.find('h1').text()).toBe('Klachten')
		expect(w.vm.activeScopeLayout.columns.map((c) => c.key)).toEqual(['title'])
	})

	it('keeps the page look in a view it does not list, still scoped', async () => {
		const w = await mountPage('board')
		expect(w.vm.selectedFolderId).toBe('klacht')
		expect(w.find('h1').text()).toBe('Alle zaken')
		expect(w.vm.activeScopeLayout.columns).toBeNull()
		expect(w.vm.presented('countText')).toBe('')
	})

	it('applies the scope look in every view without the key', async () => {
		const w = await mountPage('board', {})
		expect(w.find('h1').text()).toBe('Klachten')
	})
})
