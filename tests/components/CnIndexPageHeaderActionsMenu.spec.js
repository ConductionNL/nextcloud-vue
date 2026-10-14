/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header's Actions menu (`headerButtons[]` with `action: "actions-menu"`)
 * lists what its `items` name: header actions, the built-ins the actions bar
 * drops while header buttons show, and links. Without `items` it lists the
 * header actions only, as before.
 *
 * @spec openspec/changes/screens-index-header-actions-menu/specs/index-header/spec.md#requirement-the-header-actions-menu-lists-what-its-items-name
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Meetings',
			schema: { title: 'Meeting', titlePlural: 'Meetings', properties: { title: { title: 'Title' } } },
			objects: [{ id: 1 }, { id: 2 }],
			pagination: { page: 1, pages: 1, total: 2, limit: 20 },
			showTitle: true,
			selectable: true,
			...extra,
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Meetings' } },
			stubs: {
				CnActionsBar: { name: 'CnActionsBar', props: ['showActionsMenu'], template: '<div class="bar" :data-menu="String(showActionsMenu)" />' },
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcActions: { props: ['menuName'], template: '<div class="actions-menu" :data-name="menuName"><slot /></div>' },
				NcActionButton: { props: ['disabled'], emits: ['click'], template: '<button class="entry" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
				NcActionLink: { props: ['href', 'target'], template: '<a class="entry" :href="href" :target="target"><slot /></a>' },
				CnMassImportDialog: { template: '<div class="import-dialog" />' },
				CnMassCopyDialog: { template: '<div class="copy-dialog" />' },
				CnMassDeleteDialog: { template: '<div class="delete-dialog" />' },
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

const ADD = { action: 'add', variant: 'primary', label: 'New meeting' }
const entries = (w) => w.findAll('[data-testid^="cn-index-header-menu-"]')
const keys = (w) => entries(w).map((el) => el.attributes('data-testid').replace('cn-index-header-menu-', ''))

describe('CnIndexPage: the header Actions menu', () => {
	it('lists only the header actions without items, and is absent when there are none', () => {
		const withActions = mountPage({ headerButtons: [ADD, { action: 'actions-menu' }], headerActions: [{ id: 'goto', label: 'Go to' }], documentationUrl: 'https://docs.example/' })
		expect(keys(withActions)).toEqual(['goto'])
		const none = mountPage({ headerButtons: [ADD, { action: 'actions-menu' }], documentationUrl: 'https://docs.example/' })
		expect(none.find('[data-testid="cn-index-header-button-actions-menu"]').exists()).toBe(false)
	})

	it('lists the named built-ins and header actions in the order of items', () => {
		const w = mountPage({
			headerButtons: [ADD, { action: 'actions-menu', items: ['header-actions', 'import', 'copy-selected', 'delete-selected', 'refresh', 'documentation', 'nonsense'] }],
			headerActions: [{ id: 'goto', label: 'Go to' }],
			documentationUrl: 'https://docs.example/',
		})
		expect(keys(w)).toEqual(['goto', 'import', 'copy-selected', 'delete-selected', 'refresh', 'documentation'])
		const docs = w.find('[data-testid="cn-index-header-menu-documentation"]')
		expect(docs.element.tagName).toBe('A')
		expect(docs.attributes('href')).toBe('https://docs.example/')
		expect(docs.attributes('target')).toBe('_blank')
	})

	it('shows a menu of built-ins alone, and leaves the documentation out without a url', () => {
		const w = mountPage({ headerButtons: [ADD, { action: 'actions-menu', items: ['refresh', 'documentation'] }] })
		expect(keys(w)).toEqual(['refresh'])
	})

	it('runs the built-ins: refresh emits, import opens its dialog, the selection entries wait for a selection', async () => {
		const w = mountPage({ headerButtons: [ADD, { action: 'actions-menu', items: ['refresh', 'import', 'copy-selected', 'delete-selected'] }] })
		await w.find('[data-testid="cn-index-header-menu-refresh"]').trigger('click')
		expect(w.emitted('refresh')).toBeTruthy()
		expect(w.find('[data-testid="cn-index-header-menu-copy-selected"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-index-header-menu-delete-selected"]').attributes('disabled')).toBeDefined()
		await w.find('[data-testid="cn-index-header-menu-import"]').trigger('click')
		expect(w.vm.showImportDialog).toBe(true)
		await w.setProps({ selectedIds: [1] })
		const copy = w.find('[data-testid="cn-index-header-menu-copy-selected"]')
		expect(copy.attributes('disabled')).toBeUndefined()
		await copy.trigger('click')
		expect(w.vm.showMassCopyDialog).toBe(true)
	})

	it('draws a header action of type navigate with a target as a link', () => {
		const w = mountPage({
			headerButtons: [ADD, { action: 'actions-menu', items: ['manual'] }],
			headerActions: [{ id: 'manual', label: 'Manual', type: 'navigate', target: 'https://manual.example/meetings' }, { id: 'goto', label: 'Go to' }],
		})
		expect(keys(w)).toEqual(['manual'])
		const link = w.find('[data-testid="cn-index-header-menu-manual"]')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('https://manual.example/meetings')
	})

	it('ships the icons of its own built-ins, so an app that registered none draws no "?"', () => {
		const w = mountPage({ headerButtons: [ADD, { action: 'actions-menu', items: ['import', 'export', 'delete-selected'] }] })
		expect(w.find('[data-testid="cn-index-header-menu-import"] .import-icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-index-header-menu-export"] .export-icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-index-header-menu-delete-selected"] .trash-can-outline-icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-index-header-menu-import"] cn-icon-stub').exists()).toBe(false)
	})
})
