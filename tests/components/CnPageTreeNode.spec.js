/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnPageTreeNode — the drag-and-drop pages tree: building the nested
 * mirror from the flat `pages[]`, flattening it back (parent assignment + order),
 * the depth-1 drag guard, and add/remove with child reparenting.
 */
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import CnPageTreeNode from '../../src/components/CnPageTreeNode/CnPageTreeNode.vue'

// Stub vuedraggable + the row so the node mounts without Sortable / child deps.
// Mirrors vuedraggable@4: rows come from the `#item` slot, one per element,
// NOT from the default slot. The stub used to render `<slot />`, which is the
// Vue 2 contract — so a component still written against Vue 2 rendered fine
// here while the real component threw "draggable element must have an item
// slot" in the browser. With this stub, that form renders nothing and the row
// assertions below fail.
const DraggableStub = {
	name: 'draggable',
	props: ['modelValue', 'value', 'list', 'group', 'move', 'itemKey', 'tag'],
	computed: {
		items() {
			return this.modelValue || this.value || this.list || []
		},
	},
	template: '<ul><template v-for="(element, index) in items" :key="index"><slot name="item" :element="element" :index="index" /></template></ul>',
}
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

	it('nodeKey is stable across a slug rename (row is not torn down → panel stays open)', () => {
		const dogs = { id: 'dogs', type: 'index', route: '/dogs' }
		const wrapper = mountNode([dogs])
		const before = wrapper.vm.nodeKey(dogs)
		wrapper.vm.renamePage(dogs, 'hounds')
		// The page object is the same ref (only `id` changed) → same render key,
		// so Vue reuses the <li>/row instance and its open settings panel.
		expect(dogs.id).toBe('hounds')
		expect(wrapper.vm.nodeKey(dogs)).toBe(before)
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

	it('picks up a page the HOST appends in place, without a new array', async () => {
		// What the "Add page" button does: push onto the working manifest's
		// `pages[]`, which IS this prop. The array reference never changes, so
		// the `list` watcher alone never fired and the new page was appended to
		// the manifest but never appeared.
		//
		// `reactive()` because that is what the component really receives —
		// `useManifestEditor.enter()` installs a reactive proxy over the live
		// manifest. A plain array here would track nothing and the test would
		// fail against correct code.
		const list = reactive([{ id: 'dash', type: 'dashboard', route: '/' }])
		const wrapper = mountNode(list)
		expect(wrapper.findAll('.row-stub').length).toBe(1)

		list.push({ id: 'page-2', type: 'custom', route: '/page-2' })
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.tree.map((n) => n.ref.id)).toEqual(['dash', 'page-2'])
		expect(wrapper.findAll('.row-stub').length).toBe(2)
	})

	it('does NOT rebuild the tree when a row edits a field in place', async () => {
		// Why the watcher keys on length and not `deep: true`: a deep watcher
		// fires on every keystroke in a row's Title/Route field and re-seeds
		// the tree, tearing down the row whose settings panel is open.
		const list = reactive([{ id: 'dogs', type: 'index', route: '/dogs', title: '' }])
		const wrapper = mountNode(list)
		const before = wrapper.vm.tree

		list[0].title = 'Dogs'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.tree).toBe(before)
	})

	it('renders a row per node through the #item slot, nested children included', () => {
		// Every other test here works at vm level, so the whole suite passed
		// while the component was still written against vuedraggable's Vue 2
		// API and threw on render in the browser. This asserts rows actually
		// come out.
		const list = [
			{ id: 'dash', type: 'dashboard', route: '/' },
			{ id: 'dogs', type: 'index', route: '/dogs' },
			{ id: 'dog', type: 'detail', route: '/dogs/:id', parent: 'dogs' },
		]
		const wrapper = mountNode(list)
		// Two top-level rows + the nested one = three CnPageTreeRow renders.
		expect(wrapper.findAll('.row-stub').length).toBe(3)
		expect(wrapper.findAll('.cn-page-tree__node').length).toBe(3)
	})
})
