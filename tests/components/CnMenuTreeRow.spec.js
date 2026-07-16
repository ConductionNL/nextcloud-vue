/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnMenuTreeRow — inline icon/label/page editing of a menu item.
 */
import { mount } from '@vue/test-utils'
import CnMenuTreeRow from '../../src/components/CnMenuTreeNode/CnMenuTreeRow.vue'

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /><slot name="trigger" :attrs="{}" /></div>' })

function mountRow(item, pages = []) {
	return mount(CnMenuTreeRow, {
		propsData: { item, pages, canAddChild: true },
		stubs: {
			NcButton: Stub('NcButton', ['type', 'ariaLabel']),
			NcTextField: Stub('NcTextField', ['value', 'label']),
			NcSelect: Stub('NcSelect', ['value', 'options']),
			NcPopover: Stub('NcPopover', ['shown']),
			Cog: Stub('Cog'),
			Plus: Stub('Plus'),
			Delete: Stub('Delete'),
			DragVertical: Stub('DragVertical'),
		},
	})
}

describe('CnMenuTreeRow', () => {
	it('inline label edit mutates the item', () => {
		const item = { id: 'm', label: 'Old' }
		const wrapper = mountRow(item)
		wrapper.vm.startEdit('label')
		expect(wrapper.vm.editing).toBe('label')
		wrapper.vm.setLabel('Dogs')
		expect(item.label).toBe('Dogs')
	})

	it('onIcon stores the value CnIconBrowser emits, not an option object', () => {
		// The old NcSelect handed over `{ value }`; CnIconBrowser emits the value
		// itself — a registry key / SVG path / URL, which is the vocabulary
		// CnMenuItemIcon actually renders at runtime.
		const item = { id: 'm', label: 'M' }
		const wrapper = mountRow(item)
		wrapper.vm.onIcon('Star')
		expect(item.icon).toBe('Star')
	})

	it('clears the icon when the picker emits null', () => {
		const item = { id: 'm', label: 'M', icon: 'Star' }
		const wrapper = mountRow(item)
		wrapper.vm.onIcon(null)
		expect(item.icon).toBe('')
	})

	it('onPage sets the target route (page id) and closes the editor', () => {
		const item = { id: 'm', label: 'M' }
		const wrapper = mountRow(item, [{ value: 'DogsIndex', label: 'Dogs' }])
		wrapper.vm.onPage({ value: 'DogsIndex' })
		expect(item.route).toBe('DogsIndex')
		expect(wrapper.vm.editing).toBe(null)
	})

	it('pageLabel resolves the route to its page label', () => {
		const wrapper = mountRow({ id: 'm', route: 'DogsIndex' }, [{ value: 'DogsIndex', label: 'Dogs' }])
		expect(wrapper.vm.pageLabel).toBe('Dogs')
	})

	it('shows a generic dot until an icon is picked', () => {
		expect(mountRow({ id: 'm', icon: '' }).find('.cn-menu-tree__icon--generic').exists()).toBe(true)
		expect(mountRow({ id: 'm', icon: 'Star' }).find('.cn-menu-tree__icon--generic').exists()).toBe(false)
	})
})
