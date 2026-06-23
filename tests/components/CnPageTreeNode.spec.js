/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnPageTreeNode — the compact pages tree: sibling grouping by
 * `parent`, type selection, parent re-parenting with route build-up, reorder,
 * delete-with-reparent, and add-sub-page.
 */
import { mount } from '@vue/test-utils'
import CnPageTreeNode from '../../src/components/CnPageTreeNode/CnPageTreeNode.vue'

const NcButtonStub = { name: 'NcButton', props: ['disabled', 'pressed'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' }
const NcTextFieldStub = { name: 'NcTextField', props: ['value', 'label'], template: '<input :value="value">' }
const NcSelectStub = { name: 'NcSelect', props: ['value', 'options', 'inputLabel', 'label', 'clearable', 'placeholder'], template: '<div class="nc-select-stub" />' }

function mountNode(list, extra = {}) {
	return mount(CnPageTreeNode, {
		propsData: { list, parentId: '', depth: 0, maxDepth: 1, ...extra },
		stubs: { NcButton: NcButtonStub, NcTextField: NcTextFieldStub, NcSelect: NcSelectStub },
	})
}

describe('CnPageTreeNode', () => {
	it('siblings are the pages matching the parentId', () => {
		const list = [
			{ id: 'leads', type: 'index', route: '/leads' },
			{ id: 'lead', type: 'detail', route: '/leads/:id', parent: 'leads' },
			{ id: 'dash', type: 'dashboard', route: '/' },
		]
		const top = mountNode(list)
		expect(top.vm.siblings.map((p) => p.id)).toEqual(['leads', 'dash'])
		const child = mountNode(list, { parentId: 'leads', depth: 1 })
		expect(child.vm.siblings.map((p) => p.id)).toEqual(['lead'])
	})

	it('childrenOf returns pages whose parent is the page', () => {
		const list = [{ id: 'leads' }, { id: 'lead', parent: 'leads' }]
		const wrapper = mountNode(list)
		expect(wrapper.vm.childrenOf({ id: 'leads' }).map((p) => p.id)).toEqual(['lead'])
	})

	it('parentOptions offers only top-level pages other than self', () => {
		const list = [
			{ id: 'leads', title: 'Leads' },
			{ id: 'dash', title: 'Dashboard' },
			{ id: 'lead', title: 'Lead', parent: 'leads' },
		]
		const wrapper = mountNode(list)
		// for the detail page, eligible parents are the two top-level pages
		expect(wrapper.vm.parentOptions({ id: 'lead' }).map((o) => o.value).sort()).toEqual(['dash', 'leads'])
		// a page can't parent itself
		expect(wrapper.vm.parentOptions({ id: 'leads' }).map((o) => o.value)).toEqual(['dash'])
	})

	it('setType writes the chosen type in place', () => {
		const page = { id: 'a', type: 'index' }
		const wrapper = mountNode([page])
		wrapper.vm.setType(page, { value: 'dashboard' })
		expect(page.type).toBe('dashboard')
	})

	it('setParent nests the page and builds the route up from the parent', () => {
		const list = [
			{ id: 'leads', title: 'Leads', route: '/leads' },
			{ id: 'lead', title: 'Lead', route: '/lead', type: 'detail' },
		]
		const wrapper = mountNode(list)
		wrapper.vm.setParent(list[1], { value: 'leads' })
		expect(list[1].parent).toBe('leads')
		expect(list[1].route).toBe('/leads/lead')
		// clearing the parent flattens the route back to its own segment
		wrapper.vm.setParent(list[1], null)
		expect(list[1].parent).toBe('')
		expect(list[1].route).toBe('/lead')
	})

	it('move reorders within the sibling group in the flat list', () => {
		const list = [
			{ id: 'a' },
			{ id: 'lead', parent: 'a' },
			{ id: 'b' },
		]
		const wrapper = mountNode(list)
		wrapper.vm.move(list.find((p) => p.id === 'a'), 1) // a (top sibling) down past b
		expect(wrapper.vm.siblings.map((p) => p.id)).toEqual(['b', 'a'])
	})

	it('remove reparents children to the removed page parent', () => {
		const list = [
			{ id: 'leads', route: '/leads' },
			{ id: 'lead', parent: 'leads' },
		]
		const wrapper = mountNode(list)
		wrapper.vm.remove(list.find((p) => p.id === 'leads'))
		expect(list.map((p) => p.id)).toEqual(['lead'])
		expect(list[0].parent).toBe('') // reparented to top level
	})

	it('addChild appends a detail page parented under the page with a built-up route', () => {
		const list = [{ id: 'leads', route: '/leads' }]
		const wrapper = mountNode(list)
		wrapper.vm.addChild(list[0])
		expect(list.length).toBe(2)
		expect(list[1].parent).toBe('leads')
		expect(list[1].type).toBe('detail')
		expect(list[1].route).toBe('/leads/page-2')
	})
})
