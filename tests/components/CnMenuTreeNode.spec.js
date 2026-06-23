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

const NcSelectStub = {
	name: 'NcSelect',
	props: ['value', 'options', 'inputLabel', 'label', 'clearable', 'placeholder'],
	template: '<div class="nc-select-stub" />',
}

function mountNode(list, extra = {}) {
	return mount(CnMenuTreeNode, {
		propsData: { list, depth: 0, maxDepth: 1, ...extra },
		stubs: { NcButton: NcButtonStub, NcTextField: NcTextFieldStub, NcSelect: NcSelectStub },
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

	it('icon dropdown offers Nextcloud icon-* classes', () => {
		const wrapper = mountNode([{ id: 'a', label: 'A', icon: '', route: '', order: 10 }])
		expect(wrapper.vm.iconOptions.length).toBeGreaterThan(10)
		expect(wrapper.vm.iconOptions.every((o) => o.value.startsWith('icon-'))).toBe(true)
	})

	it('selectedIcon resolves a known option and falls back for custom values', () => {
		const wrapper = mountNode([{ id: 'a', label: 'A', icon: 'icon-files', route: '', order: 10 }])
		expect(wrapper.vm.selectedIcon({ icon: 'icon-files' }).value).toBe('icon-files')
		expect(wrapper.vm.selectedIcon({ icon: 'icon-unknown-xyz' })).toEqual({ value: 'icon-unknown-xyz', label: 'icon-unknown-xyz' })
		expect(wrapper.vm.selectedIcon({ icon: '' })).toBe(null)
	})

	it('selectedPage resolves against the passed pages', () => {
		const pages = [{ value: 'Dashboard', label: 'Dashboard' }, { value: 'Leads', label: 'Leads' }]
		const wrapper = mountNode([{ id: 'a', label: 'A', icon: '', route: 'Leads', order: 10 }], { pages })
		expect(wrapper.vm.selectedPage({ route: 'Leads' })).toEqual({ value: 'Leads', label: 'Leads' })
		expect(wrapper.vm.selectedPage({ route: '' })).toBe(null)
	})

	it('setField writes the option value (or clears) onto the item in place', () => {
		const item = { id: 'a', label: 'A', icon: '', route: '', order: 10 }
		const wrapper = mountNode([item])
		wrapper.vm.setField(item, 'icon', { value: 'icon-files', label: 'Files' })
		expect(item.icon).toBe('icon-files')
		wrapper.vm.setField(item, 'route', { value: 'Dashboard', label: 'Dashboard' })
		expect(item.route).toBe('Dashboard')
		wrapper.vm.setField(item, 'icon', null)
		expect(item.icon).toBe('')
	})

	it('passes pages down to nested child rows', () => {
		const pages = [{ value: 'Dashboard', label: 'Dashboard' }]
		const list = [{ id: 'a', label: 'A', order: 10, children: [{ id: 'c', label: 'C', order: 10 }] }]
		const wrapper = mountNode(list, { pages })
		const child = wrapper.findComponent({ name: 'CnMenuTreeNode' })
		// the recursive child instance receives the same pages
		const nested = wrapper.findAllComponents({ name: 'CnMenuTreeNode' })
		expect(nested.length).toBeGreaterThan(1)
		expect(nested.at(1).props('pages')).toEqual(pages)
		expect(child).toBeTruthy()
	})
})
