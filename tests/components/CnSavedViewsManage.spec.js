/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saved views: the Save view name, one manage menu per view, the edit
 * dialog, and default views an app ships through its manifest.
 *
 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-2
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
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default
const CnIndexSidebar = require('../../src/components/CnIndexSidebar/CnIndexSidebar.vue').default
const { syncSavedViewMenu, toggleSavedViewMenuEntry, withSavedViewMenu } = require('../../src/utils/savedViewMenu.js')
const CnSavedViewEditDialog = require('../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { defaultFilterViews } = require('../../src/utils/savedViewHelpers.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const own = { id: 1, name: 'Mine', owner: 'alice', '@self': { access: 'owner' }, query: { filters: { status: 'open' } } }
const writable = { id: 2, name: 'Desk', owner: 'bob', '@self': { access: 'write' } }
const readOnly = { id: 3, name: 'Team', owner: 'bob', '@self': { access: 'read' } }
const DEFAULTS = [{ slug: 'overdue-mine', name: 'Te laat, van mij', filters: { assignee: '@me', 'deadline[lt]': '@today' } }]

const ids = (w, id) => w.findAll(`[data-testid="${id}"]`)

describe('the toolbar keeps Save view only', () => {
	it('names the board-look button Save view and lists no views in the toolbar', () => {
		const w = mount(CnSavedViewsControl, { props: { views: [own], currentUserId: 'alice' }, global: { provide: { cnLook: 'board' } } })
		expect(w.get('[data-testid="cn-saved-views-control"]').attributes('aria-label')).toBe('Save view')
		expect(ids(w, 'cn-saved-views-item')).toHaveLength(0)
		expect(ids(w, 'cn-saved-views-delete')).toHaveLength(0)
	})
})

describe('the saved-views panel', () => {
	const mountPanel = (views, props = {}) => mount(CnSavedViewsPanel, { props: { views, currentUserId: 'alice', ...props } })
	const entriesOf = (w, id) => ['edit', 'update', 'share', 'copy', 'menu', 'delete']
		.filter((e) => w.findAll(`[data-testid="cn-saved-views-${e}"][data-view-id="${id}"]`).length > 0)

	it('gives every row a labelled manage menu', () => {
		const w = mountPanel([own, writable, readOnly])
		expect(ids(w, 'cn-saved-views-manage')).toHaveLength(3)
		expect(ids(w, 'cn-saved-views-manage')[0].attributes('aria-label')).toBe('Manage "Mine"')
	})

	it('offers each access only its own entries; only the owner edits and deletes', () => {
		const w = mountPanel([own, writable, readOnly])
		expect(entriesOf(w, '1')).toEqual(['edit', 'update', 'share', 'delete'])
		expect(entriesOf(w, '2')).toEqual(['update', 'copy'])
		expect(entriesOf(w, '3')).toEqual(['copy'])
	})

	it('offers Add to menu on every view when there is a menu, and Remove once added', () => {
		const w = mountPanel([own, readOnly], { menuIds: ['3'] })
		expect(w.get('[data-testid="cn-saved-views-menu"][data-view-id="1"]').text()).toContain('Add to menu')
		expect(w.get('[data-testid="cn-saved-views-menu"][data-view-id="3"]').text()).toContain('Remove from menu')
		expect(mountPanel([own]).findAll('[data-testid="cn-saved-views-menu"]')).toHaveLength(0)
	})

	it('emits each intent with its view, and save-request from its own button', async () => {
		const w = mountPanel([own], { menuIds: [] })
		await w.get('[data-testid="cn-saved-views-edit"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-menu"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-item"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-save"]').trigger('click')
		expect(w.emitted('edit-request')[0][0].id).toBe(1)
		expect(w.emitted('menu-toggle')[0][0].id).toBe(1)
		expect(w.emitted('apply')[0][0].id).toBe(1)
		expect(w.emitted('save-request')).toHaveLength(1)
	})

	it('lists defaults first under Default views, offering a copy and the menu only', () => {
		const w = mountPanel([own, ...defaultFilterViews(DEFAULTS)], { menuIds: [] })
		expect(w.get('[data-testid="cn-saved-views-section-seeded"]').text()).toBe('Default views')
		expect(ids(w, 'cn-saved-views-item')[0].text()).toContain('Te laat, van mij')
		expect(entriesOf(w, 'default:overdue-mine')).toEqual(['copy', 'menu'])
	})

	it('marks the applied view as pressed', () => {
		const w = mountPanel([own, readOnly], { selectedViewId: '3' })
		expect(w.get('[data-testid="cn-saved-views-item"][data-view-id="3"]').attributes('aria-pressed')).toBe('true')
		expect(w.get('[data-testid="cn-saved-views-item"][data-view-id="1"]').attributes('aria-pressed')).toBe('false')
	})
})

describe('the sidebar carries the panel', () => {
	it('renders the panel in its own Filters tab and hands every intent back as saved-view', async () => {
		const w = mount(CnIndexSidebar, { props: { open: true, savedViews: { views: [own], currentUserId: 'alice', menuIds: [] } } })
		expect(w.find('#filters-tab [data-testid="cn-saved-views-panel"]').exists()).toBe(true)
		expect(w.find('#search-tab [data-testid="cn-saved-views-panel"]').exists()).toBe(false)
		await w.get('[data-testid="cn-saved-views-delete"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-save"]').trigger('click')
		expect(w.emitted('saved-view')[0][0]).toEqual({ action: 'delete', view: own })
		expect(w.emitted('saved-view')[1][0]).toEqual({ action: 'save', view: null })
	})

	it('switches to the tab activeTab names', async () => {
		const w = mount(CnIndexSidebar, { props: { open: true, savedViews: { views: [] } } })
		expect(w.vm.internalActiveTab).toBe('search-tab')
		await w.setProps({ activeTab: 'filters-tab' })
		expect(w.vm.internalActiveTab).toBe('filters-tab')
	})

	it('renders no panel without savedViews', () => {
		const w = mount(CnIndexSidebar, { props: { open: true } })
		expect(w.find('[data-testid="cn-saved-views-panel"]').exists()).toBe(false)
	})
})

describe('saved views in the app menu', () => {
	const entry = { id: '7', page: 'Cases', name: 'Mine, overdue' }

	it('adds, then removes, an entry', () => {
		const added = toggleSavedViewMenuEntry([], entry)
		expect(added).toEqual([entry])
		expect(toggleSavedViewMenuEntry(added, entry)).toEqual([])
	})

	it('keeps current names and drops views the page no longer lists, on that page only', () => {
		const other = { id: '9', page: 'Queue', name: 'Late' }
		const synced = syncSavedViewMenu([entry, { id: '8', page: 'Cases', name: 'Gone' }, other], 'Cases', [{ id: 7, name: 'Renamed' }])
		expect(synced).toEqual([{ ...entry, name: 'Renamed' }, other])
	})

	it('puts the My views group at the bottom of the menu, after every main entry', () => {
		const menu = [
			{ id: 'Zaken', type: 'caption', label: 'Cases', order: 20 },
			{ id: 'Cases', route: 'Cases', label: 'All cases', order: 21 },
			{ id: 'Rel', type: 'caption', label: 'Relations', order: 40 },
			{ id: 'Contacts', route: 'Contacts', label: 'Contacts', order: 41 },
		]
		const out = withSavedViewMenu(menu, [entry])
		expect(out.map((i) => i.id)).toEqual(['Zaken', 'Cases', 'Rel', 'Contacts', 'saved-views-caption', 'saved-view-7'])
		expect(out[4]).toMatchObject({ type: 'caption', label: 'My views' })
		expect(out[5]).toEqual({ id: 'saved-view-7', label: 'Mine, overdue', route: 'Cases', query: { savedView: '7' }, icon: 'FilterOutline', order: expect.any(Number) })
		expect(out[3].order < out[4].order && out[4].order < out[5].order).toBe(true)
		expect(withSavedViewMenu(menu, [])).toBe(menu)
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
	const manifest = (defaultSavedViews) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.10.0',
		menu: [],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', defaultSavedViews } }],
	})

	it('accepts a declared default', () => {
		expect(validateManifestV2(manifest(DEFAULTS)).valid).toBe(true)
	})

	it('refuses a slug outside the pattern', () => {
		expect(validateManifestV2(manifest([{ slug: 'Te Laat', name: 'x', filters: {} }])).valid).toBe(false)
		expect(validateManifestV2(manifest([{ name: 'x', filters: {} }])).valid).toBe(false)
	})
})

describe('CnIndexPage with saved views', () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve))
	const mountPage = (props = {}, { query = {}, menu = null } = {}) => mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], allowSavedViews: true, ...props },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnPageHeader: true, CnIcon: true },
		global: { provide: menu ? { cnSavedViewMenu: menu } : {} },
		mocks: { $route: { name: 'Cases', params: {}, query }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})

	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [own], total: 1 } })
	})

	it('renames with a PATCH that carries the name only', async () => {
		axios.patch.mockResolvedValue({ data: { view: { ...own, name: 'Renamed' } } })
		const w = mountPage()
		await flush()
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
		const w = mountPage({ defaultSavedViews: DEFAULTS })
		await flush()
		expect(w.findAll('[data-testid="cn-saved-views-item"]').map((e) => e.text())[0]).toContain('Te laat, van mij')
		w.vm.onApplySavedView(w.vm.viewsForControl[0])
		const query = w.vm.$router.replace.mock.calls[0][0].query
		expect(JSON.stringify(query)).toContain('alice')
		expect(JSON.stringify(query)).not.toContain('@')
	})

	it('copies a default with its tokens unresolved', async () => {
		axios.post.mockResolvedValue({ data: { view: { id: 9, name: 'Te laat, van mij', owner: 'alice' } } })
		const w = mountPage({ defaultSavedViews: DEFAULTS })
		await flush()
		await w.vm.onCopyViewRequest(w.vm.viewsForControl[0])
		expect(axios.post.mock.calls[0][1].query.filters).toEqual({ assignee: '@me', 'deadline[lt]': '@today' })
	})
	it('lists the views in the sidebar even on a page that declared no sidebar', async () => {
		const w = mountPage()
		await flush()
		expect(w.find('[data-testid="cn-saved-views-panel"]').exists()).toBe(true)
		expect(w.vm.hasSidebar).toBe(true)
		w.vm.sidebarActiveTab = ''
		axios.post.mockResolvedValue({ data: { view: { id: 4, name: 'New', owner: 'alice' } } })
		await w.vm.onSaveViewConfirm({ name: 'New', isPublic: false, sharedWith: [] })
		expect(w.vm.sidebarOpen).toBe(true)
		expect(w.vm.sidebarActiveTab).toBe('filters-tab')
		expect(mountPage({ sidebar: { enabled: false } }).vm.hasSidebar).toBe(false)
	})

	it('adds a view to the app menu through the shell, keyed by this page', async () => {
		const menu = { entries: [], toggle: jest.fn(), sync: jest.fn() }
		const w = mountPage({}, { menu })
		await flush()
		await w.get('[data-testid="cn-saved-views-menu"]').trigger('click')
		expect(menu.toggle).toHaveBeenCalledWith({ id: '1', page: 'Cases', name: 'Mine' })
		expect(menu.sync).toHaveBeenCalledWith('Cases', [{ ...own, menuBadge: null }])
	})

	it('applies the view a menu entry names, and keeps naming it in the address', async () => {
		const w = mountPage({}, { query: { savedView: '1' } })
		await flush()
		expect(w.vm.appliedSavedViewId).toBe('1')
		const query = w.vm.$router.replace.mock.calls.at(-1)[0].query
		expect(query.savedView).toBe('1')
		expect(query.status).toBe('open')
	})
})

describe('CnAppRoot holds the menu entries', () => {
	const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
	const manifest = { menu: [{ id: 'Cases', route: 'Cases', label: 'Cases' }], pages: [{ id: 'Cases', type: 'index', config: { allowSavedViews: true } }] }

	it('ends the menu with My views, its empty line without entries, and hangs them in it with', () => {
		const ctx = { manifest, manifestEditor: null, savedViewMenu: { entries: [] }, offersSavedViews: true }
		expect(CnAppRoot.computed.menuManifest.call(ctx).menu.at(-1)).toMatchObject({ type: 'hint' })
		expect(CnAppRoot.computed.menuManifest.call({ ...ctx, offersSavedViews: false })).toBe(manifest)
		ctx.savedViewMenu.entries = [{ id: '7', page: 'Cases', name: 'Mine, overdue' }]
		expect(CnAppRoot.computed.menuManifest.call(ctx).menu.at(-1)).toMatchObject({ route: 'Cases', query: { savedView: '7' } })
	})

	it('reads the list only for an app that offers saved views, and writes it on toggle', async () => {
		const read = jest.fn(async () => [{ id: '7', page: 'Cases', name: 'x' }])
		const write = jest.fn(async () => true)
		const ctx = { manifest, userPreferences: { read, write }, savedViewMenu: { entries: [] }, savedViewMenuLoaded: false }
		ctx.loadSavedViewMenu = CnAppRoot.methods.loadSavedViewMenu.bind(ctx)
		ctx.writeSavedViewMenu = CnAppRoot.methods.writeSavedViewMenu.bind(ctx)
		ctx._hydrateSavedViewMenuCounts = jest.fn()
		expect(CnAppRoot.computed.offersSavedViews.call(ctx)).toBe(true)
		expect(CnAppRoot.computed.offersSavedViews.call({ manifest: { pages: [{ config: {} }] } })).toBe(false)
		await ctx.loadSavedViewMenu()
		expect(read).toHaveBeenCalledWith('cn_saved_view_menu', [])
		await CnAppRoot.methods.toggleSavedViewMenu.call(ctx, { id: '7', page: 'Cases', name: 'x' })
		expect(ctx.savedViewMenu.entries).toEqual([])
		expect(write).toHaveBeenCalledWith('cn_saved_view_menu', [])
	})
})

describe('the view dialogs, as the boards draw them', () => {
	const CnSavedViewShareDialog = require('../../src/components/CnSavedViewShareDialog/CnSavedViewShareDialog.vue').default
	const shared = { ...own, sharedWith: [{ group: 'woo', mode: 'read' }, { user: 'anouk', mode: 'write' }] }

	it('the share dialog keeps user shares, is titled by the view, and stops sharing per entry', async () => {
		axios.get.mockResolvedValue({ data: { ocs: { data: { users: [], groups: [] } } } })
		const w = mount(CnSavedViewShareDialog, { props: { view: shared } })
		await flushPromises()
		expect(w.vm.sharedWith).toEqual([{ group: 'woo', mode: 'read' }, { user: 'anouk', mode: 'write' }])
		expect(w.vm.resolvedTitle).toBe('Share view: Mine')
		const fields = w.findComponent({ name: 'CnSavedViewShareFields' })
		fields.vm.onRemove('user:anouk')
		expect(fields.emitted('update:modelValue').at(-1)[0]).toEqual([{ group: 'woo', mode: 'read' }])
		expect(w.text()).toContain('May use')
		expect(w.text()).toContain('May update')
	})

	it('the edit dialog chooses between keeping and replacing the criteria', async () => {
		const w = mount(CnSavedViewEditDialog, { props: { view: shared } })
		expect(w.vm.resolvedTitle).toBe('Edit view: Mine')
		expect(w.text()).toContain('sees the change at once')
		w.vm.replaceCriteria = true
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ name: 'Mine', replaceCriteria: true })
	})

	it('the delete confirm names who it was shared with', () => {
		const message = CnIndexPage.computed.deleteViewMessage.call({ viewPendingDelete: shared })
		expect(message).toContain('"Mine" leaves your list and the menu on the left')
		expect(message).toContain('woo, anouk')
		expect(message).toContain('cannot be undone')
		expect(CnIndexPage.computed.deleteViewMessage.call({ viewPendingDelete: own })).not.toContain('shared with')
	})
})
