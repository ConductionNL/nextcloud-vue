/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqWerkbord opened from a link that names a case type and a team must still
 * hide closed cases: `heldDefaultFilters` keeps those default keys while the
 * address names filters of its own, unless the address names the key itself.
 *
 * @spec openspec/changes/index-held-default-filters/specs/index-page/spec.md#requirement-a-held-default-filter-stays-under-a-links-own-filters
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

var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))

const { flushPromises, mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { heldDefaultFilters } = require('../../src/utils/routeFilters.js')

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: true,
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const DEFAULTS = { isFinalStatus: false, assignedGroup: 'team-woo' }
const HELD = ['isFinalStatus']

/**
 * @param {object} query The starting `$route.query`.
 * @param {object} [extra] More props.
 * @return {object} The wrapper.
 */
function mountPage(query, extra = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'dossiq', schema: 'case', defaultFilters: DEFAULTS, heldDefaultFilters: HELD, ...extra },
		stubs,
		mocks: {
			$route: { params: {}, query },
			$router: { push: jest.fn(), replace: jest.fn(() => Promise.resolve()) },
		},
	})
}

beforeEach(() => {
	mockStore.fetchCollection.mockClear()
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [] } })
})

describe('heldDefaultFilters on a register list', () => {
	it('keeps open cases only under a link that names a case type and a team', async () => {
		const wrapper = mountPage({ caseType: 'woo', assignedGroup: 'team-vth' })
		await flushPromises()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ isFinalStatus: false, caseType: 'woo', assignedGroup: 'team-vth' })
		const calls = mockStore.fetchCollection.mock.calls
		expect(calls[calls.length - 1][1].isFinalStatus).toBe(false)
	})

	it('shows closed cases when the link asks for them', async () => {
		const wrapper = mountPage({ caseType: 'woo', isFinalStatus: 'true' })
		await flushPromises()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ caseType: 'woo', isFinalStatus: 'true' })
	})

	it('drops the keys it does not hold, as before', async () => {
		const wrapper = mountPage({ caseType: 'woo' })
		await flushPromises()
		expect(wrapper.vm.effectiveActiveFilters).not.toHaveProperty('assignedGroup')
	})

	it('leaves a saved view to its own filters', async () => {
		const wrapper = mountPage({ savedView: 'default:all' })
		await flushPromises()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({})
	})

	it('changes nothing without held keys', async () => {
		const wrapper = mountPage({ caseType: 'woo' }, { heldDefaultFilters: null })
		await flushPromises()
		expect(wrapper.vm.effectiveActiveFilters).toEqual({ caseType: 'woo' })
	})
})

describe('heldDefaultFilters on a named source', () => {
	const SIDEBAR = { fields: { state: { title: 'State', facetable: true }, open: { title: 'Open', facetable: true } } }

	it('keeps a held default under the address\'s own filters', async () => {
		const wrapper = mountPage({ state: 'claimed' }, {
			register: undefined,
			schema: undefined,
			entitySource: 'endpoint',
			sourceConfig: { url: '/apps/x/api/tasks' },
			sidebar: SIDEBAR,
			columns: [{ key: 'title', label: 'Title' }],
			defaultFilters: { open: 'true', state: 'new' },
			heldDefaultFilters: ['open'],
		})
		await flushPromises()
		expect(wrapper.vm.namedActiveFilters).toEqual({ open: 'true', state: ['claimed'] })
	})
})

describe('heldDefaultFilters()', () => {
	it('picks the held keys the address leaves out', () => {
		expect(heldDefaultFilters(DEFAULTS, HELD, ['caseType'])).toEqual({ isFinalStatus: false })
		expect(heldDefaultFilters(DEFAULTS, HELD, ['isFinalStatus'])).toEqual({})
		expect(heldDefaultFilters(null, HELD, [])).toEqual({})
		expect(heldDefaultFilters(DEFAULTS, null, [])).toEqual({})
	})
})
