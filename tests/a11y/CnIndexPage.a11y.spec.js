/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnIndexPage` — the fleet's most-used
 * component (drives every list view: actions bar, view-mode toggle,
 * primary CTA, actions menu, table/card body, empty state). Mounts with
 * REAL sub-components (CnActionsBar, CnDataTable, CnPageHeader, ...) and
 * real `@nextcloud/vue` chrome so `axe-core` inspects the full page tree,
 * not stubs. Part of the `wcag-a11y-anchor` sample.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory can reference it. Mirrors
// the store shape used by the behavioural spec (tests/components/CnIndexPage.spec.js).
const mockStore = {
	collections: {}, loading: {}, pagination: {}, facets: {}, errors: {}, objects: {},
	registerObjectType: jest.fn(),
	unregisterObjectType: jest.fn(),
	fetchCollection: jest.fn().mockResolvedValue([]),
	fetchObject: jest.fn().mockResolvedValue(null),
	fetchSchema: jest.fn().mockResolvedValue({ title: 'Item', properties: {} }),
	getSchema: jest.fn(() => ({ title: 'Item', properties: {} })),
	saveObject: jest.fn().mockResolvedValue({ id: '1' }),
	deleteObject: jest.fn().mockResolvedValue(true),
	getCollection: jest.fn(() => []),
	isLoading: jest.fn(() => false),
	getError: jest.fn(() => null),
	getPagination: jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 })),
	setSearchTerm: jest.fn(),
	getSearchTerm: jest.fn(() => ''),
	getFacets: jest.fn(() => ({})),
	_options: { baseUrl: '/apps/openregister/api/objects' },
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const schema = { title: 'Item', properties: { name: { type: 'string', title: 'Name' } } }

/**
 * Mount CnIndexPage attached to document.body with the mocked router.
 *
 * @param {object} propsData Component props.
 * @return {object} Vue Test Utils wrapper.
 */
function mountPage(propsData = {}) {
	return mountAttached(CnIndexPage, {
		propsData: { title: 'Items', ...propsData },
		mocks: {
			$route: { params: {}, query: {}, name: 'items' },
			$router: { push: jest.fn(), replace: jest.fn() },
		},
	})
}

describe('CnIndexPage — accessibility', () => {
	let wrapper

	beforeEach(() => {
		mockStore.getCollection = jest.fn(() => [])
		mockStore.getPagination = jest.fn(() => ({ total: 0, page: 1, pages: 1, limit: 20 }))
	})

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations in the empty state', async () => {
		wrapper = mountPage()
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with a populated schema-driven table', async () => {
		mockStore.getCollection = jest.fn(() => [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		])
		mockStore.getPagination = jest.fn(() => ({ total: 2, page: 1, pages: 1, limit: 20 }))

		wrapper = mountPage({ schema })
		await wrapper.vm.$nextTick()

		await expectAccessible(wrapper)
	})
})
