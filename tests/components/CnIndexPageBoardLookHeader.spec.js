/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The index header under the board look: the count line from `countText`, the
 * buttons in a fixed order (Download, Actions, other secondary, the buildiq
 * square, primary), `actions-menu` only when there are header actions, no
 * icon, and the saved views and bulk noun the toolbar needs.
 *
 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-index-header-reads-title-count-and-the-board-buttons
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnPageHeader from '../../src/components/CnPageHeader/CnPageHeader.vue'

const BarStub = {
	name: 'CnActionsBar',
	props: ['layout', 'showSearch', 'showCount', 'activeFilterChips', 'bulkNoun', 'bulkHint', 'showEditButton'],
	template: '<div class="bar" :data-layout="layout" :data-search="String(showSearch)" :data-count="String(showCount)" :data-noun="bulkNoun" :data-edit="String(showEditButton)"><slot name="actions-end" /></div>',
}

function mountPage(extra = {}, look = 'board') {
	return mount(CnIndexPage, {
		propsData: {
			title: 'All cases',
			schema: { title: 'Case', titlePlural: 'Cases', icon: 'Folder', properties: { team: { title: 'Team' } } },
			objects: [{ id: 1 }, { id: 2 }],
			pagination: { page: 1, pages: 3, total: 48, limit: 20 },
			showTitle: true,
			...extra,
		},
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: {
				CnActionsBar: BarStub,
				CnSavedViewsControl: { template: '<div class="views" />' },
				CnBuildiqEditButton: { template: '<i class="buildiq" data-testid="buildiq" />' },
				NcActions: { props: ['menuName'], template: '<div class="actions-menu" :data-name="menuName"><slot /></div>' },
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

const HEADER_ACTIONS = [{ id: 'import', label: 'Import cases' }, { id: 'assign', label: 'Assign' }]
const BUTTONS = [
	{ action: 'add', variant: 'primary', label: 'New case' },
	{ action: 'export' },
	{ action: 'actions-menu' },
]

describe('CnIndexPage board header', () => {
	it('reads the count line from countText with {shown} and {total}', () => {
		const w = mountPage({ countText: '{shown} of {total} open cases in your teams' })
		expect(w.findComponent(CnPageHeader).props('description')).toBe('2 of 48 open cases in your teams')
	})

	it('defaults the count line to "{shown} of {total}" and draws no icon', () => {
		const w = mountPage()
		expect(w.findComponent(CnPageHeader).props('description')).toBe('2 of 48')
		expect(w.findComponent(CnPageHeader).props('icon')).toBe('')
	})

	it('keeps the icon and the description without the look', () => {
		const w = mountPage({ description: 'Everything' }, 'nextcloud')
		expect(w.findComponent(CnPageHeader).props('icon')).toBe('Folder')
		expect(w.findComponent(CnPageHeader).props('description')).toBe('Everything')
	})

	it('orders the buttons Download, Actions, the buildiq square, then the primary one', () => {
		const w = mountPage({ headerButtons: BUTTONS, headerActions: HEADER_ACTIONS })
		const order = w.findAll('[data-testid="cn-index-header-buttons"] > *').map((el) => el.attributes('data-testid'))
		expect(order).toEqual([
			'cn-index-header-button-export',
			'cn-index-header-button-actions-menu',
			'buildiq',
			'cn-index-header-button-add',
		])
		const exportButton = w.find('[data-testid="cn-index-header-button-export"]')
		expect(exportButton.text()).toContain('Download')
	})

	it('lists the header actions in the Actions menu, labelled "Actions"', () => {
		const w = mountPage({ headerButtons: BUTTONS, headerActions: HEADER_ACTIONS })
		const menu = w.find('[data-testid="cn-index-header-button-actions-menu"]')
		expect(menu.attributes('data-name')).toBe('Actions')
	})

	it('renders no Actions button when the page has no header actions', () => {
		const w = mountPage({ headerButtons: BUTTONS })
		expect(w.find('[data-testid="cn-index-header-button-actions-menu"]').exists()).toBe(false)
	})

	it('puts the other secondary buttons between the Actions menu and the square', () => {
		const w = mountPage({ headerButtons: [...BUTTONS, { action: 'refresh', label: 'Refresh' }], headerActions: HEADER_ACTIONS })
		expect(w.vm.orderedHeaderButtons.map((b) => b.action)).toEqual(['export', 'actions-menu', 'refresh', '__buildiq', 'add'])
	})

	it('puts the square last when no button is primary', () => {
		const w = mountPage({ headerButtons: [{ action: 'export' }] })
		expect(w.vm.orderedHeaderButtons.map((b) => b.action)).toEqual(['export', '__buildiq'])
	})

	it('keeps the declared order and no square without the look', () => {
		const w = mountPage({ headerButtons: [{ action: 'add', variant: 'primary', label: 'New case' }, { action: 'export', label: 'Export' }] }, 'nextcloud')
		expect(w.vm.orderedHeaderButtons.map((b) => b.action)).toEqual(['add', 'export'])
		expect(w.find('[data-testid="buildiq"]').exists()).toBe(false)
	})

	it('draws the toolbar in the board layout, with the search always on and the count moved to the header', () => {
		const w = mountPage({ headerButtons: BUTTONS, headerActions: HEADER_ACTIONS })
		const bar = w.find('.bar')
		expect(bar.attributes('data-layout')).toBe('board')
		expect(bar.attributes('data-search')).toBe('true')
		expect(bar.attributes('data-count')).toBe('false')
		expect(bar.attributes('data-noun')).toBe('cases')
		expect(bar.attributes('data-edit')).toBe('false')
	})

	it('keeps the saved views in the toolbar when the header carries the buttons', () => {
		const w = mountPage({ headerButtons: BUTTONS, allowSavedViews: true })
		expect(w.find('.views').exists()).toBe(true)
		const plain = mountPage({ headerButtons: BUTTONS, allowSavedViews: true }, 'nextcloud')
		expect(plain.find('.views').exists()).toBe(false)
	})

	it('turns the active filters into chips named by the schema', () => {
		const w = mountPage({ activeFilters: { team: ['Woo'], status: [] } })
		expect(w.vm.activeFilterChips).toEqual([{ key: 'team', label: 'Team: Woo' }])
	})

	it('clears one filter when its chip is removed', () => {
		const w = mountPage({ activeFilters: { team: ['Woo'] } })
		const spy = jest.spyOn(w.vm, 'onFilterEvent').mockImplementation(() => {})
		w.vm.onRemoveActiveFilter({ key: 'team' })
		expect(spy).toHaveBeenCalledWith({ key: 'team', values: [] })
	})
})
