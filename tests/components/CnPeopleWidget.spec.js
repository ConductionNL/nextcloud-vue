/**
 * Tests for the `people` dashboard widget renderer (cn-widget-library).
 *
 * Covers the graceful empty state when no people source is wired, and the
 * self-registering registry entry being present after importing the index.
 */

import { mount } from '@vue/test-utils'
import CnPeopleWidget from '@/components/CnPeopleWidget/CnPeopleWidget.vue'

describe('CnPeopleWidget renderer', () => {
	it('shows the empty state when no data source is available', () => {
		const wrapper = mount(CnPeopleWidget, { propsData: { content: {} } })
		const state = wrapper.find('.cn-people-widget__state')
		expect(state.exists()).toBe(true)
		expect(state.text()).toContain('No people directory available')
	})

	it('applies the layout class from content', () => {
		const wrapper = mount(CnPeopleWidget, { propsData: { content: { layout: 'list' } } })
		expect(wrapper.classes()).toContain('cn-people-widget--list')
	})

	it('renders users from a supplied dataSource', async () => {
		const dataSource = {
			fetchPeople: jest.fn().mockResolvedValue({
				users: [{ uid: 'alice', displayName: 'Alice', email: 'a@example.com' }],
				total: 1,
				hasMore: false,
			}),
		}
		const wrapper = mount(CnPeopleWidget, { propsData: { content: {}, dataSource } })
		await wrapper.vm.$nextTick()
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		expect(dataSource.fetchPeople).toHaveBeenCalled()
		expect(wrapper.text()).toContain('Alice')
	})
})

describe('people registry registration', () => {
	it('registers the people type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnPeopleWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('people')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({ layout: 'grid' })
	})
})
