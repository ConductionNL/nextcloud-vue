// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * CnIndexPage explains why a personal lens came back empty when the
 * response reports it unavailable (`@self.lenses.recent`, openregister#4514),
 * and keeps its own empty text otherwise.
 *
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-an-unavailable-lens-explains-its-empty-page
 */

const { reactive } = require('vue')

// What the next fetch reports, written into the store the way the real
// `fetchCollection` does: rows and the lens report together.
let mockNextLenses = {}

const mockStore = reactive({
	collections: {},
	loading: {},
	pagination: {},
	facets: {},
	lenses: {},
	errors: {},
	registerObjectType: jest.fn(),
	fetchCollection: jest.fn((type) => {
		mockStore.collections = { ...mockStore.collections, [type]: [] }
		mockStore.lenses = { ...mockStore.lenses, [type]: mockNextLenses }
		return Promise.resolve([])
	}),
	fetchSchema: jest.fn(),
	getSchema: jest.fn(() => ({ title: 'Case', properties: { title: { type: 'string' } } })),
})

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
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
	CnFormDialog: true,
	CnFavouriteToggle: true,
	NcLoadingIcon: true,
	CnEmptyContent: { props: ['name'], template: '<div class="empty-stub">{{ name }}</div>' },
	CnIcon: true,
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return mount(CnIndexPage, {
		propsData: { register: 'dossiq', schema: 'case', personalLenses: ['recent'], ...props },
		stubs,
		mocks: { $route: { query: {}, params: {} }, $router: { replace: jest.fn(() => Promise.resolve()) } },
	})
}

const emptyTitle = (w) => w.find('.empty-stub').text()

describe('CnIndexPage lens reason', () => {
	beforeEach(() => {
		mockStore.lenses = {}
		mockNextLenses = {}
	})

	it.each([
		['audit-trail-disabled', 'This server does not keep track of what you open.'],
		['anonymous', 'Log in to see what you opened recently.'],
		['read-history-unavailable', 'Your recent items are not available right now.'],
	])('explains %s in the empty state (self-fetch)', async (reason, text) => {
		mockNextLenses = { recent: { available: false, reason } }
		const w = mountPage()
		await flush()
		expect(emptyTitle(w)).toBe(text)
	})

	it('keeps the empty text without a report', async () => {
		const w = mountPage({ emptyText: 'No cases found' })
		await flush()
		expect(w.vm.lensReasonText).toBe('')
		expect(emptyTitle(w)).toBe('No cases found')
	})

	it('keeps the empty text when the lens is available', async () => {
		mockNextLenses = { recent: { available: true, reason: null } }
		const w = mountPage({ emptyText: 'No cases found' })
		await flush()
		expect(emptyTitle(w)).toBe('No cases found')
	})

	it('keeps the empty text for an unknown reason', async () => {
		mockNextLenses = { recent: { available: false, reason: 'something-new' } }
		const w = mountPage({ emptyText: 'No cases found' })
		await flush()
		expect(emptyTitle(w)).toBe('No cases found')
	})

	it('uses the app wording from lensReasonTexts', async () => {
		mockNextLenses = { recent: { available: false, reason: 'audit-trail-disabled' } }
		const w = mountPage({ lensReasonTexts: { 'recent.audit-trail-disabled': 'Deze server houdt niet bij welke zaken je opent.' } })
		await flush()
		expect(emptyTitle(w)).toBe('Deze server houdt niet bij welke zaken je opent.')
	})

	it('reads the lenses prop when the host fetches itself', async () => {
		const w = mount(CnIndexPage, {
			propsData: { objects: [], schema: { title: 'Case', properties: {} }, lenses: { recent: { available: false, reason: 'anonymous' } } },
			stubs,
			mocks: { $route: { query: {}, params: {} }, $router: { replace: jest.fn(() => Promise.resolve()) } },
		})
		await flush()
		expect(emptyTitle(w)).toBe('Log in to see what you opened recently.')
	})
})
