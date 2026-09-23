/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What CnIndexPage may rewrite in `$route.query` when it persists the view.
 *
 * Two things the page has to get right while it owns the non-`_` namespace: a
 * key it never claimed as a filter stays where it is, and a filter that arrived
 * as an `@`-token goes back as the TOKEN. A resolved `?assignee=@me` written
 * back as a uid turns a shared link from "mine" into one named person's.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Case', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Case', properties: {} })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => ({ uid: 'ada' }),
}))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
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
}

const props = { title: 'Cases', register: 'dossiq', schema: 'case' }

/**
 * @param {object} query The starting `$route.query`.
 * @return {{wrapper: object, replace: jest.Mock}} The wrapper and the replace mock.
 */
function mountPage(query) {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData: props,
		stubs,
		mocks: {
			$route: { params: {}, query },
			$router: { push: jest.fn(), replace },
		},
	})
	return { wrapper, replace }
}

/**
 * @param {jest.Mock} replace The `$router.replace` mock.
 * @return {object} The query of the last navigation it was handed.
 */
function lastQuery(replace) {
	return replace.mock.calls[replace.mock.calls.length - 1][0].query
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

beforeEach(() => {
	mockStore.registerObjectType.mockClear()
	mockStore.fetchCollection.mockClear()
	mockStore.collections = {}
	mockStore.loading = {}
	mockStore.pagination = {}
})

describe('CnIndexPage — what a persist may rewrite in the query', () => {
	it('keeps a key it never adopted as a filter', async () => {
		// The page adopts the non-`_` keys present at mount. A param a host adds
		// afterwards was never its to clear.
		const { wrapper, replace } = mountPage({})
		await settle()
		wrapper.vm.$route.query.highlight = '42'

		wrapper.vm.persistViewStateToRoute({ filters: { status: 'open' }, search: '', sortKeys: [] })

		expect(lastQuery(replace)).toMatchObject({ highlight: '42', status: 'open' })
		wrapper.unmount()
	})

	it('clears a filter key it wrote on the previous persist', async () => {
		const { wrapper, replace } = mountPage({})
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: { status: 'open' }, search: '', sortKeys: [] })
		expect(lastQuery(replace).status).toBe('open')

		wrapper.vm.persistViewStateToRoute({ filters: {}, search: '', sortKeys: [] })
		expect(lastQuery(replace).status).toBeUndefined()
		wrapper.unmount()
	})

	it('clears a filter key it adopted from the query on load', async () => {
		const { wrapper, replace } = mountPage({ status: 'open' })
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: {}, search: '', sortKeys: [] })

		expect(lastQuery(replace).status).toBeUndefined()
		wrapper.unmount()
	})

	it('leaves reserved `_` keys alone', async () => {
		const { wrapper, replace } = mountPage({ _tab: 'files' })
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: { status: 'open' }, search: '', sortKeys: [] })

		expect(lastQuery(replace)._tab).toBe('files')
		wrapper.unmount()
	})
})

describe('CnIndexPage — @-token deep links keep their spelling', () => {
	it('writes the token back while it still resolves to the active value', async () => {
		const { wrapper, replace } = mountPage({ assignee: '@me' })
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: { assignee: 'ada' }, search: 'x', sortKeys: [] })

		expect(lastQuery(replace).assignee).toBe('@me')
		wrapper.unmount()
	})

	it('writes the literal once the filter no longer matches the token', async () => {
		// Picking a different person off the facet is a real change of filter,
		// and the link has to start meaning that person.
		const { wrapper, replace } = mountPage({ assignee: '@me' })
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: { assignee: 'bob' }, search: '', sortKeys: [] })

		expect(lastQuery(replace).assignee).toBe('bob')
		wrapper.unmount()
	})

	it('leaves a plain literal filter exactly as it is', async () => {
		const { wrapper, replace } = mountPage({ status: 'open' })
		await settle()

		wrapper.vm.persistViewStateToRoute({ filters: { status: 'closed' }, search: '', sortKeys: [] })

		expect(lastQuery(replace).status).toBe('closed')
		wrapper.unmount()
	})

	it('writes a chained sort as one _order entry per key, in order', async () => {
		const { wrapper, replace } = mountPage({})
		await settle()

		wrapper.vm.persistViewStateToRoute({
			filters: {},
			search: '',
			sortKeys: [{ key: 'status', order: 'asc' }, { key: 'created', order: 'desc' }],
		})

		expect(lastQuery(replace)._order).toBe('[{"key":"status","order":"asc"},{"key":"created","order":"desc"}]')
		wrapper.unmount()
	})
})

describe('CnIndexPage — clearing after a saved view has been applied', () => {
	// The reported bug, end to end. Applying a view used to leave the address
	// in a state nothing on the page could undo: its filter keys were never
	// recorded as the page's own, so a later clear had nothing to delete them
	// by, and its sort was written in a spelling the clear had never heard of.
	it('leaves nothing of the view in the address', async () => {
		const { wrapper, replace } = mountPage({})
		await settle()

		wrapper.vm.onApplySavedView({
			id: 7,
			query: { filters: { status: 'open' }, search: 'dakkapel', sort: [{ key: 'title', order: 'desc' }] },
		})
		await settle()

		expect(lastQuery(replace)).toEqual({
			status: 'open',
			_search: 'dakkapel',
			_order: '[{"key":"title","order":"desc"}]',
		})

		wrapper.vm.onClearFilters()
		await settle()

		expect(lastQuery(replace)).toEqual({})
		wrapper.unmount()
	})

	it('applies a stored single-object sort, so a view saved before chaining still sorts', async () => {
		const { wrapper, replace } = mountPage({})
		await settle()

		wrapper.vm.onApplySavedView({
			id: 8,
			query: { filters: {}, search: '', sort: { key: 'created', order: 'desc' } },
		})
		await settle()

		expect(lastQuery(replace)._order).toBe('[{"key":"created","order":"desc"}]')
		expect(wrapper.vm.list.sortKeys.value).toEqual([{ key: 'created', order: 'desc' }])
		wrapper.unmount()
	})
})
