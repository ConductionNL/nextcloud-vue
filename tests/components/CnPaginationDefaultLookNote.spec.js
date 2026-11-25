/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The default look shows its footer note: alone on a list that needs no
 * pager, after the page info on a paged list (integriq's Data feeds page).
 *
 * @spec openspec/changes/footer-note-in-the-default-look/specs/index-list-board-look/spec.md#requirement-the-default-look-shows-its-footer-note
 */
import { mount } from '@vue/test-utils'
import CnPagination from '../../src/components/CnPagination/CnPagination.vue'

const note = 'A feed is declared by its app in lib/Settings/feeds.json.'
const base = { currentPage: 1, currentPageSize: 20 }

describe('CnPagination: the footer note in the default look', () => {
	it('shows the note alone on a short one-page list', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 1, totalItems: 4, footerNote: note } })
		expect(wrapper.find('[data-testid="cn-pagination"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-pagination-note"]').text()).toBe(note)
		expect(wrapper.find('.cn-pagination__page-info').exists()).toBe(false)
		expect(wrapper.find('.cn-pagination__page-size').exists()).toBe(false)
	})

	it('shows the note after the page info on a paged list', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 3, totalItems: 55, footerNote: note } })
		expect(wrapper.find('.cn-pagination__page-info').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-pagination-note"]').text()).toBe(note)
		expect(wrapper.find('.cn-pagination__nav').exists()).toBe(true)
		expect(wrapper.find('.cn-pagination__page-size').exists()).toBe(true)
	})

	it('stays hidden on a short one-page list without a note, as before', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 1, totalItems: 4 } })
		expect(wrapper.find('[data-testid="cn-pagination"]').exists()).toBe(false)
	})

	it('stays hidden on an empty list, note or not', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, totalPages: 0, totalItems: 0, footerNote: note } })
		expect(wrapper.find('[data-testid="cn-pagination"]').exists()).toBe(false)
	})

	it('leaves the board look to its own count text', () => {
		const wrapper = mount(CnPagination, { propsData: { ...base, variant: 'board', totalPages: 1, totalItems: 4, footerNote: note } })
		expect(wrapper.find('[data-testid="cn-pagination-note"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-pagination-board-count"]').text()).toBe('4 of 4 · ' + note)
	})
})
