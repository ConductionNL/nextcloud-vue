/**
 * Tests for CnObjectList — the list container. Covers row rendering,
 * empty/loading states, selection toggling, and the #list-item override slot.
 */

const { mount, shallowMount } = require('@vue/test-utils')
const CnObjectList = require('../../src/components/CnObjectList/CnObjectList.vue').default

const objects = [
	{ id: 'a', name: 'AWS' },
	{ id: 'b', name: 'GitHub' },
]

describe('CnObjectList', () => {
	it('renders one row per object', () => {
		const wrapper = mount(CnObjectList, { propsData: { objects } })
		expect(wrapper.findAll('.cn-object-list__item')).toHaveLength(2)
	})

	it('shows the loading state', () => {
		const wrapper = shallowMount(CnObjectList, { propsData: { objects, loading: true } })
		expect(wrapper.find('.cn-object-list__loading').exists()).toBe(true)
		expect(wrapper.find('.cn-object-list__rows').exists()).toBe(false)
	})

	it('shows the empty state when there are no objects', () => {
		const wrapper = shallowMount(CnObjectList, { propsData: { objects: [] } })
		expect(wrapper.find('.cn-object-list__empty').exists()).toBe(true)
	})

	it('toggles selection ids via the row select event', () => {
		const wrapper = shallowMount(CnObjectList, { propsData: { objects, selectable: true, selectedIds: [] } })
		wrapper.vm.toggleSelect(objects[0])
		expect(wrapper.emitted('select')[0]).toEqual([['a']])
	})

	it('uses the #list-item slot to fully override rows', () => {
		const wrapper = mount(CnObjectList, {
			propsData: { objects },
			scopedSlots: { 'list-item': '<div class="custom-row">{{ props.object.name }}</div>' },
		})
		const custom = wrapper.findAll('.custom-row')
		expect(custom).toHaveLength(2)
		expect(custom.at(1).text()).toBe('GitHub')
	})
})
