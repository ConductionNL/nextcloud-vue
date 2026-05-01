import { mount } from '@vue/test-utils'
import CnContextMenu from '@/components/CnContextMenu/CnContextMenu.vue'

describe('CnContextMenu visible predicate', () => {
	it('filters actions by visible function against targetItem', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Edit' },
					{ label: 'Publish', visible: (item) => !item.published },
					{ label: 'Depublish', visible: (item) => item.published },
				],
				targetItem: { published: true },
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Edit', 'Depublish'])
	})

	it('flips when targetItem state differs', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Publish', visible: (item) => !item.published },
					{ label: 'Depublish', visible: (item) => item.published },
				],
				targetItem: { published: false },
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Publish'])
	})

	it('treats omitted visible as always shown (backwards compatible)', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [{ label: 'Plain' }],
				targetItem: { x: 1 },
			},
		})
		expect(wrapper.vm.visibleActions).toHaveLength(1)
	})

	it('respects boolean visible: false', () => {
		const wrapper = mount(CnContextMenu, {
			propsData: {
				actions: [
					{ label: 'Hidden', visible: false },
					{ label: 'Shown', visible: true },
				],
				targetItem: null,
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Shown'])
	})
})
