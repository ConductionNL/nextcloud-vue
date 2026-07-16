/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnPageTreeNode — the drag-and-drop pages tree: building the nested
 * mirror from the flat `pages[]`, flattening it back (parent assignment + order),
 * the depth-1 drag guard, and add/remove with child reparenting.
 */
import { mount } from '@vue/test-utils'
import CnPageTreeNode from '../../src/components/CnPageTreeNode/CnPageTreeNode.vue'

// Stub vuedraggable + the row so the node mounts without Sortable / child deps.
const DraggableStub = { name: 'draggable', props: ['value', 'list', 'group', 'move'], template: '<ul><slot /></ul>' }
const RowStub = { name: 'CnPageTreeRow', props: ['page', 'canAddChild'], template: '<div class="row-stub" />' }

function mountNode(list) {
	return mount(CnPageTreeNode, {
		propsData: { list, maxDepth: 1 },
		stubs: { draggable: DraggableStub, CnPageTreeRow: RowStub },
	})
}

describe('CnPageTreeNode', () => {
	it('buildTree groups children under their top-level parent', () => {
		const list = [
			{ id: 'dash', type: 'dashboard', route: '/' },
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' },
		]
		const wrapper = mountNode(list)
		const tree = wrapper.vm.tree
		expect(tree.map((n) => n.ref.id)).toEqual(['dash', 'dogs'])
		expect(tree[1].children.map((c) => c.ref.id)).toEqual(['dog'])
	})

	it('buildTree surfaces an orphan (parent not a top page) as top-level', () => {
		const list = [
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'ghost', type: 'detail', route: '/x', parent: 'does-not-exist' },
		]
		const wrapper = mountNode(list)
		expect(wrapper.vm.tree.map((n) => n.ref.id).sort()).toEqual(['dogs', 'ghost'])
	})

	it('flatten writes parent for nested nodes and drops it for top nodes (in place)', () => {
		const list = [
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' },
		]
		const wrapper = mountNode(list)
		// Simulate a drag that lifted the detail to top level.
		wrapper.vm.tree = [
			{ ref: list.find((p) => p.id === 'dogs'), children: [] },
			{ ref: list.find((p) => p.id === 'dog'), children: [] },
		]
		wrapper.vm.flatten()
		expect(list.map((p) => p.id)).toEqual(['dogs', 'dog'])
		expect(list[0].parent).toBeUndefined()
		expect(list[1].parent).toBeUndefined() // lifted out → parent dropped
	})

	it('flatten nests a node, assigning parent = top id', () => {
		const dogs = { id: 'dogs', type: 'index', route: '/dogs' }
		const dog = { id: 'dog', type: 'detail', route: '/dogs/:id' }
		const list = [dogs, dog]
		const wrapper = mountNode(list)
		wrapper.vm.tree = [{ ref: dogs, children: [{ ref: dog, children: [] }] }]
		wrapper.vm.flatten()
		expect(list.map((p) => p.id)).toEqual(['dogs', 'dog'])
		expect(dog.parent).toBe('dogs')
	})

	it('onMove forbids dropping a node WITH children into a child list (depth cap)', () => {
		const wrapper = mountNode([{ id: 'a' }])
		const childList = [] // any array that is not the top tree
		const withChildren = { ref: { id: 'p' }, children: [{ ref: { id: 'c' } }] }
		const leaf = { ref: { id: 'q' }, children: [] }
		expect(wrapper.vm.onMove({ draggedContext: { element: withChildren }, relatedContext: { list: childList } })).toBe(false)
		// a leaf may nest
		expect(wrapper.vm.onMove({ draggedContext: { element: leaf }, relatedContext: { list: childList } })).toBe(true)
		// any move onto the top tree is allowed
		expect(wrapper.vm.onMove({ draggedContext: { element: withChildren }, relatedContext: { list: wrapper.vm.tree } })).toBe(true)
	})

	it('addChild appends a detail sub-page with a unique id and built-up route', () => {
		const list = [{ id: 'dogs', type: 'index', route: '/dogs' }]
		const wrapper = mountNode(list)
		wrapper.vm.addChild(wrapper.vm.tree[0])
		expect(list.length).toBe(2)
		const child = list[1]
		expect(child.parent).toBe('dogs')
		expect(child.type).toBe('detail')
		expect(child.route).toBe('/dogs/:id')
	})

	it('removeNode lifts a removed top page\'s children to top level', () => {
		const list = [
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' },
		]
		const wrapper = mountNode(list)
		wrapper.vm.removeNode(wrapper.vm.tree[0], null)
		expect(list.map((p) => p.id)).toEqual(['dog'])
		expect(list[0].parent).toBeUndefined() // reparented to top
	})

	it('renamePage cascades the new id to child parents and menu links', () => {
		const dogs = { id: 'dogs', type: 'index', route: '/dogs' }
		const dog = { id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' }
		const list = [dogs, dog]
		const menu = [{ id: 'm1', label: 'Dogs', route: 'dogs' }]
		const wrapper = mount(CnPageTreeNode, {
			propsData: { list, menu, maxDepth: 1 },
			stubs: { draggable: DraggableStub, CnPageTreeRow: RowStub },
		})
		wrapper.vm.renamePage(dogs, 'hounds')
		expect(dogs.id).toBe('hounds')
		expect(dog.parent).toBe('hounds') // child reparented
		expect(menu[0].route).toBe('hounds') // menu link re-pointed
	})

	it('renamePage is a no-op when the new id collides', () => {
		const a = { id: 'a', type: 'index' }
		const b = { id: 'b', type: 'index' }
		const wrapper = mountNode([a, b])
		wrapper.vm.renamePage(a, 'b')
		expect(a.id).toBe('a') // unchanged — collision
	})

	it('removeNode removes a child from its parent', () => {
		const list = [
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' },
		]
		const wrapper = mountNode(list)
		const top = wrapper.vm.tree[0]
		wrapper.vm.removeNode(top.children[0], top)
		expect(list.map((p) => p.id)).toEqual(['dogs'])
	})
})
