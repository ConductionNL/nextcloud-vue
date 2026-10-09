/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board variant of CnPagination: count text, numbered links, Previous and
 * Next only where they lead somewhere, no First, Last or page-size select.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-footer-sits-inside-the-card
 */
import { mount } from '@vue/test-utils'
import CnPagination from '../../src/components/CnPagination/CnPagination.vue'

function mountBoard(props = {}) {
	return mount(CnPagination, {
		props: { variant: 'board', currentPage: 1, totalPages: 3, totalItems: 48, currentPageSize: 20, ...props },
	})
}

describe('CnPagination board variant', () => {
	it('reads "20 of 48" at the start and 1, 2, 3, Next at the end on page one', () => {
		const wrapper = mountBoard()
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('20 of 48')
		const links = wrapper.findAll('.cn-pagination__board-link')
		expect(links.map((l) => l.text())).toEqual(['1', '2', '3', 'Next'])
		expect(links[0].classes()).toContain('cn-pagination__board-link--current')
		expect(links[0].attributes('aria-current')).toBe('page')
	})

	it('adds Previous after the first page and drops Next on the last', () => {
		const wrapper = mountBoard({ currentPage: 3 })
		expect(wrapper.findAll('.cn-pagination__board-link').map((l) => l.text())).toEqual(['Previous', '1', '2', '3'])
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('8 of 48')
	})

	it('renders no First, Last, page-size select or Show more', () => {
		const wrapper = mountBoard()
		expect(wrapper.text()).not.toContain('First')
		expect(wrapper.text()).not.toContain('Last')
		expect(wrapper.text()).not.toContain('Show more')
		expect(wrapper.find('.cn-pagination__page-size').exists()).toBe(false)
	})

	it('appends the footer note to the count text', () => {
		const wrapper = mountBoard({ footerNote: 'click a column header to sort' })
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('20 of 48 · click a column header to sort')
	})

	it('emits page-changed from a link', async () => {
		const wrapper = mountBoard()
		await wrapper.findAll('.cn-pagination__board-link')[1].trigger('click')
		expect(wrapper.emitted('page-changed')[0]).toEqual([2])
	})

	it('shows the count on a single page too', () => {
		const wrapper = mountBoard({ totalPages: 1, totalItems: 8 })
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('8 of 8')
		expect(wrapper.find('.cn-pagination__board-pages').exists()).toBe(false)
	})

	it('keeps the default variant as it was', () => {
		const wrapper = mount(CnPagination, { props: { currentPage: 2, totalPages: 3, totalItems: 48, currentPageSize: 20 } })
		expect(wrapper.classes()).not.toContain('cn-pagination--board')
		expect(wrapper.text()).toContain('First')
		expect(wrapper.text()).toContain('Last')
		expect(wrapper.find('.cn-pagination__page-size').exists()).toBe(true)
	})
})
