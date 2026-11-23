/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A case type's scope columns show a page column the page hides by default
 * (`hidden: true`): the Cases list hides Requester and Received, and the Woo
 * case type asks for them (board DqWooVerzoeken).
 */
const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { resolveScopeLayout } = require('../../src/utils/scopeListLayout.js')

const PAGE_COLUMNS = [
	{ key: 'title', label: 'Title' },
	{ key: 'status', label: 'Status' },
	{ key: 'requester', label: 'Requester', hidden: true },
	{ key: 'received', label: 'Received', hidden: true },
]

const SCOPES = [
	{ id: 'woo', name: 'Woo requests', columns: ['title', 'requester', 'received'] },
	{ id: 'complaint', name: 'Complaints' },
]

/**
 * @return {object} The wrapper.
 */
function mountPage() {
	return shallowMount(CnIndexPage, {
		propsData: {
			objects: [{ id: 'a', title: 'Alpha', caseType: 'woo' }],
			columns: PAGE_COLUMNS,
			schema: { title: 'Case', properties: {} },
			folderSidebar: { source: 'custom', filterField: 'caseType', folders: SCOPES },
		},
		stubs: { CnFolderSidebar: { name: 'CnFolderSidebar', template: '<div />', props: ['folders', 'source', 'selectedId'] } },
	})
}

const keysOf = (w) => w.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))

describe('scope columns and hidden page columns', () => {
	it('keeps a hidden column hidden on the page itself', () => {
		expect(keysOf(mountPage())).toEqual(['title', 'status'])
	})

	it('shows a hidden column the scope names', async () => {
		const w = mountPage()
		w.vm.onFolderSelect('woo')
		await w.vm.$nextTick()
		expect(keysOf(w)).toEqual(['title', 'requester', 'received'])
		expect(w.vm.tableColumns[1].label).toBe('Requester')
	})

	it('hides it again for a scope without columns', async () => {
		const w = mountPage()
		w.vm.onFolderSelect('complaint')
		await w.vm.$nextTick()
		expect(keysOf(w)).toEqual(['title', 'status'])
	})

	it('resolveScopeLayout returns the named page column without hidden', () => {
		const { columns } = resolveScopeLayout({ scope: SCOPES[0], pageColumns: PAGE_COLUMNS })
		expect(columns.find((c) => c.key === 'requester')).toEqual({ key: 'requester', label: 'Requester' })
		expect(PAGE_COLUMNS[2].hidden).toBe(true)
	})
})
