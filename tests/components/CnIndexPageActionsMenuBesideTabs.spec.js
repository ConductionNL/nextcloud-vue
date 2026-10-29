import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header's Actions menu can stand at the end of the page tabs
 * (`headerButtons[]` entry `{ action: "actions-menu", placement: "tabs" }`),
 * as PqBiExport and PqFlows draw "Acties" beside their tab strip. Without page
 * tabs it stays in the header.
 *
 * @spec openspec/changes/index-actions-menu-beside-tabs/specs/index-header/spec.md#requirement-the-header-actions-menu-can-stand-beside-the-page-tabs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const TABS = [
	{ label: 'Taken', route: 'ExportJobs' },
	{ label: 'Bestemmingen', route: 'ExportDestinations' },
]
const ADD = { action: 'add', variant: 'primary', label: 'New export job' }

function mountPage(props = {}) {
	return mount(CnIndexPage, {
		props: {
			title: 'BI export',
			schema: { title: 'Job', properties: { title: { title: 'Title' } } },
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			showTitle: true,
			selectable: true,
			...props,
		},
		global: {
			provide: { cnLook: 'board', cnTranslate: (key) => key },
			mocks: {
				$router: { push: jest.fn(() => Promise.resolve()), resolve: (to) => ({ href: `/apps/pipelinq/${to.name}` }) },
				$route: { query: {}, params: {}, name: 'ExportJobs', path: '/export' },
			},
			stubs: {
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcActions: { props: ['menuName'], template: '<div class="actions-menu" :data-name="menuName"><slot /></div>' },
				NcActionButton: { props: ['disabled'], emits: ['click'], template: '<button class="entry" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
				NcActionLink: { props: ['href'], template: '<a class="entry" :href="href"><slot /></a>' },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
				CnIcon: true,
			},
		},
	})
}

const MENU = '[data-testid="cn-index-header-button-actions-menu"]'

describe('CnIndexPage: the Actions menu beside the page tabs', () => {
	it('draws the menu at the end of the tab row, not in the header', () => {
		const w = mountPage({ pageTabs: TABS, headerButtons: [ADD, { action: 'actions-menu', placement: 'tabs', items: ['refresh'] }] })
		const row = w.find('[data-testid="cn-index-page-tabs-row"]')
		expect(row.exists()).toBe(true)
		expect(row.find('[data-testid="cn-index-page-tabs"]').exists()).toBe(true)
		expect(row.find(MENU).exists()).toBe(true)
		expect(row.find(MENU).attributes('data-name')).toBe('Actions')
		expect(w.find('[data-testid="cn-index-header-buttons"]').find(MENU).exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-header-button-add"]').exists()).toBe(true)
	})

	it('runs its entries from beside the tabs', async () => {
		const w = mountPage({ pageTabs: TABS, headerButtons: [ADD, { action: 'actions-menu', placement: 'tabs', items: ['refresh'] }] })
		await w.find('[data-testid="cn-index-header-menu-refresh"]').trigger('click')
		expect(w.emitted('refresh')).toBeTruthy()
	})

	it('stays in the header when the page has no tabs', () => {
		const w = mountPage({ headerButtons: [ADD, { action: 'actions-menu', placement: 'tabs', items: ['refresh'] }] })
		expect(w.find('[data-testid="cn-index-header-buttons"]').find(MENU).exists()).toBe(true)
	})

	it('keeps a menu without a placement in the header, beside tabs or not', () => {
		const w = mountPage({ pageTabs: TABS, headerButtons: [ADD, { action: 'actions-menu', items: ['refresh'] }] })
		expect(w.find('[data-testid="cn-index-header-buttons"]').find(MENU).exists()).toBe(true)
		expect(w.find('[data-testid="cn-index-page-tabs-row"]').find(MENU).exists()).toBe(false)
	})

	it('is not drawn beside the tabs when it has nothing to list', () => {
		const w = mountPage({ pageTabs: TABS, headerButtons: [ADD, { action: 'actions-menu', placement: 'tabs' }] })
		expect(w.find(MENU).exists()).toBe(false)
	})

	it('is the board\'s 34px tab-row button under the board look', () => {
		const css = readFileSync(resolve(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		const rule = css.match(/\.cn-look-board \.cn-index-page__page-tabs-menu:not\(\.cn-look-nextcloud \*\) \.button-vue \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toMatch(/height: 34px !important;/)
		expect(rule[1]).toMatch(/padding: 0 12px !important;/)
	})
})
