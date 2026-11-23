/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view applied from the address keeps its `savedView` key while the
 * list shows that view (dossiq /cases?savedView=default:my-work). Applying the
 * view selects its sort option, which went through the sort handler and
 * rewrote the address without the key; the route watcher then left the view
 * and the page fell back to every case. A sort or a search keeps the key, as
 * the same view's records are shown; a filter change still leaves it. The key
 * was also read as a record filter on load, so the first write of the view's
 * own filters deleted it.
 *
 * @spec openspec/changes/saved-view-kept-in-route/specs/saved-view-kept-in-route/spec.md#requirement-the-address-keeps-naming-the-applied-view
 */

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
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn().mockResolvedValue({ data: { results: [] } }), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'pieter' })) }))

const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { resolveQueryFilters } = require('../../src/utils/routeFilters.js')

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnIcon: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
}

const DEFAULTS = [
	{ slug: 'my-work', name: 'My work', filters: { assignee: 'pieter' }, overrides: { sortOption: 'deadline', viewMode: 'cards' } },
]
const SORTS = [{ value: 'deadline', label: 'Deadline', order: 'deadline' }, { value: 'newest', label: 'Newest', order: '-created' }]

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Mount the page on /cases?savedView=default:my-work.
 *
 * @return {{wrapper: object, replace: jest.Mock}} The page and the replace mock.
 */
function mountOnView() {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'dossiq', schema: 'case', allowSavedViews: true, defaultSavedViews: DEFAULTS, sortSelectOptions: SORTS },
		stubs,
		mocks: {
			$route: { name: 'Cases', params: {}, query: { savedView: 'default:my-work' } },
			$router: { push: jest.fn(), replace },
		},
	})
	return { wrapper, replace }
}

const lastQuery = (replace) => replace.mock.calls[replace.mock.calls.length - 1][0].query

describe('CnIndexPage keeps the applied view in the address', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('keeps savedView after applying the view and its sort option', async () => {
		const { wrapper, replace } = mountOnView()
		await flush()
		wrapper.vm.applySavedViewFromRoute()
		await flush()
		expect(wrapper.vm.appliedSavedViewId).toBe('default:my-work')
		expect(replace).toHaveBeenCalled()
		for (const [arg] of replace.mock.calls) {
			expect(arg.query.savedView).toBe('default:my-work')
		}
		expect(lastQuery(replace).assignee).toBeDefined()
	})

	it('keeps savedView when the reader sorts or searches within the view', async () => {
		const { wrapper, replace } = mountOnView()
		await flush()
		wrapper.vm.applySavedViewFromRoute()
		await flush()
		wrapper.vm.onSortEvent({ key: 'created', order: 'desc', keys: [{ key: 'created', order: 'desc' }] })
		expect(lastQuery(replace).savedView).toBe('default:my-work')
		wrapper.vm.onSearchEvent('fietspad')
		expect(lastQuery(replace).savedView).toBe('default:my-work')
	})

	it('does not read savedView as a record filter', async () => {
		const { wrapper } = mountOnView()
		await flush()
		expect(wrapper.vm.persistedFilterKeys).not.toContain('savedView')
		expect(resolveQueryFilters({ savedView: 'default:my-work', status: 'open' }, {})).toEqual({ status: 'open' })
	})

	it('drops savedView when the reader changes a filter', async () => {
		const { wrapper, replace } = mountOnView()
		await flush()
		wrapper.vm.applySavedViewFromRoute()
		await flush()
		wrapper.vm.onFilterEvent({ key: 'assignee', values: [] })
		expect(lastQuery(replace).savedView).toBeUndefined()
	})

	it('adds no savedView to an address that did not name the view', async () => {
		const replace = jest.fn(() => Promise.resolve())
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Cases', register: 'dossiq', schema: 'case', allowSavedViews: true, defaultSavedViews: DEFAULTS, sortSelectOptions: SORTS },
			stubs,
			mocks: { $route: { name: 'Cases', params: {}, query: {} }, $router: { push: jest.fn(), replace } },
		})
		await flush()
		wrapper.vm.onApplySavedView(wrapper.vm.defaultFilterViews[0])
		await flush()
		for (const [arg] of replace.mock.calls) {
			expect(arg.query.savedView).toBeUndefined()
		}
	})
})
