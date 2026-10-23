/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The header Actions menu exports the selected rows, and a header action can
 * be offered to administrators only.
 *
 * @spec openspec/changes/index-actions-menu-selection-export/specs/index-header/spec.md#requirement-the-actions-menu-exports-the-selection
 * @spec openspec/changes/index-actions-menu-selection-export/specs/index-header/spec.md#requirement-a-header-action-can-be-offered-to-administrators-only
 */
import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { stubLocationMethod } from '../support/stubLocation.js'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => null) }))

const ADD = { action: 'add', variant: 'primary', label: 'New case type' }

function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Case types',
			schema: { title: 'Case type', properties: { title: { title: 'Title' } } },
			register: 'dossiq',
			objects: [{ id: 'a' }, { id: 'b' }],
			pagination: { page: 1, pages: 1, total: 2, limit: 20 },
			showTitle: true,
			selectable: true,
			...extra,
		},
		global: {
			provide: { cnLook: 'board' },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'CaseTypes' } },
			stubs: {
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcActions: { props: ['menuName'], template: '<div class="actions-menu"><slot /></div>' },
				NcActionButton: { props: ['disabled'], emits: ['click'], template: '<button class="entry" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
				NcActionLink: { props: ['href'], template: '<a class="entry" :href="href"><slot /></a>' },
				CnMassImportDialog: true,
				CnMassCopyDialog: true,
				CnMassDeleteDialog: true,
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

const entry = (w, key) => w.find(`[data-testid="cn-index-header-menu-${key}"]`)

describe('the Actions menu exports the selection', () => {
	let assign
	beforeEach(() => {
		assign = stubLocationMethod('assign')
	})
	afterEach(() => assign.mockRestore())

	const EXPORTABLE = { title: 'Case type', slug: 'caseType', exportable: true, properties: {} }

	it('waits for a selection, then downloads the export of the selected ids as JSON', async () => {
		const w = mountPage({ allowExport: true, schema: EXPORTABLE, headerButtons: [ADD, { action: 'actions-menu', items: ['export-selected'] }] })
		expect(entry(w, 'export-selected').text()).toBe('Export selection as JSON')
		expect(entry(w, 'export-selected').attributes('disabled')).toBeDefined()

		await w.setProps({ selectedIds: ['a', 'b'] })
		expect(entry(w, 'export-selected').attributes('disabled')).toBeUndefined()
		await entry(w, 'export-selected').trigger('click')

		expect(assign).toHaveBeenCalledTimes(1)
		const url = decodeURIComponent(assign.mock.calls[0][0])
		expect(url).toContain('/apps/openregister/api/objects/dossiq/caseType/export?')
		expect(url).toContain('format=json')
		expect(url).toContain('_ids[]=a&_ids[]=b')
	})

	it('is offered only where the list itself may be exported', async () => {
		const menu = { headerButtons: [ADD, { action: 'actions-menu', items: ['export-selected', 'refresh'] }], selectedIds: ['a'] }
		const variants = [
			{ ...menu, schema: EXPORTABLE },
			{ ...menu, allowExport: true, schema: { ...EXPORTABLE, exportable: false } },
			{ ...menu, allowExport: true, schema: EXPORTABLE, register: '' },
			{ ...menu, allowExport: true, schema: { title: 'Case type', exportable: true, properties: {} } },
		]
		for (const variant of variants) {
			const w = mountPage(variant)
			expect(entry(w, 'export-selected').exists()).toBe(false)
			w.vm.onExportSelected()
		}
		expect(assign).not.toHaveBeenCalled()
	})
})

describe('a header action can be offered to administrators only', () => {
	const actions = [{ id: 'reload', label: 'Reload templates', adminOnly: true }, { id: 'goto', label: 'Go to' }]
	const menu = { headerButtons: [ADD, { action: 'actions-menu', items: ['reload', 'goto'] }], headerActions: actions }

	it('leaves it out for a user who is not an administrator', () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		const w = mountPage(menu)
		expect(entry(w, 'reload').exists()).toBe(false)
		expect(entry(w, 'goto').exists()).toBe(true)
	})

	it('draws no header button that runs it for a user who is not an administrator', () => {
		getCurrentUser.mockReturnValue({ uid: 'pieter', isAdmin: false })
		const buttons = { headerButtons: [ADD, { action: 'reload', label: 'Reload templates' }, { action: 'goto', label: 'Go to' }], headerActions: actions }
		expect(mountPage(buttons).vm.resolvedHeaderButtons.map((b) => b.action)).toEqual(['add', 'goto'])

		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		expect(mountPage(buttons).vm.resolvedHeaderButtons.map((b) => b.action)).toEqual(['add', 'reload', 'goto'])
	})

	it('offers it to an administrator', () => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		const w = mountPage(menu)
		expect(entry(w, 'reload').exists()).toBe(true)
	})
})
