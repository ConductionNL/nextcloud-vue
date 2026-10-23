/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view without a description reads what it filters on under its
 * name in the side panel, in the words the Active line uses ("Status: Open,
 * Deadline: 1 through 31 October"), as DqFilterBeheren draws a line under
 * every view.
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'
import CnSavedViewsPanel from '../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue'

const VIEWS = [
	{ id: 1, name: 'Open', owner: 'alice', query: { filters: { status: 'open' }, search: 'Lindelaan' } },
	{ id: 2, name: 'Explained', owner: 'alice', description: 'Our own words', query: { filters: { status: 'open' } } },
	{ id: 3, name: 'Everything', owner: 'alice', query: { filters: {} } },
]

function mountPage() {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			schema: { title: 'Case', properties: { status: { title: 'Status', oneOf: [{ const: 'open', title: 'Open' }] } } },
			objects: [],
			pagination: { page: 1, pages: 1, total: 0, limit: 20 },
		},
		global: {
			provide: { cnLook: 'board', cnTranslate: (key) => key },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: { CnActionsBar: true, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnSavedViewsControl: true, CnBuildiqEditButton: true, CnQuickFilterBar: true },
		},
	})
}

describe('a saved view summarised from its filters', () => {
	it('reads the search term and each filter as the Active line names them', () => {
		const summary = CnIndexPage.methods.viewFilterSummary.call(mountPage().vm, VIEWS[0])
		expect(summary).toBe('Search term: Lindelaan, Status: Open')
		expect(CnIndexPage.methods.viewFilterSummary.call(mountPage().vm, VIEWS[2])).toBe('')
	})

	it('leaves out the filters the page marks hidden in its filterLabels', () => {
		const page = mountPage()
		const summary = CnIndexPage.methods.viewFilterSummary.call(
			{ ...page.vm, filterChipsOf: page.vm.filterChipsOf, filterLabels: { isDraft: { hidden: true } } },
			{ id: 4, name: 'Open', query: { filters: { status: 'open', isDraft: false } } },
		)
		expect(summary).toBe('Status: Open')
	})

	it('shows the summary under a view without a description, the description otherwise', () => {
		const w = mount(CnSavedViewsPanel, {
			props: { views: VIEWS, currentUserId: 'alice', summaries: { 1: 'Search term: Lindelaan, Status: Open', 2: 'Status: Open' } },
			global: { provide: { cnLook: 'board' } },
		})
		const lines = w.findAll('.cn-saved-views-panel__subline').map((s) => s.text())
		expect(lines).toContain('Search term: Lindelaan, Status: Open')
		expect(lines).toContain('Our own words')
		expect(lines).not.toContain('Status: Open')
	})

	it('hands the summaries from the sidebar to the panel', () => {
		const props = CnIndexSidebar.computed.savedViewsPanelProps.call({ savedViews: { views: VIEWS, summaries: { 1: 'x' } } })
		expect(props.summaries).toEqual({ 1: 'x' })
	})
})
