/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The cards view keeps the table view's toolbar and footer under the board
 * look: the same CnActionsBar layout and the same board-variant CnPagination,
 * with only the area between them replaced.
 *
 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-cards-view-keeps-the-list-toolbar-and-footer
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnPagination from '../../src/components/CnPagination/CnPagination.vue'

function mountPage(viewMode, look = 'board') {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Residents',
			schema: { title: 'Resident', properties: { title: { title: 'Name' }, city: { title: 'City' }, born: { title: 'Born' } } },
			objects: [{ id: 1, title: 'Sanne', city: 'Zuiddrecht', born: '1990' }],
			pagination: { page: 1, pages: 3, total: 48, limit: 20 },
			viewMode,
			footerNote: 'click a column header to sort',
		},
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Residents' } },
			stubs: { CnActionsBar: true, CnPagination: true, CnDataTable: true, CnCardGrid: true, CnContextMenu: true, CnIndexSidebar: true },
		},
	})
}

describe('CnIndexPage cards view (board look)', () => {
	it.each(['table', 'cards'])('draws the board toolbar and footer in the %s view', (mode) => {
		const w = mountPage(mode)
		expect(w.findComponent(CnActionsBar).props('layout')).toBe('board')
		const footer = w.findComponent(CnPagination)
		expect(footer.props('variant')).toBe('board')
		expect(footer.props('footerNote')).toBe('click a column header to sort')
	})

	it('renders the footer as a child of the table card in the table view', () => {
		const w = mount(CnIndexPage, {
			propsData: {
				title: 'Residents',
				schema: { title: 'Resident', properties: { title: { title: 'Name' } } },
				objects: [{ id: 1, title: 'Sanne' }],
				pagination: { page: 1, pages: 3, total: 48, limit: 20 },
			},
			global: {
				provide: { cnLook: 'board' },
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Residents' } },
				stubs: { CnActionsBar: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
			},
		})
		const footer = w.findComponent(CnPagination)
		expect(footer.element.closest('.cn-index-page__main--table')).not.toBeNull()
	})

	it('replaces only the table with the grid', () => {
		expect(mountPage('table').findComponent(CnDataTable).exists()).toBe(true)
		expect(mountPage('table').findComponent(CnCardGrid).exists()).toBe(false)
		expect(mountPage('cards').findComponent(CnCardGrid).exists()).toBe(true)
		expect(mountPage('cards').findComponent(CnDataTable).exists()).toBe(false)
	})

	it('hands the grid the card fields: the first four list columns by default', () => {
		const w = mountPage('cards')
		expect(w.findComponent(CnCardGrid).props('cardFields')).toEqual(w.vm.resolvedCardFields)
		expect(w.vm.resolvedCardFields.length).toBeLessThanOrEqual(4)
		expect(w.vm.resolvedCardFields.length).toBeGreaterThan(0)
	})

	it('leaves the card to its own default without the look', () => {
		const w = mountPage('cards', 'nextcloud')
		expect(w.findComponent(CnCardGrid).props('cardFields')).toBeNull()
		expect(w.findComponent(CnPagination).exists()).toBe(true)
		expect(w.findComponent(CnPagination).props('variant')).toBe('')
	})

	it('names the page\'s own card fields when it declares them', () => {
		const w = mount(CnIndexPage, {
			propsData: { title: 'R', schema: { title: 'Resident', properties: { city: { title: 'City' } } }, objects: [{ id: 1 }], viewMode: 'cards', cardFields: ['city'] },
			global: { provide: { cnLook: 'board' }, mocks: { $router: { push: jest.fn() }, $route: { query: {} } }, stubs: { CnActionsBar: true, CnCardGrid: true, CnIndexSidebar: true } },
		})
		expect(w.findComponent(CnCardGrid).props('cardFields')).toEqual(['city'])
	})
})
