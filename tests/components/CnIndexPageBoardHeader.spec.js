/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaken's header: the title without an icon, no "Showing 20 of 258" line,
 * and "Export" and "New case" as buttons beside the title instead of the
 * Views and Actions menus. `showTitleIcon`, `showCount` and
 * `headerButtons` on CnIndexPage, `showCount` and `showActionsMenu` on
 * CnActionsBar. Without them the page renders as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnPageHeader from '../../src/components/CnPageHeader/CnPageHeader.vue'

const BarStub = {
	name: 'CnActionsBar',
	props: ['showAdd', 'showCount', 'showActionsMenu'],
	template: '<div class="bar" :data-add="String(showAdd)" :data-count="String(showCount)" :data-menu="String(showActionsMenu)"><slot name="actions-end" /></div>',
}

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'All cases', schema: { title: 'Case', icon: 'Folder', properties: {} }, objects: [], showTitle: true, allowSavedViews: true, ...extra },
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: {
				CnActionsBar: BarStub,
				CnSavedViewsControl: { template: '<div class="views" />' },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

describe('CnIndexPage: the board header', () => {
	it('keeps the icon, the count, the menus and the Add button without the keys', () => {
		const w = mountPage()
		expect(w.findComponent(CnPageHeader).props('icon')).toBe('Folder')
		expect(w.find('[data-testid="cn-index-header-buttons"]').exists()).toBe(false)
		const bar = w.find('.bar')
		expect(bar.attributes('data-add')).toBe('true')
		expect(bar.attributes('data-count')).toBe('true')
		expect(bar.attributes('data-menu')).toBe('true')
		expect(w.find('.views').exists()).toBe(true)
	})

	it('drops the title icon with showTitleIcon: false and the count line with showCount: false', () => {
		const w = mountPage({ showTitleIcon: false, showCount: false })
		expect(w.findComponent(CnPageHeader).props('icon')).toBe('')
		expect(w.find('.bar').attributes('data-count')).toBe('false')
	})

	it('draws the header buttons beside the title and takes the menus out of the bar', () => {
		const w = mountPage({ headerButtons: [{ label: 'Export', action: 'export' }, { action: 'add', variant: 'primary' }] })
		const buttons = w.find('[data-testid="cn-index-header-buttons"]')
		expect(buttons.exists()).toBe(true)
		expect(buttons.text()).toContain('Export')
		expect(w.vm.resolvedHeaderButtons.map((b) => [b.key, b.variant])).toEqual([['export', 'secondary'], ['add', 'primary']])
		const bar = w.find('.bar')
		expect(bar.attributes('data-menu')).toBe('false')
		expect(bar.attributes('data-add')).toBe('false')
		expect(w.find('.views').exists()).toBe(false)
	})

	it('keeps the bar Add button when no header button takes it', () => {
		const w = mountPage({ headerButtons: [{ label: 'Export', action: 'export' }] })
		expect(w.find('.bar').attributes('data-add')).toBe('true')
		expect(w.find('.bar').attributes('data-menu')).toBe('false')
	})

	it('ignores header buttons when the title is hidden, so nothing is lost', () => {
		const w = mountPage({ showTitle: false, headerButtons: [{ action: 'add' }] })
		expect(w.find('[data-testid="cn-index-header-buttons"]').exists()).toBe(false)
		expect(w.find('.bar').attributes('data-menu')).toBe('true')
		expect(w.find('.bar').attributes('data-add')).toBe('true')
	})

	it('runs the Add flow from an add button and dispatches any other id as a header action', () => {
		const w = mountPage({ headerButtons: [{ action: 'add' }, { label: 'Assign', action: 'assign' }] })
		const add = jest.spyOn(w.vm, 'onAddClick').mockImplementation(() => {})
		w.vm.onHeaderButton(w.vm.resolvedHeaderButtons[0])
		expect(add).toHaveBeenCalled()
		w.vm.onHeaderButton(w.vm.resolvedHeaderButtons[1])
		expect(w.emitted('header-action')[0][0]).toEqual({ action: 'assign', id: 'assign' })
	})
})

describe('CnActionsBar: showCount and showActionsMenu', () => {
	const mountBar = (extra) => mount(CnActionsBar, { propsData: { pagination: { total: 258, page: 1, limit: 20 }, objectCount: 20, ...extra } })

	it('shows the count line and the Actions menu by default', () => {
		const w = mountBar({})
		expect(w.find('.cn-actions-bar__count').exists()).toBe(true)
		expect(w.find('[data-testid="cn-actions"]').exists()).toBe(true)
	})

	it('drops them when told to', () => {
		const w = mountBar({ showCount: false, showActionsMenu: false })
		expect(w.find('.cn-actions-bar__count').exists()).toBe(false)
		expect(w.find('[data-testid="cn-actions"]').exists()).toBe(false)
	})
})
