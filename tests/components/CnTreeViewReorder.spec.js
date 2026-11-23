/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTreeView `reorderable`: rows move among their siblings by drag or by button.
 *
 * @spec openspec/changes/tree-view-reorder/specs/tree-view-reorder/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTreeView from '../../src/components/CnTreeView/CnTreeView.vue'

const DraggableStub = {
	name: 'Draggable',
	props: ['modelValue', 'itemKey', 'tag'],
	emits: ['change'],
	template: '<ul :role="$attrs.role"><template v-for="(element, index) in modelValue" :key="index"><slot name="item" :element="element" :index="index" /></template></ul>',
}

const NcButton = {
	props: ['disabled'],
	emits: ['click'],
	template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

function tree() {
	return [
		{ id: 'c1', label: 'Chapter 1', children: [{ id: 'l1', label: 'Lesson 1' }, { id: 'l2', label: 'Lesson 2' }, { id: 'l3', label: 'Lesson 3' }] },
		{ id: 'c2', label: 'Chapter 2', children: [{ id: 'l4', label: 'Lesson 4' }] },
	]
}

/**
 * Mounts the tree as a host would: a parent that writes `update:nodes` back.
 *
 * @param {object} [props] The props.
 * @param {object} [stubs] Other stubs.
 * @return {object} The mounted tree.
 */
function mountTree(props = {}, stubs = { Draggable: DraggableStub }) {
	const wrapper = mount(CnTreeView, {
		attachTo: document.body,
		props: {
			nodes: tree(),
			reorderable: true,
			expandedIds: ['c1', 'c2'],
			'onUpdate:nodes': (nodes) => wrapper.setProps({ nodes }),
			...props,
		},
		global: { stubs: { DragVertical: true, NcButton, ...stubs } },
	})
	return wrapper
}

const row = (w, id) => w.find(`[data-node-id="${id}"] > .cn-tree-node__row`)
const button = (w, id, way) => row(w, id).find(`[data-move="${way}"]`)
const labels = (w, list = w.props('nodes')) => list.map((node) => node.label)
const status = (w) => w.find('[data-testid="cn-tree-view-status"]')

describe('CnTreeView reorderable', () => {
	it('draws no move controls unless asked', () => {
		const w = mount(CnTreeView, { props: { nodes: tree(), expandedIds: ['c1'] } })
		expect(w.find('[data-move]').exists()).toBe(false)
		expect(w.find('.cn-tree-node__handle').exists()).toBe(false)
		expect(status(w).exists()).toBe(false)
	})

	it('moves a child among its siblings and leaves the rest of the tree alone', async () => {
		const nodes = tree()
		const w = mountTree({ nodes })
		await button(w, 'l1', 'down').trigger('click')
		const next = w.props('nodes')
		expect(labels(w, next[0].children)).toEqual(['Lesson 2', 'Lesson 1', 'Lesson 3'])
		expect(labels(w, next[1].children)).toEqual(['Lesson 4'])
		expect(labels(w, nodes[0].children)).toEqual(['Lesson 1', 'Lesson 2', 'Lesson 3'])
	})

	it('moves a row at the root', async () => {
		const w = mountTree()
		await button(w, 'c2', 'up').trigger('click')
		expect(labels(w)).toEqual(['Chapter 2', 'Chapter 1'])
		expect(w.emitted('move')[0][0]).toMatchObject({ parentId: null, from: 1, to: 0 })
	})

	it('tells the host what to save', async () => {
		const w = mountTree()
		await button(w, 'l2', 'up').trigger('click')
		const move = w.emitted('move')[0][0]
		expect(move).toMatchObject({ parentId: 'c1', from: 1, to: 0 })
		expect(move.node.id).toBe('l2')
		expect(labels(w, move.siblings)).toEqual(['Lesson 2', 'Lesson 1', 'Lesson 3'])
	})

	it('says the new position, and takes the words of the host', async () => {
		const w = mountTree({ reorderLabels: { moved: '{label} verplaatst naar positie {position} van {total}.' } })
		await button(w, 'l1', 'down').trigger('click')
		expect(status(w).text()).toBe('Lesson 1 verplaatst naar positie 2 van 3.')
		expect(status(w).attributes('role')).toBe('status')
		await w.setProps({ moveStatus: 'Saved' })
		expect(status(w).text()).toBe('Saved')
	})

	it('keeps focus on the button that moved the row', async () => {
		const w = mountTree()
		await button(w, 'l1', 'down').trigger('click')
		await nextTick()
		expect(document.activeElement).toBe(button(w, 'l1', 'down').element)
	})

	it('hands focus to the other button at the end of the siblings', async () => {
		const w = mountTree()
		await button(w, 'l2', 'down').trigger('click')
		await nextTick()
		expect(document.activeElement).toBe(button(w, 'l2', 'up').element)
	})

	it('disables the way out of the siblings, so nothing moves to another parent', () => {
		const w = mountTree()
		expect(button(w, 'l1', 'up').attributes('disabled')).toBeDefined()
		expect(button(w, 'l1', 'down').attributes('disabled')).toBeUndefined()
		expect(button(w, 'l3', 'down').attributes('disabled')).toBeDefined()
		expect(button(w, 'l4', 'up').attributes('disabled')).toBeDefined()
		expect(button(w, 'l4', 'down').attributes('disabled')).toBeDefined()
		expect(button(w, 'c1', 'up').attributes('disabled')).toBeDefined()
	})

	it('names the buttons by what they move', () => {
		const w = mountTree()
		expect(button(w, 'l2', 'up').attributes('aria-label')).toBe('Move up: Lesson 2')
		const dutch = mountTree({ reorderLabels: { moveUp: 'Omhoog', controlName: '{label} {action}' } })
		expect(button(dutch, 'l2', 'up').attributes('aria-label')).toBe('Lesson 2 Omhoog')
		expect(button(dutch, 'l2', 'up').text()).toBe('Omhoog')
	})

	it('does not select the row when a move button is pressed', async () => {
		const w = mountTree()
		await button(w, 'l1', 'down').trigger('click')
		expect(w.emitted('select')).toBeUndefined()
	})

	it('applies a drag of a child, and says where it landed', async () => {
		const w = mountTree()
		const [childList] = w.findAllComponents({ name: 'Draggable' }).filter((list) => list.props('modelValue')[0].id === 'l1')
		const dragged = tree()[0].children[0]
		childList.vm.$emit('change', { moved: { element: dragged, oldIndex: 0, newIndex: 2 } })
		await nextTick()
		expect(labels(w, w.props('nodes')[0].children)).toEqual(['Lesson 2', 'Lesson 3', 'Lesson 1'])
		expect(status(w).text()).toBe('Lesson 1 moved to position 3 of 3.')
		expect(w.emitted('move')[0][0]).toMatchObject({ parentId: 'c1', from: 0, to: 2 })
	})

	it('applies a drag at the root', async () => {
		const w = mountTree()
		const root = w.findAllComponents({ name: 'Draggable' }).find((list) => list.props('modelValue')[0].id === 'c1')
		root.vm.$emit('change', { moved: { element: tree()[1], oldIndex: 1, newIndex: 0 } })
		await nextTick()
		expect(labels(w)).toEqual(['Chapter 2', 'Chapter 1'])
	})

	it('finds a parent deep in the tree, under idKey and childrenKey', async () => {
		const nodes = [{ key: 'a', name: 'A', kids: [{ key: 'b', name: 'B', kids: [{ key: 'c', name: 'C' }, { key: 'd', name: 'D' }] }] }]
		const w = mountTree({ nodes, idKey: 'key', labelKey: 'name', childrenKey: 'kids', expandedIds: ['a', 'b'] })
		await button(w, 'd', 'up').trigger('click')
		expect(w.props('nodes')[0].kids[0].kids.map((node) => node.name)).toEqual(['D', 'C'])
	})

	it('renders through the real vuedraggable, with the tree role', () => {
		const w = mountTree({}, { Draggable: false })
		expect(w.find('ul.cn-tree-view__root').attributes('role')).toBe('tree')
		expect(w.find('ul.cn-tree-node__children').attributes('role')).toBe('group')
		expect(w.findAll('.cn-tree-node')).toHaveLength(6)
	})
})
