/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnIndexPage's saved-views control (saved-views-ui): opt-in via
 * `allowSavedViews`, lists OpenRegister saved-search views from
 * `GET /apps/openregister/api/views`, applies a view by replacing the route
 * query, saves the current route-query state via POST, and deletes own
 * views (only) after confirmation.
 *
 * CnActionsBar is mounted for real (not stubbed) so the `#actions` slot —
 * where CnSavedViewsControl lives — actually renders; the control and the
 * dialogs are also real, with their `@nextcloud/vue` children resolving to
 * the shared jest mock which flattens slots into plain divs.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => path,
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'alice' })),
}))

const { mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnMassDeleteDialog: true,
	CnMassCopyDialog: true,
	CnMassExportDialog: true,
	CnMassImportDialog: true,
	CnDeleteDialog: true,
	CnCopyDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	CnIcon: true,
}

const ownView = {
	id: 1,
	uuid: 'uuid-1',
	name: 'My open cases',
	owner: 'alice',
	isPublic: false,
	query: { filters: { status: 'open' }, search: 'urgent', sort: { key: 'created', order: 'desc' } },
}
const foreignView = {
	id: 2,
	uuid: 'uuid-2',
	name: 'Team backlog',
	owner: 'bob',
	isPublic: true,
	query: { filters: { status: 'backlog' }, search: '', sort: null },
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountPage(propsData = {}, routeQuery = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], ...propsData },
		stubs,
		mocks: {
			$route: { params: {}, query: routeQuery },
			$router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) },
		},
	})
}

describe('CnIndexPage — saved views (saved-views-ui)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [ownView, foreignView], total: 2 } })
	})

	it('does not render the control when allowSavedViews is unset (default false)', () => {
		const wrapper = mountPage()
		expect(wrapper.find('[data-testid="cn-saved-views-control"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('renders the control when allowSavedViews is true', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		expect(wrapper.find('[data-testid="cn-saved-views-control"]').exists()).toBe(true)
	})

	it('fetches views from the OR views endpoint on create', async () => {
		mountPage({ allowSavedViews: true })
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/views')
	})

	it('lists the fetched views as menu entries', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		const items = wrapper.findAll('[data-testid="cn-saved-views-item"]')
		expect(items.length).toBe(2)
		expect(items.at(0).text()).toContain('My open cases')
		expect(items.at(1).text()).toContain('Team backlog')
	})

	it('shows the empty caption when no views exist', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		expect(wrapper.find('[data-testid="cn-saved-views-empty"]').exists()).toBe(true)
		expect(wrapper.findAll('[data-testid="cn-saved-views-item"]').length).toBe(0)
	})

	it('applies a view by replacing the route query with its stored state', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		await wrapper.findAll('[data-testid="cn-saved-views-item"]').at(0).trigger('click')
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({
			query: { status: 'open', _search: 'urgent', _sortKey: 'created', _sortOrder: 'desc' },
		})
		expect(wrapper.emitted('apply-view')[0][0]).toEqual(ownView)
	})

	it('applies a filter-only view without reserved keys', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		await wrapper.findAll('[data-testid="cn-saved-views-item"]').at(1).trigger('click')
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({ query: { status: 'backlog' } })
	})

	it('only offers delete for views the current user owns', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		const deletes = wrapper.findAll('[data-testid="cn-saved-views-delete"]')
		expect(deletes.length).toBe(1)
		expect(deletes.at(0).attributes('data-view-id')).toBe('1')
	})

	it('saves the current route-query state with the exact OR payload', async () => {
		axios.post.mockResolvedValue({ data: { view: { ...ownView, id: 3, name: 'Saved' } } })
		const wrapper = mountPage(
			{ allowSavedViews: true },
			{ status: 'open', _search: 'urgent', _sortKey: 'name', _sortOrder: 'asc', _page: '2' },
		)
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-save"]').trigger('click')
		const dialog = wrapper.findComponent({ name: 'CnSaveViewDialog' })
		expect(dialog.exists()).toBe(true)
		await dialog.setData({ name: 'Saved', isPublic: true })
		await dialog.find('[data-testid="cn-save-view-confirm"]').trigger('click')
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/views', {
			name: 'Saved',
			description: '',
			isPublic: true,
			isDefault: false,
			query: {
				filters: { status: 'open' },
				search: 'urgent',
				sort: { key: 'name', order: 'asc' },
			},
		})
		// Dialog closes and the created view joins the list.
		expect(wrapper.findComponent({ name: 'CnSaveViewDialog' }).exists()).toBe(false)
		expect(wrapper.vm.savedViews.map((v) => v.id)).toContain(3)
	})

	it('keeps the save dialog open and surfaces the error on a failed save', async () => {
		axios.post.mockRejectedValue(new Error('nope'))
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-save"]').trigger('click')
		const dialog = wrapper.findComponent({ name: 'CnSaveViewDialog' })
		await dialog.setData({ name: 'Doomed' })
		await dialog.find('[data-testid="cn-save-view-confirm"]').trigger('click')
		await flush()
		expect(wrapper.findComponent({ name: 'CnSaveViewDialog' }).exists()).toBe(true)
		expect(dialog.vm.error).toBe('nope')
		expect(dialog.vm.loading).toBe(false)
	})

	it('deletes an own view after confirmation and removes it from the list', async () => {
		axios.delete.mockResolvedValue({})
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-delete"]').trigger('click')
		const confirm = wrapper.findComponent({ name: 'CnConfirmDialog' })
		expect(confirm.exists()).toBe(true)
		await confirm.find('[data-testid="cn-confirm-dialog-confirm"]').trigger('click')
		await flush()
		expect(axios.delete).toHaveBeenCalledWith('/apps/openregister/api/views/1')
		expect(wrapper.vm.savedViews.map((v) => v.id)).toEqual([2])
	})

	it('save button in the dialog is disabled while the name is empty', async () => {
		const wrapper = mountPage({ allowSavedViews: true })
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-save"]').trigger('click')
		const dialog = wrapper.findComponent({ name: 'CnSaveViewDialog' })
		// Empty name → confirm emits nothing even when clicked.
		await dialog.find('[data-testid="cn-save-view-confirm"]').trigger('click')
		await flush()
		expect(axios.post).not.toHaveBeenCalled()
	})
})
