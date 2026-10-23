/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view has an icon and a description, chosen in the save and edit
 * dialogs, and its My views menu entry shows the icon, the description as
 * its tooltip and the number of objects it matches (Ruben, 23 Oct).
 *
 * @spec openspec/changes/saved-view-icon-description-count/specs/saved-view-icon-description-count/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path, generateOcsUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'alice' })) }))

const { flushPromises, mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnAppNav = require('../../src/components/CnAppNav/CnAppNav.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnSavedViewEditDialog = require('../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue').default
const CnSavedViewLookFields = require('../../src/components/CnSavedViewLookFields/CnSavedViewLookFields.vue').default
const CnSaveViewDialog = require('../../src/components/CnSaveViewDialog/CnSaveViewDialog.vue').default
const { getSemanticIconComponent } = require('../../src/components/CnIcon/semanticIcons.js')
const { defaultFilterViews } = require('../../src/utils/savedViewHelpers.js')
const { SAVED_VIEW_ICONS, SAVED_VIEW_MENU_DEFAULT_ICON, savedViewIcon, syncSavedViewMenu, withSavedViewMenu } = require('../../src/utils/savedViewMenu.js')

const own = { id: 1, name: 'Mine', owner: 'alice', description: 'My open cases', '@self': { access: 'owner' }, query: { filters: { status: 'open' }, icon: 'ClockOutline' } }

describe('the saved view icon and description in the menu', () => {
	it('reads a person\'s icon from the query and a default view\'s from the view', () => {
		expect(savedViewIcon(own)).toBe('ClockOutline')
		expect(savedViewIcon({ icon: 'FolderOutline', query: { icon: 'ClockOutline' } })).toBe('FolderOutline')
		expect(savedViewIcon({ query: {} })).toBe('')
	})

	it('carries the icon and the description onto the menu entry on sync', () => {
		const next = syncSavedViewMenu([{ id: '1', page: 'Cases', name: 'Old' }], 'Cases', [own])
		expect(next).toEqual([{ id: '1', page: 'Cases', name: 'Mine', icon: 'ClockOutline', description: 'My open cases' }])
	})

	it('hands the description to the menu item and falls back to the filter icon', () => {
		const menu = withSavedViewMenu([], [{ id: '1', page: 'Cases', name: 'Mine', description: 'My open cases' }, { id: '2', page: 'Cases', name: 'Other' }])
		expect(menu.find((i) => i.label === 'Mine')).toMatchObject({ description: 'My open cases', icon: SAVED_VIEW_MENU_DEFAULT_ICON })
		expect('description' in menu.find((i) => i.label === 'Other')).toBe(false)
	})

	it('shows the description as the menu entry\'s tooltip', () => {
		expect(CnAppNav.methods.itemTooltip({ description: 'My open cases' })).toBe('My open cases')
		expect(CnAppNav.methods.itemTooltip({})).toBeNull()
	})

	it('offers only icons the menu can draw', () => {
		for (const name of SAVED_VIEW_ICONS) {
			expect(getSemanticIconComponent(name)).toBeTruthy()
		}
	})

	it('gives a default view its declared icon and description', () => {
		const [view] = defaultFilterViews([{ slug: 'woo', name: 'Woo', icon: 'FileDocumentOutline', description: 'Woo requests', filters: {} }], { register: 'r', schema: 's' })
		expect(view).toMatchObject({ icon: 'FileDocumentOutline', description: 'Woo requests' })
	})
})

describe('the icon and description fields', () => {
	it('emits the chosen icon, and \'\' for the menu\'s own default', async () => {
		const w = mount(CnSavedViewLookFields, { props: { icon: 'ClockOutline', description: '' } })
		expect(w.get('[data-icon="ClockOutline"]').attributes('aria-checked')).toBe('true')
		await w.get('[data-icon="FolderOutline"]').trigger('click')
		await w.get(`[data-icon="${SAVED_VIEW_MENU_DEFAULT_ICON}"]`).trigger('click')
		expect(w.emitted('update:icon')).toEqual([['FolderOutline'], ['']])
	})

	it('the edit dialog starts from the view and emits description and icon', async () => {
		const w = mount(CnSavedViewEditDialog, { props: { view: own } })
		expect(w.vm.description).toBe('My open cases')
		expect(w.vm.icon).toBe('ClockOutline')
		await w.setData({ description: 'Changed', icon: 'TagOutline' })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toMatchObject({ name: 'Mine', description: 'Changed', icon: 'TagOutline' })
	})

	it('the save dialog emits description and icon', async () => {
		const w = mount(CnSaveViewDialog)
		await w.setData({ name: 'New', description: 'What it shows', icon: 'BellOutline' })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toMatchObject({ name: 'New', description: 'What it shows', icon: 'BellOutline' })
	})
})

describe('CnIndexPage keeps the icon and description and counts every view', () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve))
	const mountPage = () => mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], allowSavedViews: true },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnPageHeader: true, CnIcon: true },
		mocks: { $route: { name: 'Cases', params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})

	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [own], total: 1 } })
	})

	it('saves a new view with its description and its icon in the query', async () => {
		axios.post.mockResolvedValue({ data: { view: { id: 4, name: 'New', owner: 'alice' } } })
		const w = mountPage()
		await flush()
		await w.vm.onSaveViewConfirm({ name: 'New', isPublic: false, sharedWith: [], description: 'What it shows', icon: 'BellOutline' })
		const body = axios.post.mock.calls[0][1]
		expect(body.description).toBe('What it shows')
		expect(body.query.icon).toBe('BellOutline')
	})

	it('patches a changed icon into the query and a changed description', async () => {
		axios.patch.mockResolvedValue({ data: { view: own } })
		const w = mountPage()
		await flush()
		w.vm.viewPendingEdit = own
		await w.vm.onEditViewConfirm({ name: 'Mine', replaceCriteria: false, description: 'Changed', icon: 'TagOutline' })
		const body = axios.patch.mock.calls[0][1]
		expect(body).toEqual({ name: 'Mine', description: 'Changed', query: { ...own.query, icon: 'TagOutline' } })
	})

	it('keeps the icon when the criteria are replaced', async () => {
		axios.patch.mockResolvedValue({ data: { view: own } })
		const w = mountPage()
		await flush()
		w.vm.viewPendingEdit = own
		await w.vm.onEditViewConfirm({ name: 'Mine', replaceCriteria: true, description: 'My open cases', icon: 'ClockOutline' })
		const body = axios.patch.mock.calls[0][1]
		expect(body.query.icon).toBe('ClockOutline')
		expect('description' in body).toBe(false)
	})

	it('counts what every view matches, unless its badge is false', async () => {
		const w = mountPage()
		await flush()
		expect(w.vm.savedViewMenuBadge(own)).toEqual({ count: { register: 'procest', schema: 'case', filter: { status: 'open' } } })
		expect(w.vm.savedViewMenuBadge({ ...own, query: { filters: {}, overrides: { badge: false } } })).toBeNull()
	})
})

afterAll(async () => {
	await flushPromises()
})
