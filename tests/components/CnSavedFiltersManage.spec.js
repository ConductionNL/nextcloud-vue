/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saved filters: the Save filter name, one manage menu per filter, the edit
 * dialog, and default filters an app ships through its manifest.
 *
 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-2
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'alice' })) }))

const { flushPromises, mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default
const CnSavedViewEditDialog = require('../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { defaultFilterViews } = require('../../src/utils/savedViewHelpers.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const own = { id: 1, name: 'Mine', owner: 'alice', '@self': { access: 'owner' }, query: { filters: { status: 'open' } } }
const writable = { id: 2, name: 'Desk', owner: 'bob', '@self': { access: 'write' } }
const readOnly = { id: 3, name: 'Team', owner: 'bob', '@self': { access: 'read' } }
const DEFAULTS = [{ slug: 'overdue-mine', name: 'Te laat, van mij', filters: { assignee: '@me', 'deadline[lt]': '@today' } }]

const ids = (w, id) => w.findAll(`[data-testid="${id}"]`)
async function manage(w, id) {
	await w.get(`[data-testid="cn-saved-views-manage"][data-view-id="${id}"]`).trigger('click')
	return w
}
const entries = (w) => ['edit', 'share', 'presentation', 'update', 'copy', 'delete'].filter((e) => ids(w, `cn-saved-views-${e}`).length > 0)

describe('the control is called Save filter', () => {
	it('names the board-look button Save filter', () => {
		const w = mount(CnSavedViewsControl, { props: { views: [], currentUserId: 'alice' }, global: { provide: { cnLook: 'board' } } })
		expect(w.get('[data-testid="cn-saved-views-control"]').attributes('aria-label')).toBe('Save filter')
	})
})

describe('one manage menu per saved filter', () => {
	const mountControl = (views) => mount(CnSavedViewsControl, { props: { views, currentUserId: 'alice' } })

	it('puts one Manage button on every row and nothing else beside the name', () => {
		const w = mountControl([own, writable, readOnly])
		expect(ids(w, 'cn-saved-views-manage')).toHaveLength(3)
		expect(entries(w)).toEqual([])
		expect(ids(w, 'cn-saved-views-manage')[0].attributes('aria-label')).toBe('Manage "Mine"')
	})

	it('offers each access only its own entries', async () => {
		expect(entries(await manage(mountControl([own]), 1))).toEqual(['edit', 'share', 'presentation', 'update', 'delete'])
		expect(entries(await manage(mountControl([writable]), 2))).toEqual(['presentation', 'update'])
		expect(entries(await manage(mountControl([readOnly]), 3))).toEqual(['copy'])
	})

	it('hides the list while a filter is managed and Back returns to it', async () => {
		const w = await manage(mountControl([own, readOnly]), 1)
		expect(ids(w, 'cn-saved-views-item')).toHaveLength(0)
		expect(w.get('[data-testid="cn-saved-views-back"]').text()).toContain('Mine')
		await w.get('[data-testid="cn-saved-views-back"]').trigger('click')
		expect(ids(w, 'cn-saved-views-item')).toHaveLength(2)
	})

	it('emits edit-request with the managed view', async () => {
		const w = await manage(mountControl([own]), 1)
		await w.get('[data-testid="cn-saved-views-edit"]').trigger('click')
		expect(w.emitted('edit-request')[0][0].id).toBe(1)
	})

	it('lists defaults first under Default filters, offering a copy only', async () => {
		const w = mountControl([own, ...defaultFilterViews(DEFAULTS)])
		expect(w.get('[data-testid="cn-saved-views-section-seeded"]').attributes('name')).toBe('Default filters')
		expect(ids(w, 'cn-saved-views-item')[0].text()).toContain('Te laat, van mij')
		expect(entries(await manage(w, 'default:overdue-mine'))).toEqual(['copy'])
	})
})

describe('CnSavedViewEditDialog', () => {
	it('confirms the trimmed name and leaves the criteria by default', async () => {
		const w = mount(CnSavedViewEditDialog, { props: { view: own } })
		expect(w.vm.name).toBe('Mine')
		await w.setData({ name: '  Mine, overdue ' })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ name: 'Mine, overdue', replaceCriteria: false })
	})

	it('keeps the form open with the refusal', () => {
		const w = mount(CnSavedViewEditDialog, { props: { view: own } })
		w.vm.onConfirm()
		w.vm.setError('You may not change these fields on this view: name')
		expect(w.vm.loading).toBe(false)
		expect(w.vm.error).toContain('name')
	})
})

describe('defaultFilterViews', () => {
	it('turns declarations into read-only views with their tokens kept', () => {
		const [view] = defaultFilterViews(DEFAULTS, { register: 'procest', schema: 'case' })
		expect(view).toMatchObject({ id: 'default:overdue-mine', seeded: true, owner: '', '@self': { access: 'read' } })
		expect(view.query.filters).toEqual({ assignee: '@me', 'deadline[lt]': '@today' })
		expect(view.query.registers).toEqual(['procest'])
		expect(view.query.schemas).toEqual(['case'])
	})

	it('leaves out an entry without a slug or name', () => {
		expect(defaultFilterViews([{ name: 'x', filters: {} }, { slug: 'y', filters: {} }, null])).toEqual([])
		expect(defaultFilterViews(undefined)).toEqual([])
	})
})

describe('the manifest key', () => {
	const manifest = (defaultSavedFilters) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.10.0',
		menu: [],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', defaultSavedFilters } }],
	})

	it('accepts a declared default', () => {
		expect(validateManifestV2(manifest(DEFAULTS)).valid).toBe(true)
	})

	it('refuses a slug outside the pattern', () => {
		expect(validateManifestV2(manifest([{ slug: 'Te Laat', name: 'x', filters: {} }])).valid).toBe(false)
		expect(validateManifestV2(manifest([{ name: 'x', filters: {} }])).valid).toBe(false)
	})
})

describe('CnIndexPage with saved filters', () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve))
	const mountPage = (props = {}) => mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], allowSavedViews: true, ...props },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnIndexSidebar: true, CnPageHeader: true, CnIcon: true },
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})

	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [own], total: 1 } })
	})

	it('renames with a PATCH that carries the name only', async () => {
		axios.patch.mockResolvedValue({ data: { view: { ...own, name: 'Renamed' } } })
		const w = mountPage()
		await flush()
		await manage(w, 1)
		await w.get('[data-testid="cn-saved-views-edit"]').trigger('click')
		await flushPromises()
		const dialog = w.findComponent({ name: 'CnSavedViewEditDialog' })
		await dialog.setData({ name: 'Renamed' })
		await dialog.get('[data-testid="cn-saved-view-edit-confirm"]').trigger('click')
		await flush()
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/views/1', { name: 'Renamed' })
		expect(w.vm.savedViews[0].name).toBe('Renamed')
	})

	it('sends the current filters as the query when asked', async () => {
		axios.patch.mockResolvedValue({ data: { view: own } })
		const w = mountPage()
		await flush()
		w.vm.viewPendingEdit = own
		await w.vm.onEditViewConfirm({ name: 'Mine', replaceCriteria: true })
		const body = axios.patch.mock.calls[0][1]
		expect(Object.keys(body).sort()).toEqual(['name', 'query'])
		expect(body.query.schemas).toEqual(['case'])
	})

	it('lists the defaults and resolves their tokens when applied', async () => {
		const w = mountPage({ defaultSavedFilters: DEFAULTS })
		await flush()
		expect(w.findAll('[data-testid="cn-saved-views-item"]').map((e) => e.text())[0]).toContain('Te laat, van mij')
		w.vm.onApplySavedView(w.vm.viewsForControl[0])
		const query = w.vm.$router.replace.mock.calls[0][0].query
		expect(JSON.stringify(query)).toContain('alice')
		expect(JSON.stringify(query)).not.toContain('@')
	})

	it('copies a default with its tokens unresolved', async () => {
		axios.post.mockResolvedValue({ data: { view: { id: 9, name: 'Te laat, van mij', owner: 'alice' } } })
		const w = mountPage({ defaultSavedFilters: DEFAULTS })
		await flush()
		await w.vm.onCopyViewRequest(w.vm.viewsForControl[0])
		expect(axios.post.mock.calls[0][1].query.filters).toEqual({ assignee: '@me', 'deadline[lt]': '@today' })
	})
})
