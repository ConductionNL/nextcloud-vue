// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnActionsBar's `showCountWithSearch` — the "Showing X of Y"
 * counter stays visible beside the inline search field instead of being
 * replaced by it — and CnIndexPage's passthrough of the same prop.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>', props: ['type', 'disabled'] },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

const pagination = { total: 10, page: 1, pages: 1, limit: 20 }

/**
 * @param {object} props Props for CnActionsBar.
 * @param {object} [slots] Slots for the mount.
 * @return {object} The mounted wrapper.
 */
function mountBar(props, slots = {}) {
	return mount(CnActionsBar, {
		propsData: { selectedIds: [], objectCount: 3, pagination, ...props },
		stubs,
		slots,
	})
}

const afterSearch = { 'after-search': '<button class="my-filter-button">Filter</button>' }

describe('CnActionsBar — counter beside the inline search', () => {
	it('shows the counter when the search is off, before #after-search, without aria-live', () => {
		const wrapper = mountBar({ showSearch: false }, afterSearch)
		const count = wrapper.find('.cn-actions-bar__count')
		expect(count.exists()).toBe(true)
		expect(count.text()).toBe('Showing 3 of 10')
		expect(count.classes()).toEqual(['cn-actions-bar__count'])
		expect(count.attributes('aria-live')).toBeUndefined()
		expect(count.element.nextElementSibling).toBe(wrapper.find('.my-filter-button').element)
	})

	it('hides the counter behind the search by default', () => {
		const wrapper = mountBar({ showSearch: true })
		expect(wrapper.find('.cn-actions-bar__search').exists()).toBe(true)
		expect(wrapper.find('.cn-actions-bar__count').exists()).toBe(false)
	})

	it('shows the counter beside the search with showCountWithSearch', () => {
		const wrapper = mountBar({ showSearch: true, showCountWithSearch: true })
		const search = wrapper.find('.cn-actions-bar__search')
		const count = wrapper.find('.cn-actions-bar__count')
		expect(search.exists()).toBe(true)
		expect(count.exists()).toBe(true)
		expect(count.text()).toBe('Showing 3 of 10')
		expect(count.classes()).toContain('cn-actions-bar__count--beside-search')
		expect(count.attributes('aria-live')).toBe('polite')
		// in the left info group, after the search field
		expect(count.element.closest('.cn-actions-bar__info')).not.toBeNull()
		expect(search.element.nextElementSibling).toBe(count.element)
	})

	it('places the counter after the #after-search controls', () => {
		const wrapper = mountBar({ showSearch: true, showCountWithSearch: true }, afterSearch)
		const search = wrapper.find('.cn-actions-bar__search').element
		const filter = wrapper.find('.my-filter-button').element
		const count = wrapper.find('.cn-actions-bar__count').element
		expect(search.nextElementSibling).toBe(filter)
		expect(filter.nextElementSibling).toBe(count)
	})

	it('keeps the counter hidden beside the search when the total is 0 or unknown', () => {
		const empty = mountBar({ showSearch: true, showCountWithSearch: true, pagination: { ...pagination, total: 0 } })
		expect(empty.find('.cn-actions-bar__search').exists()).toBe(true)
		expect(empty.find('.cn-actions-bar__count').exists()).toBe(false)

		const none = mountBar({ showSearch: true, showCountWithSearch: true, pagination: null })
		expect(none.find('.cn-actions-bar__count').exists()).toBe(false)
	})

	it('changes nothing without the search field', () => {
		const wrapper = mountBar({ showSearch: false, showCountWithSearch: true })
		const counts = wrapper.findAll('.cn-actions-bar__count')
		expect(counts).toHaveLength(1)
		expect(counts[0].classes()).toEqual(['cn-actions-bar__count'])
		expect(counts[0].attributes('aria-live')).toBeUndefined()
	})
})

describe('CnIndexPage — showCountWithSearch passthrough', () => {
	/**
	 * @param {object} props Extra CnIndexPage props.
	 * @return {object} The CnActionsBar stub's wrapper.
	 */
	function mountBarOfPage(props = {}) {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Publications', schema: { title: 'Publication', properties: {} }, objects: [], ...props },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		})
		return wrapper.findComponent({ name: 'CnActionsBar' })
	}

	it('passes false by default', () => {
		expect(mountBarOfPage({ inlineSearch: true }).props('showCountWithSearch')).toBe(false)
	})

	it('forwards showCountWithSearch to CnActionsBar', () => {
		const bar = mountBarOfPage({ inlineSearch: true, showCountWithSearch: true })
		expect(bar.props('showSearch')).toBe(true)
		expect(bar.props('showCountWithSearch')).toBe(true)
	})
})
