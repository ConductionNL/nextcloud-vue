/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `searchPlacement: "toolbar"` (DqTeamwachtrij): under the board look the
 * search field sits on row 1, before the Filter button and the view switch,
 * instead of opening row 2. CnIndexPage passes `config.searchPlacement` on.
 *
 * @spec openspec/changes/index-search-on-toolbar/specs/index-page/spec.md#requirement-the-search-field-can-sit-on-the-toolbar-row
 */
import { mount } from '@vue/test-utils'
const fs = require('fs')
const path = require('path')
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

/**
 * Mount a board actions bar.
 *
 * @param {object} props Props.
 * @return {import('@vue/test-utils').VueWrapper} The bar.
 */
function mountBar(props) {
	return mount(CnActionsBar, {
		props: { layout: 'board', showSearch: true, showSidebarToggle: true, searchValue: 'woo', ...props },
		global: { stubs: { NcActions: true, NcActionButton: true } },
	})
}

describe('CnActionsBar searchPlacement', () => {
	it('draws the search on row 1, before the Filter button, with "toolbar"', async () => {
		const w = mountBar({ searchPlacement: 'toolbar' })
		const row1 = w.find('[data-testid="cn-actions-bar-row-views"]')
		const search = row1.find('[data-testid="cn-actions-bar-search-toolbar"]')
		expect(search.exists()).toBe(true)
		expect(search.find('input').element.value).toBe('woo')
		const children = [...row1.element.children]
		const filter = row1.find('[data-testid="cn-actions-bar-view-controls"]').element
		expect(children.indexOf(search.element)).toBeLessThan(children.indexOf(filter))
		expect(w.find('[data-testid="cn-actions-bar-row-search"] .cn-actions-bar__search').exists()).toBe(false)
		await search.find('input').setValue('bezwaar')
		expect(w.emitted('search')).toBeTruthy()
	})

	it('keeps the search on row 2 by default', () => {
		const w = mountBar({})
		expect(w.find('[data-testid="cn-actions-bar-search-toolbar"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-actions-bar-row-search"] .cn-actions-bar__search').exists()).toBe(true)
	})

	it('changes nothing outside the board look', () => {
		const w = mountBar({ layout: 'nextcloud', searchPlacement: 'toolbar' })
		expect(w.find('[data-testid="cn-actions-bar-search-toolbar"]').exists()).toBe(false)
		expect(w.find('.cn-actions-bar__search').exists()).toBe(true)
	})
})

describe('CnIndexPage searchPlacement', () => {
	it('passes config.searchPlacement to the actions bar', () => {
		const w = mount(CnIndexPage, {
			props: { title: 'Queue', objects: [], columns: [{ key: 'title', label: 'Title' }], searchPlacement: 'toolbar' },
			global: {
				mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Queue' } },
				stubs: { CnActionsBar: { name: 'CnActionsBar', props: ['searchPlacement'], template: '<div />' }, CnDataTable: true, CnCardGrid: true, CnPagination: true, CnIndexSidebar: true },
			},
		})
		expect(w.findComponent({ name: 'CnActionsBar' }).props('searchPlacement')).toBe('toolbar')
	})
})

describe('look-board-index.css: the toolbar search', () => {
	it('lets the search take the room on row 1, scoped to the board look', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		expect(css).toMatch(/\.cn-look-board \.cn-actions-bar--board > \.cn-actions-bar__row--views > \.cn-actions-bar__search--toolbar \{[^}]*flex: 1 1 220px/)
	})
})
