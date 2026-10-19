/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `folderSidebar.scopeViews` limits a scope's presentation (its columns and
 * its look: title, count line, quick filters...) to the view modes it names,
 * so the werkbord keeps the generic look while the table takes the case
 * type's. The scope still narrows the list in every view.
 */
const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const PAGE_COLUMNS = [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'requester', label: 'Requester' }]
const SCOPES = [{ id: 'woo', name: 'Woo', title: 'Woo requests', columns: ['title', 'requester'] }]

/**
 * @param {object} extra Extra folderSidebar keys.
 * @param {string} viewMode The view mode.
 * @return {object} The wrapper.
 */
function mountPage(extra = {}, viewMode = 'table') {
	return shallowMount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			objects: [{ id: 'a', title: 'Alpha', caseType: 'woo' }],
			columns: PAGE_COLUMNS,
			viewMode,
			availableViewModes: ['table', 'cards', 'board'],
			schema: { title: 'Case', properties: {} },
			folderSidebar: { source: 'custom', filterField: 'caseType', folders: SCOPES, ...extra },
		},
		stubs: { CnFolderSidebar: { name: 'CnFolderSidebar', template: '<div />', props: ['folders', 'source', 'selectedId'] } },
	})
}

const keysOf = (w) => w.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))

describe('folderSidebar.scopeViews', () => {
	it('applies the scope look in a view it names', async () => {
		const w = mountPage({ scopeViews: ['table', 'list'] })
		w.vm.onFolderSelect('woo')
		await w.vm.$nextTick()
		expect(keysOf(w)).toEqual(['title', 'requester'])
		expect(w.vm.presented('title')).toBe('Woo requests')
	})

	it('keeps the generic look in a view it does not name', async () => {
		const w = mountPage({ scopeViews: ['table', 'list'] }, 'board')
		w.vm.onFolderSelect('woo')
		await w.vm.$nextTick()
		expect(keysOf(w)).toEqual(['title', 'status', 'requester'])
		expect(w.vm.presented('title')).toBe('Cases')
		expect(w.vm.selectedFolderId).toBe('woo')
	})

	it('applies the scope look in every view without scopeViews', async () => {
		const w = mountPage({}, 'board')
		w.vm.onFolderSelect('woo')
		await w.vm.$nextTick()
		expect(w.vm.presented('title')).toBe('Woo requests')
	})
})
