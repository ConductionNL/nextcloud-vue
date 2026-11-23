const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `searchHandler` on CnIndexPage: a registry handler reads the search before
 * it is sent, and its note shows above the list.
 *
 * @spec openspec/changes/index-search-handler/specs/index-page/spec.md#requirement-a-registered-handler-can-read-the-search-before-it-is-sent
 */
const { reactive } = require('vue')

const mockStore = reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	errors: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn(() => Promise.resolve([])),
	fetchSchema: jest.fn(),
	getSchema: jest.fn(() => ({ title: 'Permit', properties: {} })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
	CnActionsBar: { template: '<div><slot name="after-search" /></div>' },
	CnContextMenu: true,
	CnRowActions: true,
	CnIndexSidebar: true,
	CnPageHeader: true,
	CnFormDialog: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	CnIcon: true,
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountPage(props = {}, registry = {}, route = { query: {}, params: {} }) {
	return mount(CnIndexPage, {
		propsData: { register: 'zaken', schema: 'permit', ...props },
		provide: { cnRegistry: registry },
		stubs,
		mocks: { $route: route, $router: { replace: jest.fn(() => Promise.resolve()) } },
	})
}

const lastParams = () => mockStore.fetchCollection.mock.calls.at(-1)[1] || {}

function phoneSearch(term) {
	return /^[0-9 +-]+$/.test(term)
		? { filters: { phoneE164: '+31612345678' }, note: 'Searching by phone number' }
		: null
}

describe('searchHandler', () => {
	beforeEach(() => mockStore.fetchCollection.mockClear())

	it('sends the handler\'s filters instead of _search and shows its note', async () => {
		const w = mountPage({ searchHandler: 'phoneSearch' }, { phoneSearch: { kind: 'handler', handler: phoneSearch } })
		await flush()
		w.vm.list.searchTerm.value = '06 1234 5678'
		await w.vm.list.refresh(1)
		await w.vm.$nextTick()
		expect(lastParams().phoneE164).toBe('+31612345678')
		expect(lastParams()._search).toBeUndefined()
		expect(w.find('[data-testid="cn-index-search-note"]').text()).toBe('Searching by phone number')
	})

	it('sends other text as typed with no note', async () => {
		const w = mountPage({ searchHandler: 'phoneSearch' }, { phoneSearch: { kind: 'handler', handler: phoneSearch } })
		await flush()
		w.vm.list.searchTerm.value = 'riolering'
		await w.vm.list.refresh(1)
		await w.vm.$nextTick()
		expect(lastParams()._search).toBe('riolering')
		expect(w.find('[data-testid="cn-index-search-note"]').exists()).toBe(false)
	})

	it('sends the term as typed when the handler is not registered', async () => {
		const w = mountPage({ searchHandler: 'missing' })
		await flush()
		w.vm.list.searchTerm.value = '06 1234 5678'
		await w.vm.list.refresh(1)
		expect(lastParams()._search).toBe('06 1234 5678')
	})
})
