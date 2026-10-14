/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header's Actions menu groups its entries: `{ heading }` in `items` draws
 * a group heading and `separator` a rule, as board DcVergaderingen draws "Ga
 * naar" and "Selectie". A mark is drawn only when an entry follows it.
 *
 * @spec openspec/changes/screens-index-header-menu-headings/specs/index-header/spec.md#requirement-the-header-actions-menu-can-draw-group-headings-and-separators
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
				NcActionCaption: { props: ['name'], template: '<li class="caption">{{ name }}</li>' },
				NcActionSeparator: { template: '<li class="separator" />' },
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

describe('CnIndexPage: headings and separators in the header Actions menu', () => {
	const headerActions = [
		{ id: 'calendar', label: 'Calendar' },
		{ id: 'agenda', label: 'Agenda' },
	]

	it('draws the board groups in the order items names them', () => {
		const w = mountPage({
			headerActions,
			documentationUrl: 'https://docs.example/',
			headerButtons: [ADD, { action: 'actions-menu', items: [{ heading: 'Go to' }, 'calendar', 'agenda', 'separator', 'import', 'separator', { heading: 'Selection' }, 'copy-selected', 'delete-selected', 'separator', 'refresh', 'documentation'] }],
		})
		expect(keys(w)).toEqual(['__heading-1', 'calendar', 'agenda', '__separator-2', 'import', '__separator-3', '__heading-4', 'copy-selected', 'delete-selected', '__separator-5', 'refresh', 'documentation'])
		const captions = w.findAll('.caption').map((el) => el.text())
		expect(captions).toEqual(['Go to', 'Selection'])
		expect(w.findAll('.separator')).toHaveLength(3)
	})

	it('drops a mark with no entry after it, a leading separator and a doubled one', () => {
		const w = mountPage({
			headerActions,
			headerButtons: [ADD, { action: 'actions-menu', items: ['separator', { heading: 'Go to' }, 'unknown', 'separator', 'separator', 'calendar', 'separator', { heading: 'Help' }, 'documentation'] }],
		})
		// No documentation URL: the Help group is empty, so its heading and rule go too.
		expect(keys(w)).toEqual(['calendar'])
	})

	it('does not draw a menu whose items are marks only', () => {
		const w = mountPage({ headerButtons: [ADD, { action: 'actions-menu', items: [{ heading: 'Go to' }, 'separator'] }] })
		expect(w.find('[data-testid="cn-index-header-button-actions-menu"]').exists()).toBe(false)
	})

	it('keeps a menu of plain names as it was', () => {
		const w = mountPage({ headerActions, headerButtons: [ADD, { action: 'actions-menu', items: ['calendar', 'refresh'] }] })
		expect(keys(w)).toEqual(['calendar', 'refresh'])
		expect(w.findAll('.caption')).toHaveLength(0)
	})
})
