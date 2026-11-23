/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A sort option that names an endpoint `source` (DqAanMijToegewezen's
 * Urgency), offered in the index sidebar's Sort section and chosen by its
 * value: the endpoint's rows in its order, searched, filtered and paged in
 * the browser; the option's own order when the endpoint fails; a column
 * header in the table view leaving it; and the carried fields on the rows of
 * the other orders.
 *
 * @spec openspec/changes/sidebar-sort-source/specs/index-page/spec.md#requirement-a-sort-option-can-take-its-rows-from-an-endpoint
 */

const mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => `/index.php${path}`,
}))

const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Task', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Task', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mount } = require('@vue/test-utils')
const { h } = require('vue')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

// CnIndexPage renders the quick-filter bar into CnActionsBar's `#filters`
// slot, so the auto-stub must render NAMED slots for the bar to exist at all.
// VTU v1's `true` stub rendered `$options._renderChildren`, and Vue 2.6
// compiled a scope-less `<template #filters>` into ordinary children tagged
// `slot="filters"` — so named slots came along for free. In Vue 3 every slot
// is a function on `slots`, and VTU v2's auto-stub renders the DEFAULT slot
// only (`renderStubDefaultSlot`); a `#filters` subtree silently never mounts.
const CnActionsBarStub = {
	name: 'CnActionsBar',
	setup(props, { slots }) {
		return () => h('div', { class: 'cn-actions-bar-stub' }, Object.keys(slots).map((name) => slots[name]()))
	},
}

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: CnActionsBarStub,
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
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
	NcSelect: true,
}

/**
 * @param {object} propsData Component props.
 * @param {object} [route] Mocked `$route`.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData, route) {
	return mount(CnIndexPage, {
		propsData,
		stubs,
		mocks: { $route: route || { params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn(async () => {}) } },
	})
}

/**
 * Resolve next microtask + lib's await-then-await pattern.
 *
 * @return {Promise<void>}
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve))
}

const QUEUE = {
	items: [
		{ itemType: 'case', deadlineTier: 'overdue', case: { id: 'c2', title: 'Dijk', status: 's1' } },
		{ itemType: 'task', deadlineTier: 'warning', task: { id: 'k1' } },
		{ itemType: 'case', deadlineTier: 'normal', case: { id: 'c1', title: 'Eik', status: 's2' } },
	],
}

const urgency = {
	value: 'urgency',
	label: 'Urgency',
	default: true,
	order: 'deadline',
	source: { url: '/apps/x/api/work-queue', rowsPath: 'items', rowPath: 'case', carry: ['deadlineTier'], annotate: true, failedNote: 'Ordered by deadline.' },
}
const newest = { value: 'newest', label: 'Newest', order: '-startDate' }

beforeEach(() => {
	mockGet.mockReset()
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
})

describe('CnIndexPage — a sort option with an endpoint source', () => {
	it('opens on the default source option and lists its rows in its order', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] })
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/work-queue', { params: {} })
		expect(wrapper.vm.sortSource.value).toBe('urgency')
		expect(wrapper.vm.displayObjects.map((row) => row.id)).toEqual(['c2', 'c1'])
		expect(wrapper.vm.displayObjects[0].deadlineTier).toBe('overdue')
		expect(wrapper.vm.effectivePagination).toMatchObject({ page: 1, total: 2 })
	})

	it('searches, filters and pages the source rows in the browser', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] })
		await flush()
		await flush()
		wrapper.vm.list.searchTerm.value = 'eik'
		expect(wrapper.vm.displayObjects.map((row) => row.id)).toEqual(['c1'])
		wrapper.vm.list.searchTerm.value = ''
		wrapper.vm.list.activeFilters.value = { status: ['s1'] }
		expect(wrapper.vm.displayObjects.map((row) => row.id)).toEqual(['c2'])
	})

	it('falls back to the option\'s order and shows its note when the endpoint fails', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const wrapper = mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] })
		await flush()
		await flush()
		spy.mockRestore()
		expect(wrapper.vm.sortSourceFellBack).toBe(true)
		expect(wrapper.vm.sortSourceShown).toBe(false)
		expect(wrapper.vm.list.sortKeys.value).toEqual([{ key: 'deadline', order: 'asc' }])
		expect(wrapper.find('[data-testid="cn-index-sort-source-note"]').text()).toBe('Ordered by deadline.')
	})

	it('switches to the self-fetched list for an ordinary order, keeping the carried fields', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		mockStore.collections = {}
		const wrapper = mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] })
		await flush()
		await flush()
		wrapper.vm.onSidebarSortChange([{ key: 'startDate', order: 'desc' }], 'newest')
		await flush()
		expect(wrapper.vm.sortSourceShown).toBe(false)
		expect(wrapper.vm.list.sortKeys.value).toEqual([{ key: 'startDate', order: 'desc' }])
		expect(wrapper.vm.annotatingSource).toMatchObject({ rowPath: 'case' })
	})

	it('offers the source option in the Sort section as an order of its own', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage({ register: 'r', schema: 's', viewMode: 'cards', sortSelectOptions: [urgency, newest] })
		await flush()
		expect(wrapper.vm.sidebarSortOptions).toEqual([
			{ value: 'urgency', label: 'Urgency', keys: [], fixed: true },
			{ value: 'newest', label: 'Newest', keys: [{ key: 'startDate', order: 'desc' }] },
		])
	})

	it('chooses the source option by its value, as a saved view does', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage(
			{ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] },
			{ params: {}, query: { _order: JSON.stringify({ startDate: 'desc' }) } },
		)
		await flush()
		expect(wrapper.vm.sortSource.value).toBe('')
		expect(wrapper.vm.selectSortOption('urgency')).toBe(true)
		await flush()
		expect(wrapper.vm.sortSourceShown).toBe(true)
		expect(wrapper.vm.displayObjects.map((row) => row.id)).toEqual(['c2', 'c1'])
		expect(wrapper.vm.selectSortOption('missing')).toBe(false)
	})

	it('leaves the endpoint order for a column header\'s order in the table view', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage({ register: 'r', schema: 's', viewMode: 'table', sortSelectOptions: [urgency, newest] })
		await flush()
		await flush()
		expect(wrapper.vm.sortSourceShown).toBe(true)
		wrapper.vm.onSortEvent({ key: 'title', order: 'asc' })
		await flush()
		expect(wrapper.vm.sortSource.value).toBe('')
		expect(wrapper.vm.sortSourceShown).toBe(false)
	})

	it('does not open on the source when the address carries an order', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage(
			{ register: 'r', schema: 's', sortSelectOptions: [urgency, newest] },
			{ params: {}, query: { _order: JSON.stringify({ startDate: 'desc' }) } },
		)
		await flush()
		expect(wrapper.vm.sortSource.value).toBe('')
		// The annotating source is still read, for the pills on the other orders.
		expect(mockGet).toHaveBeenCalledTimes(1)
	})
})

describe('a carried field on the board card', () => {
	const { rowsFromSourceBody } = require('../../src/utils/sortSourceRows.js')
	const CnObjectCard = require('../../src/components/CnObjectCard/CnObjectCard.vue').default

	it('draws as the card\'s head pill through cardLayout', () => {
		const [row] = rowsFromSourceBody(QUEUE, urgency.source)
		const card = mount(CnObjectCard, {
			props: {
				object: row,
				schema: { title: 'Case', properties: { title: {} } },
				layout: { headPill: { field: 'deadlineTier', labels: { overdue: 'Te laat' }, colorMap: { overdue: 'error' } }, title: 'title' },
			},
			global: { provide: { cnLook: 'board', cnTranslate: (text) => text } },
		})
		const pill = card.find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toContain('Te laat')
	})
})

describe('a lens that asks the source for more (sourceParams)', () => {
	const lenses = [
		{ label: 'Own work', filter: {} },
		{ label: 'Including work you cover', activeLabel: 'Including work you cover', filter: {}, default: true, sourceParams: { covering: '1' } },
	]

	it('sends the active lens\'s sourceParams with the source request', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest], quickFilters: lenses })
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/work-queue', { params: { covering: '1' } })
	})

	it('asks the source again without them when the lens is left', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const wrapper = mountPage({ register: 'r', schema: 's', sortSelectOptions: [urgency, newest], quickFilters: lenses })
		await flush()
		await flush()
		mockGet.mockClear()
		wrapper.vm.onQuickFilterChange(0)
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/work-queue', { params: {} })
	})

	it('lets the option\'s own params stand beside the lens\'s', async () => {
		mockGet.mockResolvedValue({ data: QUEUE })
		const withParams = { ...urgency, source: { ...urgency.source, params: { scope: 'mine' } } }
		mountPage({ register: 'r', schema: 's', sortSelectOptions: [withParams, newest], quickFilters: lenses })
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/work-queue', { params: { scope: 'mine', covering: '1' } })
	})
})
