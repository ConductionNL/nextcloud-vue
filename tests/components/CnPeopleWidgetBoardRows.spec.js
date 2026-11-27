/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A people widget can leave out its search box (`content.showSearch: false`),
 * and its list layout marks itself `cn-board-ruled-rows` (launchpad LpVandaag).
 *
 * @spec openspec/specs/people-widget/spec.md#requirement-a-people-widget-can-leave-out-its-search-box
 * @spec openspec/specs/people-widget/spec.md#requirement-a-board-people-list-is-ruled-rows
 */
import { mount } from '@vue/test-utils'
import CnPeopleWidget from '@/components/CnPeopleWidget/CnPeopleWidget.vue'

/**
 * Mount the widget over one user and let the first page land.
 *
 * @param {object} content The widget content.
 * @return {Promise<object>} The wrapper.
 */
async function mountWith(content) {
	const dataSource = {
		fetchPeople: jest.fn().mockResolvedValue({
			users: [{ uid: 'yasmina', displayName: 'Yasmina El Amrani' }],
			total: 1,
			hasMore: false,
		}),
	}
	const wrapper = mount(CnPeopleWidget, { propsData: { content, dataSource } })
	await wrapper.vm.$nextTick()
	await Promise.resolve()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('CnPeopleWidget search box', () => {
	it('shows the search box and refresh button by default', async () => {
		const wrapper = await mountWith({ layout: 'list' })
		expect(wrapper.find('.cn-people-widget__search').exists()).toBe(true)
		expect(wrapper.find('.cn-people-widget__refresh').exists()).toBe(true)
	})

	it('leaves both out with showSearch false, and still lists the users', async () => {
		const wrapper = await mountWith({ layout: 'list', showSearch: false })
		expect(wrapper.find('.cn-people-widget__header').exists()).toBe(false)
		expect(wrapper.find('.cn-people-widget__search').exists()).toBe(false)
		expect(wrapper.find('.cn-people-widget__refresh').exists()).toBe(false)
		expect(wrapper.text()).toContain('Yasmina El Amrani')
	})
})

describe('CnPeopleWidget ruled rows marker', () => {
	it('marks the list layout cn-board-ruled-rows', async () => {
		const wrapper = await mountWith({ layout: 'list' })
		expect(wrapper.find('.cn-people-widget__items').classes()).toContain('cn-board-ruled-rows')
	})

	it('does not mark the grid layout', async () => {
		const wrapper = await mountWith({ layout: 'grid' })
		expect(wrapper.find('.cn-people-widget__items').classes()).not.toContain('cn-board-ruled-rows')
	})
})
