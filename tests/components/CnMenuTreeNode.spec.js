/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import CnMenuTreeNode from '../../src/components/CnMenuTreeNode/CnMenuTreeNode.vue'

const NcButtonStub = {
	name: 'NcButton',
	props: ['disabled', 'pressed'],
	template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
}
const NcTextFieldStub = {
	name: 'NcTextField',
	props: ['value', 'label'],
	template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)">',
}

function mountNode(list) {
	return mount(CnMenuTreeNode, {
		propsData: { list, depth: 0, maxDepth: 1 },
		stubs: { NcButton: NcButtonStub, NcTextField: NcTextFieldStub },
	})
}

describe('CnMenuTreeNode', () => {
	it('renders siblings sorted by order', () => {
		const list = [
			{ id: 'b', label: 'B', order: 20 },
			{ id: 'a', label: 'A', order: 10 },
		]
		const wrapper = mountNode(list)
		const labels = wrapper.findAll('.cn-menu-tree__label').wrappers.map((w) => w.text())
		expect(labels).toEqual(['A', 'B'])
	})

	it('toggles a per-item editor with the cog', async () => {
		const list = [{ id: 'a', label: 'A', icon: '', route: '', order: 10 }]
		const wrapper = mountNode(list)
		expect(wrapper.find('.cn-menu-tree__editor').exists()).toBe(false)
		// first action button is the edit cog
		await wrapper.findAll('.cn-menu-tree__actions button').at(0).trigger('click')
		expect(wrapper.find('.cn-menu-tree__editor').exists()).toBe(true)
	})

	it('move renumbers order within the sibling list', async () => {
		const list = [
			{ id: 'a', label: 'A', order: 10 },
			{ id: 'b', label: 'B', order: 20 },
		]
		const wrapper = mountNode(list)
		// move the first row (A) down: its action row has [cog, add, up, down, delete]
		const firstRowButtons = wrapper.findAll('.cn-menu-tree__node').at(0).findAll('.cn-menu-tree__actions button')
		await firstRowButtons.at(3).trigger('click') // down
		expect(list.find((i) => i.id === 'a').order).toBe(20)
		expect(list.find((i) => i.id === 'b').order).toBe(10)
	})

	it('remove splices the item from the list', async () => {
		const list = [{ id: 'a', label: 'A', order: 10 }, { id: 'b', label: 'B', order: 20 }]
		const wrapper = mountNode(list)
		const firstRowButtons = wrapper.findAll('.cn-menu-tree__node').at(0).findAll('.cn-menu-tree__actions button')
		await firstRowButtons.at(4).trigger('click') // delete
		expect(list.map((i) => i.id)).toEqual(['b'])
	})

	it('addChild creates a children array and nests a blank item', async () => {
		const list = [{ id: 'a', label: 'A', order: 10 }]
		const wrapper = mountNode(list)
		const firstRowButtons = wrapper.findAll('.cn-menu-tree__node').at(0).findAll('.cn-menu-tree__actions button')
		await firstRowButtons.at(1).trigger('click') // add sub-item
		expect(Array.isArray(list[0].children)).toBe(true)
		expect(list[0].children.length).toBe(1)
	})
})
