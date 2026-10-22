/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A groups pane can read its tree from records (`folderSidebar.parentsFrom`):
 * each record names a Nextcloud group and the group above it, so DqAfdelingen
 * draws its departments as a tree while the manifest names no group.
 *
 * @spec openspec/changes/group-parents-from-records/specs/index-page/spec.md#requirement-a-groups-pane-can-read-its-tree-from-records
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateOcsUrl: (url, params = {}) => `/ocs/v2.php/${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
}))
const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ocs = (data) => ({ data: { ocs: { data } } })
const GROUPS = [
	{ id: 'admin', displayname: 'admin', usercount: 2 },
	{ id: 'gemeente', displayname: 'Gemeente Zuiddrecht', usercount: 412 },
	{ id: 'fysiek', displayname: 'Fysiek domein', usercount: 96 },
	{ id: 'vergunningen', displayname: 'Vergunningen', usercount: 18 },
]
const RECORDS = {
	results: [
		{ group: 'gemeente', parent: null },
		{ group: 'fysiek', parent: 'gemeente' },
		{ group: 'vergunningen', parent: 'fysiek' },
		{ group: 'gone', parent: 'fysiek' },
	],
}
const PARENTS_FROM = { register: 'dossiq', schema: 'department', groupField: 'group', parentField: 'parent' }

/**
 * @param {object} folderSidebar The pane config.
 * @return {object} The wrapper.
 */
function mountPage(folderSidebar) {
	return mount(CnIndexPage, {
		props: { title: 'Afdelingen', entitySource: 'users', folderSidebar },
		global: {
			mocks: { $router: { push: jest.fn(), replace: jest.fn(async () => {}) }, $route: { query: {}, params: {}, name: 'Afdelingen' } },
			stubs: { CnDataTable: true, CnActionsBar: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockFetchJson.mockReset()
	mockGet.mockImplementation(async (url) => (url.endsWith('cloud/groups/details') ? ocs({ groups: GROUPS }) : ocs({ users: {} })))
})

describe('CnIndexPage groups pane with parentsFrom', () => {
	it('reads the records of the named schema', async () => {
		mockFetchJson.mockResolvedValue(RECORDS)
		mountPage({ source: 'groups', filterField: 'group', parentsFrom: PARENTS_FROM })
		await flushPromises()
		expect(mockFetchJson).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/department', expect.objectContaining({ query: expect.objectContaining({ _limit: expect.any(Number) }) }))
	})

	it('lists the groups the records name, each under its parent', async () => {
		mockFetchJson.mockResolvedValue(RECORDS)
		const w = mountPage({ source: 'groups', filterField: 'group', parentsFrom: PARENTS_FROM })
		await flushPromises()
		const byId = Object.fromEntries(w.vm.folderGroupList.map((group) => [group.id, group.parentId]))
		expect(byId).toEqual({ gemeente: null, fysiek: 'gemeente', vergunningen: 'fysiek' })
		expect(w.findAll('.cn-folder-tree__children .cn-folder-tree__name').map((n) => n.text())).toEqual(['Fysiek domein', 'Vergunningen'])
	})

	it('falls back to every group, flat, when the records cannot be read', async () => {
		mockFetchJson.mockRejectedValue(new Error('403'))
		const w = mountPage({ source: 'groups', filterField: 'group', parentsFrom: PARENTS_FROM })
		await flushPromises()
		expect(w.vm.folderGroupList.map((group) => group.id)).toEqual(['admin', 'fysiek', 'gemeente', 'vergunningen'])
		expect(w.vm.folderGroupList.every((group) => !group.parentId)).toBe(true)
	})

	it('falls back to every group, flat, while no record names a group', async () => {
		mockFetchJson.mockResolvedValue({ results: [{ id: 'r-1', parent: null }] })
		const w = mountPage({ source: 'groups', filterField: 'group', parentsFrom: PARENTS_FROM })
		await flushPromises()
		expect(w.vm.folderGroupList).toHaveLength(4)
	})

	it('reads no records without parentsFrom', async () => {
		mountPage({ source: 'groups', filterField: 'group' })
		await flushPromises()
		expect(mockFetchJson).not.toHaveBeenCalled()
	})
	it('reads a parent that names another record by its id as that record\'s group', async () => {
		mockFetchJson.mockResolvedValue({
			results: [
				{ id: 'r-1', ncGroupId: 'gemeente' },
				{ id: 'r-2', ncGroupId: 'fysiek', parentRoleId: 'r-1' },
				{ '@self': { id: 'r-3' }, ncGroupId: 'vergunningen', parentRoleId: 'r-2' },
				{ id: 'r-4', parentRoleId: 'r-2' },
			],
		})
		const w = mountPage({ source: 'groups', filterField: 'group', parentsFrom: { register: 'dossiq', schema: 'organisatieRol', groupField: 'ncGroupId', parentField: 'parentRoleId' } })
		await flushPromises()
		const byId = Object.fromEntries(w.vm.folderGroupList.map((group) => [group.id, group.parentId]))
		expect(byId).toEqual({ gemeente: null, fysiek: 'gemeente', vergunningen: 'fysiek' })
	})
})
