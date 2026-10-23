/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Nextcloud groups and their members as an index page (index-groups-users-source,
 * DqAfdelingen): the groups as the folder tree with member counts, the members
 * as rows with function, roles, e-mail and whether they are in today.
 *
 * @spec openspec/changes/index-groups-users-source/specs/index-page/spec.md#requirement-an-index-page-can-list-nextcloud-groups-and-their-members
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateOcsUrl: (url, params = {}) => `/ocs/v2.php/${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
}))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveIndexSource } from '../../src/composables/indexSources.js'

const ocs = (data) => ({ data: { ocs: { data } } })

let mockAllUsersRefused = false

beforeEach(() => {
	mockAllUsersRefused = false
	mockGet.mockReset()
	mockGet.mockImplementation(async (url) => {
		if (url.endsWith('cloud/groups/details')) {
			return ocs({ groups: [{ id: 'vergunningen', displayname: 'Vergunningen', usercount: 18 }, { id: 'fysiek', displayname: 'Fysiek domein', usercount: 96 }, { id: 'admin', displayname: 'admin', usercount: 2 }] })
		}
		if (url.endsWith('cloud/groups/vergunningen/users/details')) {
			return ocs({ users: {
				lars: { id: 'lars', displayname: 'Lars de Koning', email: 'l.dekoning@zuiddrecht.nl', headline: 'Teamleider', role: 'Vergunningverlener, teamleider' },
				sanne: { id: 'sanne', displayname: 'Sanne Bakker', email: 's.bakker@zuiddrecht.nl', headline: 'Vergunningverlener', role: 'Vergunningverlener' },
				jamal: { id: 'jamal', displayname: 'Jamal Ouali', email: 'j.ouali@zuiddrecht.nl', headline: 'Toezichthouder', role: 'Toezichthouder' },
			} })
		}
		if (url.endsWith('cloud/users/details')) {
			if (mockAllUsersRefused) {
				throw Object.assign(new Error('403'), { response: { status: 403 } })
			}
			return ocs({ users: {
				lars: { id: 'lars', displayname: 'Lars de Koning' },
				sanne: { id: 'sanne', displayname: 'Sanne Bakker' },
				jamal: { id: 'jamal', displayname: 'Jamal Ouali' },
				mehmet: { id: 'mehmet', displayname: 'Mehmet Yildiz' },
			} })
		}
		if (url.endsWith('apps/user_status/api/v1/statuses')) {
			return ocs([{ userId: 'lars', status: 'online' }, { userId: 'jamal', status: 'away', message: 'Buiten' }])
		}
		if (url.endsWith('outOfOffice/sanne/now')) {
			return ocs({ endDate: '2026-10-14', shortMessage: 'Vakantie' })
		}
		if (url.includes('outOfOffice')) {
			throw Object.assign(new Error('404'), { response: { status: 404 } })
		}
		throw new Error('unexpected ' + url)
	})
})

describe('users index source', () => {
	it('lists a group\'s members with function, roles, e-mail and today', async () => {
		const source = resolveIndexSource('users')
		await source.load({ group: 'vergunningen' })
		expect(source.rows().map((row) => [row.displayname, row.function, row.roles, row.today])).toEqual([
			['Jamal Ouali', 'Toezichthouder', 'Toezichthouder', 'Buiten'],
			['Lars de Koning', 'Teamleider', 'Vergunningverlener, teamleider', 'Present'],
			['Sanne Bakker', 'Vergunningverlener', 'Vergunningverlener', expect.stringMatching(/^Absent until .*14/)],
		])
		expect(source.searchFields.group).toEqual({ param: 'group', single: true })
	})

	it('lists every user the reader may see on All, before a group is picked', async () => {
		const source = resolveIndexSource('users')
		await source.load({})
		expect(mockGet.mock.calls.some(([url]) => url.endsWith('cloud/users/details'))).toBe(true)
		expect(source.rows().map((row) => row.displayname)).toEqual(['Jamal Ouali', 'Lars de Koning', 'Mehmet Yildiz', 'Sanne Bakker'])
	})

	it('lists nothing on All when the reader may not list users', async () => {
		mockAllUsersRefused = true
		const source = resolveIndexSource('users')
		await expect(source.load({})).rejects.toThrow('403')
		expect(source.rows()).toEqual([])
		expect(source.loading()).toBe(false)
	})
})

describe('CnIndexPage folderSidebar source groups', () => {
	function mountPage(folderSidebar) {
		return shallowMount(CnIndexPage, {
			props: { title: 'Afdelingen', entitySource: 'users', folderSidebar },
			global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Afdelingen' } } },
		})
	}

	it('lists the groups with member counts, by name', async () => {
		const w = mountPage({ source: 'groups', filterField: 'group' })
		await flushPromises()
		expect(w.vm.folderSidebarSource).toBe('custom')
		expect(w.vm.folderSidebarFolders.map((f) => [f.name, f.count])).toEqual([['admin', 2], ['Fysiek domein', 96], ['Vergunningen', 18]])
	})

	it('picks, orders and nests the groups the config names', async () => {
		const w = mountPage({ source: 'groups', filterField: 'group', groups: [{ id: 'fysiek' }, { id: 'vergunningen', parent: 'fysiek' }] })
		await flushPromises()
		expect(w.vm.folderSidebarFolders).toEqual([
			{ id: 'fysiek', name: 'Fysiek domein', count: 96, parentId: null, record: null },
			{ id: 'vergunningen', name: 'Vergunningen', count: 18, parentId: 'fysiek', record: null },
		])
	})
})
