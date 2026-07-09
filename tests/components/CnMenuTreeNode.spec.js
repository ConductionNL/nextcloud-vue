/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnMenuTreeNode — the drag-and-drop menu tree: section-scoped tree
 * build, flatten (order renumber + section marker + children rebuild + other-
 * section preservation), depth-1 drag guard, and add/remove.
 */
import { mount } from '@vue/test-utils'
import CnMenuTreeNode from '../../src/components/CnMenuTreeNode/CnMenuTreeNode.vue'

const DraggableStub = { name: 'draggable', props: ['value', 'list', 'group', 'move'], template: '<ul><slot /></ul>' }
const RowStub = { name: 'CnMenuTreeRow', props: ['item', 'pages', 'canAddChild'], template: '<div class="row-stub" />' }

function mountNode(list, section = null) {
	return mount(CnMenuTreeNode, {
		propsData: { list, maxDepth: 1, pages: [], section },
		stubs: { draggable: DraggableStub, CnMenuTreeRow: RowStub },
	})
}

describe('CnMenuTreeNode', () => {
	it('buildTree scopes the top level to the (non-)settings section and orders by `order`', () => {
		const list = [
			{ id: 'b', label: 'B', order: 20 },
			{ id: 'a', label: 'A', order: 10 },
			{ id: 's', label: 'S', section: 'settings', order: 10 },
		]
		expect(mountNode(list).vm.tree.map((n) => n.ref.id)).toEqual(['a', 'b'])
		expect(mountNode(list, 'settings').vm.tree.map((n) => n.ref.id)).toEqual(['s'])
	})

	it('buildTree nests children (ordered)', () => {
		const list = [{ id: 'a', label: 'A', children: [{ id: 'a2', order: 20 }, { id: 'a1', order: 10 }] }]
		expect(mountNode(list).vm.tree[0].children.map((c) => c.ref.id)).toEqual(['a1', 'a2'])
	})

	it('flatten renumbers order, reorders, and preserves the other section', () => {
		const settings = { id: 's', label: 'S', section: 'settings', order: 10 }
		const a = { id: 'a', label: 'A' }
		const b = { id: 'b', label: 'B' }
		const list = [a, b, settings]
		const wrapper = mountNode(list) // main editor
		wrapper.vm.tree = [{ ref: b, children: [] }, { ref: a, children: [] }]
		wrapper.vm.flatten()
		expect(list.map((it) => it.id)).toEqual(['b', 'a', 's'])
		expect(b.order).toBe(10)
		expect(a.order).toBe(20)
		expect(list.find((it) => it.id === 's')).toBe(settings)
	})

	it('flatten in the settings editor sets the section marker on top + nests children without a section', () => {
		const s1 = { id: 's1', label: 'S1', section: 'settings' }
		const s2 = { id: 's2', label: 'S2', section: 'settings' }
		const list = [s1, s2]
		const wrapper = mountNode(list, 'settings')
		wrapper.vm.tree = [{ ref: s1, children: [{ ref: s2, children: [] }] }]
		wrapper.vm.flatten()
		expect(s1.section).toBe('settings')
		expect(Array.isArray(s1.children) && s1.children[0]).toBe(s2)
		expect(s2.section).toBeUndefined() // child carries no section
	})

	it('onMove forbids a node with children into a child list', () => {
		const wrapper = mountNode([{ id: 'a' }])
		const withChildren = { ref: { id: 'p' }, children: [{ ref: { id: 'c' } }] }
		const leaf = { ref: { id: 'q' }, children: [] }
		expect(wrapper.vm.onMove({ draggedContext: { element: withChildren }, relatedContext: { list: [] } })).toBe(false)
		expect(wrapper.vm.onMove({ draggedContext: { element: leaf }, relatedContext: { list: [] } })).toBe(true)
		expect(wrapper.vm.onMove({ draggedContext: { element: withChildren }, relatedContext: { list: wrapper.vm.tree } })).toBe(true)
	})

	it('addChild appends a blank child with a unique id', () => {
		const list = [{ id: 'a', label: 'A' }]
		const wrapper = mountNode(list)
		wrapper.vm.addChild(wrapper.vm.tree[0])
		expect(Array.isArray(list[0].children)).toBe(true)
		expect(list[0].children.length).toBe(1)
		expect(typeof list[0].children[0].id).toBe('string')
	})

	it('removeNode lifts a removed top item\'s children to top level', () => {
		const a = { id: 'a', label: 'A', children: [{ id: 'c', label: 'C' }] }
		const list = [a]
		const wrapper = mountNode(list)
		wrapper.vm.removeNode(wrapper.vm.tree[0], null)
		expect(list.map((it) => it.id)).toEqual(['c'])
	})
})
