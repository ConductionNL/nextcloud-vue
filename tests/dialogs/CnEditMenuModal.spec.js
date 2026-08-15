/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditMenuModal — focuses on pageOptions, the Page-dropdown source
 * for menu items. @nextcloud/vue is auto-stubbed via tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import CnEditMenuModal from '../../src/dialogs/CnEditMenuModal.vue'

const CnMenuTreeNodeStub = { name: 'CnMenuTreeNode', props: ['list', 'parentId', 'depth', 'maxDepth', 'pages'], template: '<div class="menu-tree-stub" />' }

function mountModal(working) {
	return mount(CnEditMenuModal, { propsData: { working }, stubs: { CnMenuTreeNode: CnMenuTreeNodeStub } })
}

describe('CnEditMenuModal', () => {
	it('pageOptions lists navigable pages by id', () => {
		const working = {
			pages: [
				{ id: 'dash', route: '/', type: 'dashboard', title: 'Dashboard' },
				{ id: 'dogs', route: '/dogs', type: 'index', title: 'Dogs' },
			],
		}
		const wrapper = mountModal(working)
		expect(wrapper.vm.pageOptions).toEqual([
			{ value: 'dash', label: 'Dashboard' },
			{ value: 'dogs', label: 'Dogs' },
		])
	})

	it('pageOptions EXCLUDES detail pages whose route has a :param', () => {
		const working = {
			pages: [
				{ id: 'dogs', route: '/dogs', type: 'index', title: 'Dogs' },
				{ id: 'dog', route: '/dogs/:id', type: 'detail', title: 'Dogs', parent: 'dogs' },
			],
		}
		const wrapper = mountModal(working)
		// only the index is a valid menu target — the detail needs a record id
		expect(wrapper.vm.pageOptions.map((o) => o.value)).toEqual(['dogs'])
	})

	it('pageOptions falls back to the id when a page has no title', () => {
		const working = { pages: [{ id: 'page-3', route: '/x', type: 'index' }] }
		const wrapper = mountModal(working)
		expect(wrapper.vm.pageOptions).toEqual([{ value: 'page-3', label: 'page-3' }])
	})

	it('passes pageOptions down to the menu tree node', () => {
		const working = { pages: [{ id: 'dogs', route: '/dogs', type: 'index', title: 'Dogs' }], menu: [] }
		const wrapper = mountModal(working)
		const node = wrapper.findComponent(CnMenuTreeNodeStub)
		expect(node.props('pages')).toEqual([{ value: 'dogs', label: 'Dogs' }])
	})
})
