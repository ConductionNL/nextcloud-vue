import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnRowActions from '@/components/CnRowActions/CnRowActions.vue'
import CnIcon from '@/components/CnIcon/CnIcon.vue'

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

describe('CnRowActions icon rendering', () => {
	it('renders a string icon as a CnIcon registry lookup (manifest actions)', () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: [{ label: 'View', icon: 'Eye', handler: jest.fn() }] },
		})
		const icon = wrapper.findComponent(CnIcon)
		expect(icon.exists()).toBe(true)
		expect(icon.props('name')).toBe('Eye')
	})

	it('renders a component icon directly without CnIcon (runtime actions)', () => {
		// Vue 2 passed `createElement` as `render()`'s first argument; Vue 3
		// passes none and `h` is imported from the package instead. The old
		// signature shadowed nothing, so the parameter was simply `undefined`
		// and the stub blew up with "h is not a function" at render time.
		const StubIcon = { name: 'StubIcon', render: () => h('span', 'icon') }
		const wrapper = mount(CnRowActions, {
			propsData: { actions: [{ label: 'View', icon: StubIcon, handler: jest.fn() }] },
		})
		expect(wrapper.findComponent(CnIcon).exists()).toBe(false)
		expect(wrapper.findComponent(StubIcon).exists()).toBe(true)
	})
})
