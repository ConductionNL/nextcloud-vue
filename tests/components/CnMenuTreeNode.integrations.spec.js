/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Regression cover for ADR-110: the menu-tree editors must scope by section
 * EXACTLY, not by "is it settings or not".
 *
 * The original scoping asked `(item.section === 'settings') === wantSettings`.
 * That is right while exactly two sections exist. `section: "integrations"`
 * answers `false` to "is settings", so the MAIN editor claimed every
 * integration entry — and `flatten()` `delete`s the section marker on
 * everything the editor it runs in claims. Opening the main-menu editor and
 * saving would therefore have converted every cross-app link back into a nav
 * entry: silently, with no error, and undoing the exact contract the section
 * exists to enforce. These tests fail against that implementation.
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

describe('CnMenuTreeNode — integrations section isolation', () => {
	it('the main editor does not show integrations entries', () => {
		const list = [
			{ id: 'a', label: 'A', order: 10 },
			{ id: 'i', label: 'AVG', href: '/apps/openregister/#/avg', section: 'integrations', order: 20 },
		]
		expect(mountNode(list).vm.tree.map((n) => n.ref.id)).toEqual(['a'])
	})

	it('the settings editor does not show integrations entries', () => {
		const list = [
			{ id: 's', label: 'S', section: 'settings', order: 10 },
			{ id: 'i', label: 'AVG', href: '/apps/x', section: 'integrations', order: 20 },
		]
		expect(mountNode(list, 'settings').vm.tree.map((n) => n.ref.id)).toEqual(['s'])
	})

	it('saving the MAIN editor preserves section: integrations', () => {
		// The regression. Before the fix this assertion failed: `section` was
		// deleted and the link silently returned to the navigation.
		const integration = { id: 'i', label: 'AVG', href: '/apps/openregister/#/avg', section: 'integrations', order: 20 }
		const a = { id: 'a', label: 'A' }
		const list = [a, integration]
		const wrapper = mountNode(list)
		wrapper.vm.tree = [{ ref: a, children: [] }]
		wrapper.vm.flatten()
		expect(list.find((i) => i.id === 'i').section).toBe('integrations')
		expect(list.find((i) => i.id === 'i').href).toBe('/apps/openregister/#/avg')
	})

	it('saving the SETTINGS editor preserves section: integrations', () => {
		const integration = { id: 'i', label: 'AVG', href: '/apps/x', section: 'integrations', order: 20 }
		const s = { id: 's', label: 'S', section: 'settings' }
		const list = [s, integration]
		const wrapper = mountNode(list, 'settings')
		wrapper.vm.tree = [{ ref: s, children: [] }]
		wrapper.vm.flatten()
		expect(list.find((i) => i.id === 'i').section).toBe('integrations')
	})

	it('an integrations editor tags its own entries and leaves main/settings alone', () => {
		const main = { id: 'a', label: 'A' }
		const settings = { id: 's', label: 'S', section: 'settings' }
		const untagged = { id: 'i', label: 'AVG', href: '/apps/x' }
		const list = [main, settings, untagged]
		const wrapper = mountNode(list, 'integrations')
		wrapper.vm.tree = [{ ref: untagged, children: [] }]
		wrapper.vm.flatten()
		expect(list.find((i) => i.id === 'i').section).toBe('integrations')
		expect(list.find((i) => i.id === 'a').section).toBeUndefined()
		expect(list.find((i) => i.id === 's').section).toBe('settings')
	})

	it('no entry is lost when an editor saves', () => {
		const list = [
			{ id: 'a', label: 'A' },
			{ id: 's', label: 'S', section: 'settings' },
			{ id: 'i', label: 'AVG', href: '/apps/x', section: 'integrations' },
		]
		const wrapper = mountNode(list)
		wrapper.vm.flatten()
		expect(list.map((i) => i.id).sort()).toEqual(['a', 'i', 's'])
	})
})
