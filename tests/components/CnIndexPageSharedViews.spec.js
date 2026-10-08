/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage handlers for shared saved views: the audience travels on save,
 * a writer's save never sends sharedWith or owner, a read-only view is copied.
 *
 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-3
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path, generateOcsUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'alice' })) }))

const { flushPromises, mount } = require('@vue/test-utils')
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

const writable = { id: 7, name: 'Desk list', owner: 'bob', isPublic: true, sharedWith: [{ group: 'desk', mode: 'write' }], query: { filters: { status: 'open' }, search: '', sort: null }, '@self': { access: 'write' } }
const readOnly = { id: 8, name: 'Read list', owner: 'bob', isPublic: false, sharedWith: [{ group: 'desk', mode: 'read' }], query: { filters: { status: 'backlog' }, search: 'x', sort: [{ key: 'created', order: 'desc' }] }, '@self': { access: 'read' } }
const own = { id: 1, name: 'Mine', owner: 'alice', isPublic: false, query: { filters: {}, search: '', sort: null }, '@self': { access: 'owner' } }

function mountPage(routeQuery = {}) {
	axios.get.mockImplementation(async (url) => (String(url).includes('views') ? { data: { results: [own, writable, readOnly] } } : { data: {} }))
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], allowSavedViews: true },
		stubs,
		mocks: { $route: { params: {}, query: routeQuery }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})
}

beforeEach(() => {
	Object.values(axios).forEach((fn) => fn.mockReset && fn.mockReset())
})

describe('CnIndexPage shared saved views', () => {
	it('sends the chosen audience when saving a new view', async () => {
		axios.post.mockResolvedValue({ data: { view: { ...own, id: 9, name: 'Shared' } } })
		const w = mountPage({ status: 'open' })
		await flushPromises()
		await w.vm.onSaveViewConfirm({ name: 'Shared', isPublic: false, sharedWith: [{ group: 'desk', mode: 'read' }] })
		expect(axios.post.mock.calls[0][1].sharedWith).toEqual([{ group: 'desk', mode: 'read' }])
	})

	it('sends no sharedWith when none was chosen', async () => {
		axios.post.mockResolvedValue({ data: { view: { ...own, id: 9 } } })
		const w = mountPage()
		await flushPromises()
		await w.vm.onSaveViewConfirm({ name: 'Plain', isPublic: false, sharedWith: [] })
		expect('sharedWith' in axios.post.mock.calls[0][1]).toBe(false)
	})

	it('a writer saves the current state with no sharedWith and no owner', async () => {
		axios.put.mockResolvedValue({ data: { view: { ...writable, query: { filters: { status: 'closed' }, search: '', sort: null } } } })
		const w = mountPage({ status: 'closed' })
		await flushPromises()
		await w.vm.onUpdateViewRequest(writable)
		const [url, body] = axios.put.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/views/7')
		expect(body.query.filters).toEqual({ status: 'closed' })
		expect('sharedWith' in body).toBe(false)
		expect('owner' in body).toBe(false)
		expect(body.name).toBe('Desk list')
	})

	it('copies a read-only view into a personal one and leaves the original', async () => {
		axios.post.mockResolvedValue({ data: { view: { ...own, id: 20, name: 'Read list' } } })
		const w = mountPage()
		await flushPromises()
		await w.vm.onCopyViewRequest(readOnly)
		const body = axios.post.mock.calls[0][1]
		expect(body).toMatchObject({ name: 'Read list', isPublic: false, query: readOnly.query })
		expect('sharedWith' in body).toBe(false)
		expect(w.vm.savedViews.find((v) => v.id === 8)).toBeTruthy()
		expect(w.vm.savedViews.find((v) => v.id === 20)).toBeTruthy()
	})

	it('saves a changed audience with a PATCH of sharedWith only', async () => {
		axios.patch.mockResolvedValue({ data: { view: { ...own, sharedWith: [{ group: 'desk', mode: 'write' }] } } })
		const w = mountPage()
		await flushPromises()
		w.vm.onShareViewRequest(own)
		await flushPromises()
		await w.vm.onShareViewConfirm([{ group: 'desk', mode: 'write' }])
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/views/1', { sharedWith: [{ group: 'desk', mode: 'write' }] })
		expect(w.vm.viewPendingShare).toBeNull()
		expect(w.vm.savedViews.find((v) => v.id === 1).sharedWith).toEqual([{ group: 'desk', mode: 'write' }])
	})

	it('keeps the share dialog open with the server message when the save is refused', async () => {
		axios.patch.mockRejectedValue({ response: { data: { error: 'Unknown group' } } })
		const w = mountPage()
		await flushPromises()
		w.vm.onShareViewRequest(own)
		await flushPromises()
		const dialog = w.findComponent({ name: 'CnSavedViewShareDialog' })
		await w.vm.onShareViewConfirm([{ group: 'nope', mode: 'read' }])
		expect(w.vm.viewPendingShare).not.toBeNull()
		expect(dialog.vm.error).toBe('Unknown group')
	})
})
