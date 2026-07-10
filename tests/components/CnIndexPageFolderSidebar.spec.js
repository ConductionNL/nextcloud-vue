/**
 * Tests for CnIndexPage's opt-in folder sidebar wiring (`folderSidebar` config):
 * renders a folder pane, resolves the source/folders, and filters the list by
 * `filterField` on select.
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const objects = [
	{ id: 'a', title: 'Alpha', caseType: 'ct-1' },
	{ id: 'b', title: 'Beta', caseType: 'ct-2' },
]

function mountPage(folderSidebar) {
	return shallowMount(CnIndexPage, {
		propsData: {
			objects,
			schema: { title: 'Case', properties: {} },
			folderSidebar,
		},
		stubs: { CnFolderSidebar: { name: 'CnFolderSidebar', template: '<div class="cn-folder-sidebar-stub" />', props: ['folders', 'source', 'selectedId'] } },
	})
}

describe('CnIndexPage — folder sidebar', () => {
	it('renders no folder pane by default', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { objects, schema: { title: 'Case', properties: {} } } })
		expect(wrapper.find('.cn-index-page__folder-pane').exists()).toBe(false)
	})

	it('renders a folder pane when folderSidebar is configured', () => {
		const wrapper = mountPage({ source: 'field', field: 'caseType' })
		expect(wrapper.find('.cn-index-page__folder-pane').exists()).toBe(true)
	})

	it('maps a register source to a custom CnFolderSidebar source', () => {
		const wrapper = mountPage({ source: 'register', register: 'procest', schema: 'caseType', filterField: 'caseType' })
		expect(wrapper.vm.folderSidebarSource).toBe('custom')
	})

	it('uses explicit folders for a custom source', () => {
		const folders = [{ id: 'ct-1', name: 'Bezwaar' }]
		const wrapper = mountPage({ source: 'custom', folders, filterField: 'caseType' })
		expect(wrapper.vm.folderSidebarFolders).toEqual(folders)
	})

	it('filters the list by filterField and emits folder-change on select', () => {
		const wrapper = mountPage({ source: 'register', register: 'procest', schema: 'caseType', filterField: 'caseType' })
		wrapper.vm.onFolderSelect('ct-2')
		expect(wrapper.vm.selectedFolderId).toBe('ct-2')
		expect(wrapper.emitted('folder-change')[0]).toEqual(['ct-2'])
		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'caseType', values: ['ct-2'] })
	})

	it('clears the filter when "All" (null) is selected', () => {
		const wrapper = mountPage({ source: 'field', field: 'caseType', filterField: 'caseType' })
		wrapper.vm.onFolderSelect(null)
		expect(wrapper.emitted('filter-change')[0][0]).toEqual({ key: 'caseType', values: [] })
	})
})
