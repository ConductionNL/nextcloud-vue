import { mount } from '@vue/test-utils'
import CnRowActions from '@/components/CnRowActions/CnRowActions.vue'

const baseActions = [
	{ label: 'Edit', handler: jest.fn() },
	{ label: 'Publish', handler: jest.fn(), visible: (row) => !row.published },
	{ label: 'Depublish', handler: jest.fn(), visible: (row) => row.published },
	{ label: 'AlwaysHidden', handler: jest.fn(), visible: false },
	{ label: 'AlwaysShown', handler: jest.fn(), visible: true },
]

describe('CnRowActions visible predicate', () => {
	it('hides actions whose visible function returns false for the row', () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: baseActions, row: { published: false } },
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toContain('Edit')
		expect(labels).toContain('Publish')
		expect(labels).not.toContain('Depublish')
		expect(labels).not.toContain('AlwaysHidden')
		expect(labels).toContain('AlwaysShown')
	})

	it('flips state-dependent visibility when row state changes', async () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: baseActions, row: { published: true } },
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toContain('Depublish')
		expect(labels).not.toContain('Publish')
	})

	it('treats actions without a visible field as always shown (backwards compatible)', () => {
		const wrapper = mount(CnRowActions, {
			propsData: {
				actions: [{ label: 'Plain', handler: jest.fn() }],
				row: { anything: true },
			},
		})
		expect(wrapper.vm.visibleActions).toHaveLength(1)
		expect(wrapper.vm.visibleActions[0].label).toBe('Plain')
	})

	it('respects boolean visible: false even when no row is supplied', () => {
		const wrapper = mount(CnRowActions, {
			propsData: {
				actions: [
					{ label: 'Hidden', visible: false },
					{ label: 'Shown', visible: true },
				],
			},
		})
		const labels = wrapper.vm.visibleActions.map(a => a.label)
		expect(labels).toEqual(['Shown'])
	})
})
