/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board list that fits on one page can end in its footer note alone:
 * PqWachtrij draws "Oudste eerst. Een ticket verlaat de wachtrij zodra iemand
 * het in behandeling neemt." with no count and no "1 Volgende".
 *
 * @spec openspec/changes/index-footer-note-on-one-page/specs/index-list-board-look/spec.md#requirement-a-board-list-on-one-page-can-end-in-its-note-alone
 */
import { mount } from '@vue/test-utils'
import CnPagination from '../../src/components/CnPagination/CnPagination.vue'

const base = { variant: 'board', currentPage: 1, currentPageSize: 20, footerNote: 'Oldest first.' }

describe('CnPagination: the note alone on one page', () => {
	it('draws only the footer note on one page when the pager is off there', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 1, totalItems: 9, pagerOnOnePage: false } })
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('Oldest first.')
		expect(wrapper.find('nav').exists()).toBe(false)
	})

	it('keeps the count and the pages when there is more than one page', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 2, totalItems: 30, pagerOnOnePage: false } })
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('20 of 30 · Oldest first.')
		expect(wrapper.find('nav').exists()).toBe(true)
	})

	it('keeps the single page "1" and Next by default, as the other boards draw it', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 1, totalItems: 9 } })
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('9 of 9 · Oldest first.')
		expect(wrapper.find('nav').exists()).toBe(true)
	})
})

describe('CnIndexPage: pagerOnOnePage reaches the footer', () => {
	it('hands the page config to the pager, on by default', () => {
		const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
		const mountPage = (props) => mount(CnIndexPage, {
			propsData: {
				title: 'Queue',
				schema: { title: 'Ticket', properties: {} },
				objects: [{ id: 'a' }],
				pagination: { total: 30, page: 1, pages: 2, limit: 20 },
				...props,
			},
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: { name: 'CnPagination', props: ['pagerOnOnePage', 'totalPages'], template: '<div />' }, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		})
		expect(mountPage({ pagerOnOnePage: false }).findComponent({ name: 'CnPagination' }).props('pagerOnOnePage')).toBe(false)
		expect(mountPage({}).findComponent({ name: 'CnPagination' }).props('pagerOnOnePage')).toBe(true)
	})
})
