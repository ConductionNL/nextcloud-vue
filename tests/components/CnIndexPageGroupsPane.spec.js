/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The groups pane on board DqAfdelingen: the pane title through the app's
 * translate, the pane as a card with count pills (board look), and the
 * selected group's name as a heading above the table, with its parent and
 * member count under it.
 */
import { flushPromises, mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (url) => `/index.php${url}`,
	generateOcsUrl: (url, params = {}) => `/ocs/v2.php/${url.replace(/\{(\w+)\}/g, (m, k) => params[k])}`,
}))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ocs = (data) => ({ data: { ocs: { data } } })
const DUTCH = { Organisation: 'Organisatie' }

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockImplementation(async (url) => {
		if (url.endsWith('cloud/groups/details')) {
			return ocs({ groups: [{ id: 'fysiek', displayname: 'Fysiek domein', usercount: 96 }, { id: 'vergunningen', displayname: 'Vergunningen', usercount: 18 }] })
		}
		return ocs({ users: {} })
	})
})

/**
 * @param {object} [query] The route query.
 * @return {object} The wrapper.
 */
function mountPage(query = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'Afdelingen',
			entitySource: 'users',
			folderSidebar: { source: 'groups', filterField: 'group', title: 'Organisation', groups: [{ id: 'fysiek' }, { id: 'vergunningen', parent: 'fysiek' }] },
		},
		global: {
			provide: { cnTranslate: (s) => DUTCH[s] || s },
			mocks: { $router: { push: jest.fn(), replace: jest.fn(async () => {}) }, $route: { query, params: {}, name: 'Afdelingen' } },
			stubs: { CnDataTable: true, CnActionsBar: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
		},
	})
}

describe('CnIndexPage groups pane', () => {
	it('translates the pane title', async () => {
		const w = mountPage()
		await flushPromises()
		expect(w.find('.cn-folder-sidebar__title').text()).toBe('Organisatie')
	})

	it('heads the list with the selected group, its parent and its member count', async () => {
		const w = mountPage()
		await flushPromises()
		expect(w.find('[data-testid="cn-index-page-scope-heading"]').exists()).toBe(false)

		w.vm.onFolderSelect('vergunningen')
		await flushPromises()
		const heading = w.find('[data-testid="cn-index-page-scope-heading"]')
		expect(heading.find('h2').text()).toBe('Vergunningen')
		expect(heading.find('[data-testid="cn-index-page-scope-subtitle"]').text()).toBe('Fysiek domein · 18 members')
	})

	it('draws the board pane as a card with count pills', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		expect(css).toMatch(/\.cn-look-board \.cn-index-page__folder-pane\s*\{[^}]*border-radius:/)
		expect(css).toMatch(/\.cn-look-board \.cn-index-page__folder-pane \.cn-folder-tree__count\s*\{[^}]*border-radius:/)
	})
})
