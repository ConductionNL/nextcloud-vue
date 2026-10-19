/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's page config overrides at work: CnIndexPage reports the
 * applied view's overrides and selects its sort option, CnPageRenderer lays
 * them over the page while the view is active and restores the page when it
 * is left.
 *
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-view-can-override-the-page-config-while-it-is-active
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'alice' })) }))

const { mount, shallowMount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default
const { buildManifestRoutes } = require('../../src/utils/buildManifestRoutes.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
const RESTORE = require('../fixtures/saved-view-overrides-restore.json')

const OVERRIDES = {
	sortOption: 'urgency',
	columns: ['title', 'deadline'],
	views: ['cards'],
	viewMode: 'cards',
	header: { title: 'My work' },
	slots: { 'before-collection': 'WorkloadSummaryBar' },
	badge: { counterVariant: 'attention' },
}
const DEFAULTS = [
	{ slug: 'my-work', name: 'My work', filters: { assignee: '@me' }, overrides: OVERRIDES },
	{ slug: 'all-open', name: 'All open', filters: {} },
]
const SORTS = [{ value: 'urgency', label: 'Urgency' }, { value: 'newest', label: 'Newest', order: '-startDate' }]

describe('CnIndexPage and the applied view\'s overrides', () => {
	const flush = () => new Promise((resolve) => setTimeout(resolve))
	const mountPage = (props = {}, { query = {}, menu = null } = {}) => mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'dossiq', schema: { slug: 'case', properties: {} }, filter: { isFinalStatus: false }, objects: [], allowSavedViews: true, defaultSavedViews: DEFAULTS, sortSelectOptions: SORTS, ...props },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnPageHeader: true, CnIcon: true },
		global: { provide: menu ? { cnSavedViewMenu: menu } : {} },
		mocks: { $route: { name: 'Cases', params: {}, query }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})

	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
	})

	it('emits the overrides when a view carrying them is applied, and null when the view is cleared', async () => {
		const w = mountPage()
		await flush()
		w.vm.onApplySavedView(w.vm.defaultFilterViews[0])
		await w.vm.$nextTick()
		expect(w.emitted('view-overrides').at(-1)[0]).toEqual(OVERRIDES)
		w.vm.onClearFilters()
		await w.vm.$nextTick()
		expect(w.emitted('view-overrides').at(-1)[0]).toBeNull()
	})

	it('emits null when switching to a view without overrides', async () => {
		const w = mountPage()
		await flush()
		w.vm.onApplySavedView(w.vm.defaultFilterViews[0])
		await w.vm.$nextTick()
		w.vm.onApplySavedView(w.vm.defaultFilterViews[1])
		await w.vm.$nextTick()
		expect(w.emitted('view-overrides').at(-1)[0]).toBeNull()
	})

	it('selects the view\'s sort option, and only one the page offers', async () => {
		const w = mountPage()
		await flush()
		w.vm.onApplySavedView(w.vm.defaultFilterViews[0])
		expect(w.emitted('sort').at(-1)[0]).toMatchObject({ key: 'urgency' })
		expect(w.vm.viewSortOption).toBe('urgency')
		w.vm.applyViewSortOption({ sortOption: 'unknown' })
		expect(w.vm.viewSortOption).toBe('')
	})

	it('leaves the view when its address is replaced by the plain page', async () => {
		const w = mountPage({}, { query: { savedView: 'default:my-work' } })
		await flush()
		expect(w.vm.appliedSavedViewId).toBe('default:my-work')
		w.vm.$options.watch['$route.query.savedView'].call(w.vm, undefined, 'default:my-work')
		await w.vm.$nextTick()
		expect(w.vm.appliedSavedViewId).toBe('')
		expect(w.emitted('view-overrides').at(-1)[0]).toBeNull()
	})

	it('stores the view\'s badge as a count source when the view is added to the menu', async () => {
		const menu = { entries: [], toggle: jest.fn(), sync: jest.fn() }
		const w = mountPage({}, { menu })
		await flush()
		w.vm.onToggleSavedViewInMenu(w.vm.defaultFilterViews[0])
		expect(menu.toggle).toHaveBeenCalledWith({
			id: 'default:my-work',
			page: 'Cases',
			name: 'My work',
			badge: { count: { register: 'dossiq', schema: 'case', filter: { isFinalStatus: false, assignee: '@me' } }, counterVariant: 'attention' },
		})
		w.vm.onToggleSavedViewInMenu(w.vm.defaultFilterViews[1])
		expect(menu.toggle.mock.calls[1][0].badge).toBeUndefined()
	})
})

describe('CnPageRenderer lays the overrides over the page', () => {
	const manifest = {
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{
			id: 'Cases',
			route: '/cases',
			type: 'index',
			title: 'Cases',
			slots: { 'below-header': 'CaseSearchRefusal' },
			config: { register: 'dossiq', schema: 'case', columns: ['title', 'status'], viewModes: ['table', 'cards'], sortSelectOptions: SORTS, defaultSavedViews: DEFAULTS },
		}],
	}
	const IndexStub = { name: 'IndexStub', render: () => null }
	const Slot = (name) => ({ name, render: () => null })
	const mountRenderer = () => shallowMount(CnPageRenderer, {
		propsData: { manifest, pageTypes: { index: IndexStub }, customComponents: { CaseSearchRefusal: Slot('CaseSearchRefusal'), WorkloadSummaryBar: Slot('WorkloadSummaryBar') } },
		mocks: {
			$route: { name: 'Cases', params: {}, query: {}, meta: { cnPageId: 'Cases' } },
			$router: { push: jest.fn(() => Promise.resolve()), hasRoute: () => true, getRoutes: () => buildManifestRoutes(manifest, { component: CnPageRenderer }) },
		},
	})

	it('validates a manifest declaring them', () => {
		expect(validateManifestV2(manifest).valid).toBe(true)
	})

	it('hands the page the view\'s columns, modes and title while it is active, and the page\'s own after', async () => {
		const w = mountRenderer()
		const page = w.findComponent(IndexStub)
		page.vm.$emit('view-overrides', OVERRIDES)
		await w.vm.$nextTick()
		expect(w.vm.resolvedProps).toMatchObject({ columns: ['title', 'deadline'], viewModes: ['cards'], viewMode: 'cards', title: 'My work', register: 'dossiq' })
		expect(w.vm.resolvedSlotEntries.map((e) => e.name)).toEqual(['below-header', 'before-collection'])
		page.vm.$emit('view-overrides', null)
		await w.vm.$nextTick()
		expect(w.vm.resolvedProps).toMatchObject({ columns: ['title', 'status'], viewModes: ['table', 'cards'], title: 'Cases' })
		expect(w.vm.resolvedProps.viewMode).toBeUndefined()
		expect(w.vm.resolvedSlotEntries.map((e) => e.name)).toEqual(['below-header'])
	})
})

describe('a slot filled with a list of components', () => {
	it('mounts them in one slot, the same component on every read', async () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case' } }],
		}
		const A = { name: 'A', render: () => null }
		const B = { name: 'B', render: () => null }
		const w = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes: { index: { name: 'IndexStub', render: () => null } }, customComponents: { A, B } },
			mocks: {
				$route: { name: 'Cases', params: {}, query: {}, meta: { cnPageId: 'Cases' } },
				$router: { push: jest.fn(() => Promise.resolve()), hasRoute: () => true, getRoutes: () => [] },
			},
		})
		w.vm.onViewOverrides({ slots: { 'below-header': ['A', 'B'], 'before-collection': ['A'] } })
		await w.vm.$nextTick()
		const byName = Object.fromEntries(w.vm.resolvedSlotEntries.map((e) => [e.name, e.component]))
		expect(byName['before-collection'].name).toBe('A')
		expect(byName['below-header'].name).toBe('CnSlotSequence')
		expect(w.vm.slotSequence(['A', 'B'], 'below-header')).toBe(byName['below-header'])
	})
})

describe('CnAppRoot fetches the count of a "My views" entry', () => {
	it('under the menu entry\'s id, for entries with a count source only', () => {
		const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
		const count = { register: 'dossiq', schema: 'case', filter: { assignee: 'IS NULL' } }
		const ctx = { savedViewMenu: { entries: [{ id: 'default:team-queue', page: 'Cases', name: 'Team queue', badge: { count, counterVariant: 'attention' } }, { id: '7', page: 'Cases', name: 'Mine' }] }, _fetchMenuItemCount: jest.fn() }
		ctx._savedViewMenuCountItems = CnAppRoot.methods._savedViewMenuCountItems.bind(ctx)
		CnAppRoot.methods._hydrateSavedViewMenuCounts.call(ctx)
		expect(ctx._fetchMenuItemCount).toHaveBeenCalledTimes(1)
		expect(ctx._fetchMenuItemCount).toHaveBeenCalledWith({ id: 'saved-view-default:team-queue', count })
	})
})

describe('a breadcrumb that lands on a view', () => {
	it('carries its query into the link', () => {
		const CnHeaderTrail = require('../../src/components/CnPageHeader/CnHeaderTrail.vue').default
		const w = shallowMount(CnHeaderTrail, { props: { breadcrumb: { label: 'Privacy', route: 'Cases', query: { savedView: 'default:data-subject-requests' } }, current: 'Data subject requests' } })
		expect(w.vm.crumbs[0].to).toEqual({ name: 'Cases', query: { savedView: 'default:data-subject-requests' } })
	})
})

describe('the overrides schema', () => {
	const index = (overrides) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', defaultSavedViews: [{ slug: 'v', name: 'V', filters: {}, overrides }] } }],
	})

	it('accepts every allowed key', () => {
		const all = {
			sortOption: 'urgency',
			views: ['cards', 'map'],
			tabs: [{ label: 'AVG-verzoeken', route: 'Cases' }],
			slots: { 'below-header': 'WorkloadSummaryBar', 'after-search': null, 'before-collection': ['A', 'B'] },
			header: { title: 'My work', breadcrumb: { label: 'Cases' }, notice: { text: 'Yours' }, headerMeta: '{total}' },
			badge: { count: true, counterVariant: 'attention' },
		}
		expect(validateManifestV2(index(all)).valid).toBe(true)
		expect(validateManifestV2(index({ badge: true })).valid).toBe(true)
	})

	it('accepts dossiq\'s restore blocks verbatim', () => {
		for (const [slug, block] of Object.entries(RESTORE)) {
			const result = validateManifestV2(index(block))
			expect({ slug, errors: result.valid ? [] : result.errors }).toEqual({ slug, errors: [] })
		}
	})

	it('refuses a key outside the allowlist and a malformed one', () => {
		expect(validateManifestV2(index({ register: 'other' })).valid).toBe(false)
		expect(validateManifestV2(index({ header: { subtitle: 'x' } })).valid).toBe(false)
		expect(validateManifestV2(index({ badge: false })).valid).toBe(false)
		expect(validateManifestV2(index({ badge: { count: { register: 'r', label: 'x' } } })).valid).toBe(false)
	})
})
