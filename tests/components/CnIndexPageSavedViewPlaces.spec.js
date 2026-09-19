/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage when its saved views are places (saved-view-as-a-place).
 *
 * The page under test is the same page: nothing here is a new page type. What
 * changes is where a view lives. Applying one GOES somewhere, an address that
 * names a view renders that view, a link written before views had addresses
 * still lands, and a view that has gone says so instead of rendering an empty
 * list that reads as "no cases".
 *
 * The last one is the assertion that matters most and the easiest to fake: a
 * missing view and an empty result produce the same table. The test therefore
 * reads the copy, not the row count.
 *
 * @spec openspec/changes/saved-view-as-a-place/specs/saved-views-ui/spec.md
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => path,
}))
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'alice' })),
}))

const { mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const stubs = {
	CnDataTable: true,
	CnCardGrid: true,
	CnPagination: true,
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
	CnIcon: true,
}

const overdue = {
	id: 1,
	uuid: 'uuid-1',
	name: 'Overdue',
	owner: 'alice',
	isPublic: false,
	favoredBy: [],
	presentation: { viewType: 'table' },
	query: { filters: { status: 'open' }, search: '', sort: null },
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

const PLACES = { enabled: true, routeBase: 'views' }

/**
 * Mount the page, optionally on a view address.
 *
 * @param {object} propsData Props to merge in.
 * @param {object} route The `$route` to mock.
 * @return {object} The wrapper.
 */
function mountPage(propsData = {}, route = { params: {}, query: {} }) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			register: 'procest',
			schema: { slug: 'case', properties: {} },
			objects: [],
			allowSavedViews: true,
			...propsData,
		},
		stubs,
		mocks: {
			$route: { name: 'Cases', ...route },
			$router: { push: jest.fn().mockReturnValue(Promise.resolve()), replace: jest.fn().mockReturnValue(Promise.resolve()) },
		},
	})
}

describe('CnIndexPage — a saved view is a place', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [overdue], total: 1 } })
	})

	it('goes to the view instead of rewriting the query when the page declares places', async () => {
		const wrapper = mountPage({ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view' })
		await flush()
		await wrapper.findAll('[data-testid="cn-saved-views-item"]').at(0).trigger('click')
		expect(wrapper.vm.$router.push).toHaveBeenCalledWith({
			name: 'Cases__view',
			params: { viewId: '1' },
			query: { status: 'open' },
		})
		expect(wrapper.vm.$router.replace).not.toHaveBeenCalled()
	})

	it('keeps rewriting the query on a page that declares no places', async () => {
		const wrapper = mountPage()
		await flush()
		await wrapper.findAll('[data-testid="cn-saved-views-item"]').at(0).trigger('click')
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({ query: { status: 'open' } })
		expect(wrapper.vm.$router.push).not.toHaveBeenCalled()
	})

	it('sends a link written as ?view=1 to the view route, keeping the rest of the query', async () => {
		const wrapper = mountPage(
			{ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view' },
			{ params: {}, query: { view: '1', _page: '2' } },
		)
		await flush()
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({
			name: 'Cases__view',
			params: { viewId: '1' },
			query: { _page: '2' },
		})
	})

	it('renders the view an address names, writing its stored state into the query', async () => {
		const wrapper = mountPage(
			{ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view', savedViewId: '1' },
			{ name: 'Cases__view', params: { viewId: '1' }, query: {} },
		)
		await flush()
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({
			name: 'Cases__view',
			params: { viewId: '1' },
			query: { status: 'open' },
		})
		expect(wrapper.vm.missingSavedViewId).toBe('')
	})

	it('opens in the presentation the view declares, falling through to what the page renders', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ ...overdue, presentation: { viewType: 'cards' } }], total: 1 } })
		const wrapper = mountPage(
			{ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view', savedViewId: '1', availableViewModes: ['table', 'cards'] },
			{ name: 'Cases__view', params: { viewId: '1' }, query: { status: 'open' } },
		)
		await flush()
		expect(wrapper.vm.currentViewMode).toBe('cards')
	})

	it('names the view that is gone rather than showing an empty list', async () => {
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		const wrapper = mountPage(
			{ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view', savedViewId: '9', emptyText: 'No cases' },
			{ name: 'Cases__view', params: { viewId: '9' }, query: {} },
		)
		await flush()
		expect(wrapper.vm.missingSavedViewId).toBe('9')
		// The copy, not the row count: an empty list and a view that has gone
		// look identical, and only one of them is the reader's own doing.
		expect(wrapper.vm.resolvedEmptyText).toContain('9')
		expect(wrapper.vm.resolvedEmptyText).not.toBe('No cases')
	})

	it('offers a pin only where a view has somewhere to be pinned to', async () => {
		const withPlaces = mountPage({ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view' })
		await flush()
		expect(withPlaces.findAll('[data-testid="cn-saved-views-pin"]').length).toBe(1)

		const without = mountPage()
		await flush()
		expect(without.findAll('[data-testid="cn-saved-views-pin"]').length).toBe(0)
	})

	it('pins by patching the favourite list OpenRegister already keeps', async () => {
		axios.patch.mockResolvedValue({ data: { view: { ...overdue, favoredBy: ['alice'] } } })
		const wrapper = mountPage({ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view' })
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-pin"]').trigger('click')
		await flush()
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/views/1', { favoredBy: ['alice'] })
		expect(wrapper.vm.savedViews[0].favoredBy).toEqual(['alice'])
		expect(wrapper.emitted('pin-view')).toBeTruthy()
	})

	it('unpins the same way, and leaves the view itself alone', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ ...overdue, favoredBy: ['alice', 'bob'] }], total: 1 } })
		axios.patch.mockResolvedValue({ data: { view: { ...overdue, favoredBy: ['bob'] } } })
		const wrapper = mountPage({ savedViewPlaces: PLACES, savedViewRouteName: 'Cases__view' })
		await flush()
		await wrapper.find('[data-testid="cn-saved-views-pin"]').trigger('click')
		await flush()
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/views/1', { favoredBy: ['bob'] })
		expect(axios.delete).not.toHaveBeenCalled()
		expect(wrapper.vm.savedViews).toHaveLength(1)
	})
})
