/**
 * Tests for CnFolderSidebar — the source-agnostic folder navigation sidebar.
 * Covers the "All" reset, the custom (flat → nested) tree builder, the
 * field-grouping source, and the files source via an injected fetcher.
 */

const { shallowMount, mount } = require('@vue/test-utils')
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))
const CnFolderSidebar = require('../../src/components/CnFolderSidebar/CnFolderSidebar.vue').default

describe('CnFolderSidebar — custom source', () => {
	const folders = [
		{ id: '1', name: 'Personal', parentId: null },
		{ id: '2', name: 'Work', parentId: null },
		{ id: '3', name: 'Clients', parentId: '2' },
	]

	it('emits select(null) from the All entry', async () => {
		const wrapper = shallowMount(CnFolderSidebar, { propsData: { folders } })
		await wrapper.find('.cn-folder-sidebar__all').trigger('click')
		expect(wrapper.emitted('select')[0]).toEqual([null])
	})

	it('builds a nested tree from a flat parentId list', () => {
		const wrapper = shallowMount(CnFolderSidebar, { propsData: { folders } })
		const tree = wrapper.vm.normalizedTree
		expect(tree).toHaveLength(2)
		const work = tree.find((f) => f.name === 'Work')
		expect(work.children).toHaveLength(1)
		expect(work.children[0].name).toBe('Clients')
	})

	it('shows the New-folder button only when allowCreate', () => {
		const off = shallowMount(CnFolderSidebar, { propsData: { folders } })
		expect(off.find('.cn-folder-sidebar__new').exists()).toBe(false)
		const on = shallowMount(CnFolderSidebar, { propsData: { folders, allowCreate: true } })
		expect(on.find('.cn-folder-sidebar__new').exists()).toBe(true)
	})
})

describe('CnFolderSidebar — field source', () => {
	it('builds folders from distinct groupBy values with counts', () => {
		const objects = [
			{ id: 1, status: 'open' },
			{ id: 2, status: 'open' },
			{ id: 3, status: 'closed' },
			{ id: 4, status: null },
		]
		const wrapper = shallowMount(CnFolderSidebar, { propsData: { source: 'field', objects, groupBy: 'status' } })
		const tree = wrapper.vm.normalizedTree
		expect(tree).toHaveLength(2)
		expect(tree.find((f) => f.id === 'open').count).toBe(2)
		expect(tree.find((f) => f.id === 'closed').count).toBe(1)
	})
})

describe('CnFolderSidebar — files source', () => {
	it('loads the tree from the injected fetcher', async () => {
		const fetcher = jest.fn().mockResolvedValue([{ id: '/Vault/A', name: 'A', children: [] }])
		const wrapper = mount(CnFolderSidebar, {
			propsData: { source: 'files', filesPath: '/Vault', fetcher },
		})
		await flushPromises()
		expect(fetcher).toHaveBeenCalledWith({ path: '/Vault', depth: 1 })
		expect(wrapper.vm.normalizedTree).toEqual([{ id: '/Vault/A', name: 'A', children: [] }])
	})
})
