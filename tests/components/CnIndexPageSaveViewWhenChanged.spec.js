/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look offers "Save view" in the toolbar only once the reader has
 * changed the view: a filter, the search, the order, the columns or a quick
 * filter. Opening a view or saving one puts it away again (DqTeamwachtrij and
 * DqWerkbord draw no Save view on an untouched view; DqZaken draws it with two
 * filters set). The Nextcloud look keeps the button.
 *
 * @spec openspec/changes/board-save-view-only-when-changed/specs/saved-views/spec.md#requirement-the-board-look-offers-save-view-once-the-view-has-changed
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * @param {string} look The provided look.
 * @return {object} The wrapper.
 */
function mountPage(look) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', schema: { title: 'Case', properties: {} }, objects: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 } },
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true },
		},
	})
}

describe('Save view in the board look', () => {
	it('stays away on an untouched view', () => {
		expect(mountPage('board').vm.toolbarSavesView).toBe(false)
	})

	it('comes once the reader searches, filters, sorts or changes columns', () => {
		for (const act of [
			(vm) => vm.onSearchEvent('lindelaan'),
			(vm) => vm.onFilterEvent({ key: 'status', values: ['open'] }),
			(vm) => vm.onSidebarSortChange([{ key: 'title', order: 'asc' }]),
			(vm) => vm.onColumnsEvent(['title']),
		]) {
			const w = mountPage('board')
			act(w.vm)
			expect(w.vm.toolbarSavesView).toBe(true)
		}
	})

	it('goes away when a view is opened', async () => {
		const w = mountPage('board')
		w.vm.onSearchEvent('lindelaan')
		w.vm.onApplySavedView({ id: 'v1', name: 'Mine', query: { filters: {} } })
		await w.vm.$nextTick()
		expect(w.vm.toolbarSavesView).toBe(false)
	})

	it('stays in the Nextcloud look', () => {
		expect(mountPage('nextcloud').vm.toolbarSavesView).toBe(true)
	})
})
