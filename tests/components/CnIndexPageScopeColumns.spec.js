/**
 * Tests for the per-scope list layout on CnIndexPage (index-columns-per-scope).
 *
 * The page's `columns` prop decides which columns this page has. The selected
 * folder decides which of them it shows, in what order, sorted by what and
 * searched over what. Neither the folder entry nor a schema row can name a
 * column the page does not declare.
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const objects = [
	{ id: 'a', title: 'Alpha', caseType: 'permit' },
	{ id: 'b', title: 'Beta', caseType: 'complaint' },
]

const PAGE_COLUMNS = [
	{ key: 'title', label: 'Title' },
	{ key: 'status', label: 'Status' },
	{ key: 'identifier', label: 'Number' },
	{ key: 'requester', label: 'Requester' },
	{ key: 'deadline', label: 'Deadline' },
]

const SCOPES = [
	{
		id: 'permit',
		name: 'Permits',
		columns: ['identifier', 'requester', 'deadline'],
		defaultSort: { key: 'deadline', order: 'desc' },
		searchFields: ['identifier', 'requester'],
	},
	{ id: 'complaint', name: 'Complaints' },
]

function mountPage({ columns = PAGE_COLUMNS, folders = SCOPES } = {}) {
	return shallowMount(CnIndexPage, {
		propsData: {
			objects,
			columns,
			schema: { title: 'Case', properties: {} },
			folderSidebar: { source: 'custom', filterField: 'caseType', folders },
		},
		stubs: { CnFolderSidebar: { name: 'CnFolderSidebar', template: '<div class="cn-folder-sidebar-stub" />', props: ['folders', 'source', 'selectedId'] } },
	})
}

function keysOf(wrapper) {
	return wrapper.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))
}

describe('CnIndexPage — a column set per scope', () => {
	it('shows the page columns while no folder is selected', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.activeScope).toBeNull()
		expect(keysOf(wrapper)).toEqual(['title', 'status', 'identifier', 'requester', 'deadline'])
	})

	it('shows the scope columns once its folder is selected', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['identifier', 'requester', 'deadline'])
	})

	it('keeps the page label of a column the scope merely names', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.tableColumns[0].label).toBe('Number')
	})

	it('a scope declaring no columns inherits the page columns', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('complaint')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['title', 'status', 'identifier', 'requester', 'deadline'])
	})

	it('goes back to the page columns when "All" is selected again', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		wrapper.vm.onFolderSelect(null)
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['title', 'status', 'identifier', 'requester', 'deadline'])
	})

	it('offers the scope sort as fetch sort keys, not as a second sort path', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeScopeLayout.sortKeys).toEqual([{ key: 'deadline', order: 'desc' }])
	})

	it('carries the scope search fields', async () => {
		const wrapper = mountPage()
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeScopeSearchFields).toEqual(['identifier', 'requester'])
		wrapper.vm.onFolderSelect('complaint')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeScopeSearchFields).toEqual([])
	})

	it('drops a scope column the page does not declare', async () => {
		// The folder entry was written while the page still had a "location"
		// column. Taking the column out of the page takes it out everywhere.
		const wrapper = mountPage({
			folders: [{ id: 'permit', columns: ['identifier', 'location'] }],
		})
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['identifier'])
	})

	it('renders no folder pane and no scope when folderSidebar is absent', () => {
		const wrapper = shallowMount(CnIndexPage, {
			propsData: { objects, columns: PAGE_COLUMNS, schema: { title: 'Case', properties: {} } },
		})
		expect(wrapper.vm.activeScopeLayout).toEqual({ columns: null, sortKeys: [], searchFields: [] })
		expect(keysOf(wrapper)).toEqual(['title', 'status', 'identifier', 'requester', 'deadline'])
	})
})

describe('CnIndexPage — a scope layout carried by its own row', () => {
	async function mountRegisterPage(folders, rowLayouts) {
		const wrapper = shallowMount(CnIndexPage, {
			propsData: {
				objects,
				columns: PAGE_COLUMNS,
				schema: { title: 'Case', properties: {} },
				folderSidebar: { source: 'register', register: 'procest', schema: 'caseType', filterField: 'caseType' },
			},
			stubs: { CnFolderSidebar: { name: 'CnFolderSidebar', template: '<div class="cn-folder-sidebar-stub" />', props: ['folders', 'source', 'selectedId'] } },
		})
		// Let the component's own register fetch settle first, so the folder
		// list under test is not overwritten by the stubbed response.
		await new Promise((resolve) => setTimeout(resolve, 0))
		wrapper.vm.folderRegisterList = folders
		wrapper.vm.folderRowLayouts = rowLayouts
		return wrapper
	}

	it('uses the row layout when the folder entry declares none', async () => {
		const wrapper = await mountRegisterPage(
			[{ id: 'permit', name: 'Permits' }],
			{ permit: { columns: ['identifier', 'deadline'] } },
		)
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['identifier', 'deadline'])
	})

	it('lets the declared folder entry win over the row', async () => {
		const wrapper = await mountRegisterPage(
			[{ id: 'permit', name: 'Permits', columns: ['identifier'] }],
			{ permit: { columns: ['identifier', 'deadline'] } },
		)
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['identifier'])
	})

	it('a row cannot bring back a column the page declaration removed', async () => {
		// This is the whole precedence rule in one assertion. The case type
		// record still carries "location" in its x-index block; the page no
		// longer declares that column, so it stays gone.
		const wrapper = await mountRegisterPage(
			[{ id: 'permit', name: 'Permits' }],
			{ permit: { columns: ['location', 'identifier'] } },
		)
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(keysOf(wrapper)).toEqual(['identifier'])
	})

	it('reads the row sort and search fields too', async () => {
		const wrapper = await mountRegisterPage(
			[{ id: 'permit', name: 'Permits' }],
			{ permit: { defaultSort: { field: 'deadline' }, searchFields: ['identifier'] } },
		)
		wrapper.vm.onFolderSelect('permit')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.activeScopeLayout.sortKeys).toEqual([{ key: 'deadline', order: 'asc' }])
		expect(wrapper.vm.activeScopeSearchFields).toEqual(['identifier'])
	})
})
