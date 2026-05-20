import { mount } from '@vue/test-utils'
import CnTreeView from '@/components/CnTreeView/CnTreeView.vue'

const tree = [
	{ id: 1, label: 'Root A', children: [
		{ id: 11, label: 'Child A1', children: [
			{ id: 111, label: 'Leaf A1a' },
		] },
		{ id: 12, label: 'Child A2' },
	] },
	{ id: 2, label: 'Root B' },
]

describe('CnTreeView', () => {
	it('renders root-level nodes only when nothing is expanded', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree } })
		expect(wrapper.text()).toContain('Root A')
		expect(wrapper.text()).toContain('Root B')
		expect(wrapper.text()).not.toContain('Child A1')
	})

	it('shows children when the parent is in expandedIds', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree, expandedIds: [1] } })
		expect(wrapper.text()).toContain('Child A1')
		expect(wrapper.text()).not.toContain('Leaf A1a')
	})

	it('expand caret toggles expandedIds via emit', async () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree } })
		await wrapper.findAll('.cn-tree-node__toggle').at(0).trigger('click')
		expect(wrapper.emitted('update:expanded-ids')[0][0]).toContain(1)
	})

	it('row click emits select with the node + update:selected-id', async () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree } })
		await wrapper.findAll('.cn-tree-node__row').at(0).trigger('click')
		expect(wrapper.emitted('select')[0][0]).toMatchObject({ id: 1, label: 'Root A' })
		expect(wrapper.emitted('update:selected-id')[0][0]).toBe(1)
	})

	it('marks selected node with the active modifier', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree, selectedId: 2 } })
		const nodes = wrapper.findAll('.cn-tree-node--selected')
		expect(nodes.length).toBe(1)
		expect(nodes.at(0).text()).toContain('Root B')
	})

	it('expandAll() emits a flat id list of every node', async () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree } })
		wrapper.vm.expandAll()
		const ids = wrapper.emitted('update:expanded-ids')[0][0]
		expect(ids).toEqual([1, 11, 111, 12, 2])
	})

	it('collapseAll() emits empty array', async () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree, expandedIds: [1, 11] } })
		wrapper.vm.collapseAll()
		expect(wrapper.emitted('update:expanded-ids')[0][0]).toEqual([])
	})

	it('renders the empty state when nodes[] is empty', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: [] } })
		expect(wrapper.find('.cn-tree-view__empty').exists()).toBe(true)
	})

	it('uses configurable idKey / labelKey / childrenKey', () => {
		const wrapper = mount(CnTreeView, {
			propsData: {
				nodes: [{ slug: 'a', name: 'Alpha', kids: [{ slug: 'b', name: 'Beta' }] }],
				idKey: 'slug',
				labelKey: 'name',
				childrenKey: 'kids',
				expandedIds: ['a'],
			},
		})
		expect(wrapper.text()).toContain('Alpha')
		expect(wrapper.text()).toContain('Beta')
	})

	it('renders the title + description', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes: tree, title: 'Categories', description: 'Click to browse' },
		})
		expect(wrapper.text()).toContain('Categories')
		expect(wrapper.text()).toContain('Click to browse')
	})

	it('renders the badge when set', () => {
		const wrapper = mount(CnTreeView, {
			propsData: { nodes: [{ id: 1, label: 'L', badge: 7 }] },
		})
		expect(wrapper.text()).toContain('7')
	})

	it('honours toggle on already-expanded id (collapse)', () => {
		const wrapper = mount(CnTreeView, { propsData: { nodes: tree, expandedIds: [1] } })
		wrapper.vm.toggleNode(1)
		expect(wrapper.emitted('update:expanded-ids')[0][0]).toEqual([])
	})
})
