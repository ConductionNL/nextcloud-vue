/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saved views are on by default: every index page with a sidebar and a
 * source a view can be scoped to offers the Views tab without opting in,
 * `allowSavedViews: false` turns it off, and a page over a named source
 * scopes, lists and applies its views like a page over a schema.
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path) => path,
	generateOcsUrl: (path) => `/ocs/v2.php/${path}`,
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'alice' })) }))

const { flushPromises, mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const { pageOffersSavedViews, savedViewScope } = require('../../src/utils/savedViewHelpers.js')

const SIDEBAR = { enabled: true }
const caseView = { id: 1, name: 'Mine', owner: 'alice', '@self': { access: 'owner' }, query: { scope: 'procest/case', filters: { status: 'open' } } }
const taskView = { id: 2, name: 'Mine, urgent', owner: 'alice', '@self': { access: 'owner' }, query: { scope: 'source:users', filters: { group: 'fysiek' } } }

function mountPage(props = {}) {
	return mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'procest', schema: { slug: 'case', properties: {} }, objects: [], sidebar: SIDEBAR, ...props },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnPageHeader: true, CnIcon: true, CnContextMenu: true },
		mocks: { $route: { name: 'Cases', params: {}, query: {} }, $router: { push: jest.fn(), replace: jest.fn().mockReturnValue(Promise.resolve()) } },
	})
}

describe('pageOffersSavedViews', () => {
	it('is on for a page with a sidebar and a register and schema, unless switched off', () => {
		const page = { register: 'procest', schema: 'case', sidebar: SIDEBAR }
		expect(pageOffersSavedViews(page)).toBe(true)
		expect(pageOffersSavedViews({ ...page, allowSavedViews: false })).toBe(false)
		expect(pageOffersSavedViews({ ...page, allowSavedViews: null })).toBe(true)
	})

	it('is on for a page over a named source or with an explicit scope', () => {
		expect(pageOffersSavedViews({ entitySource: 'tasks', sidebar: SIDEBAR })).toBe(true)
		expect(pageOffersSavedViews({ savedViewsScope: 'inbox', sidebar: SIDEBAR })).toBe(true)
	})

	it('is off for a page with no sidebar or nothing to scope a view to, unless forced on', () => {
		expect(pageOffersSavedViews({ register: 'procest', schema: 'case' })).toBe(false)
		expect(pageOffersSavedViews({ register: 'procest', schema: 'case', sidebar: { enabled: true, show: false } })).toBe(false)
		expect(pageOffersSavedViews({ sidebar: SIDEBAR })).toBe(false)
		expect(pageOffersSavedViews({ allowSavedViews: true })).toBe(true)
		expect(pageOffersSavedViews(null)).toBe(false)
	})

	it('scopes a named source by its name, and a schema still wins', () => {
		expect(savedViewScope({ source: 'tasks' })).toBe('source:tasks')
		expect(savedViewScope({ register: 'procest', schema: 'case', source: 'tasks' })).toBe('procest/case')
	})
})

describe('CnIndexPage offers saved views without opting in', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { results: [caseView, taskView], total: 2 } })
	})

	it('lists the page\'s views in the sidebar panel and keeps the toolbar as it was', async () => {
		const w = mountPage()
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/views')
		expect(w.vm.savedViewsForSidebar).not.toBeNull()
		expect(w.vm.savedViewsForSidebar.views.map((v) => v.id)).toEqual([1])
		expect(w.find('[data-testid="cn-saved-views-panel"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-saved-views-control"]').exists()).toBe(false)
	})

	it('offers none when the page switches them off', async () => {
		const w = mountPage({ allowSavedViews: false })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalledWith('/apps/openregister/api/views')
		expect(w.vm.savedViewsForSidebar).toBeNull()
	})

	it('scopes, lists and applies the views of a page over a named source', async () => {
		const w = mountPage({
			register: '',
			schema: null,
			objects: undefined,
			entitySource: 'users',
			sidebar: { enabled: true, fields: { group: { type: 'string', facetable: true } } },
		})
		await flushPromises()
		expect(w.vm.savedViewsForSidebar.views.map((v) => v.id)).toEqual([2])

		w.vm.onApplySavedView(taskView)
		expect(w.vm.$router.replace).toHaveBeenCalled()
		expect(w.vm.namedActiveFilters).toEqual({ group: ['fysiek'] })

		axios.post.mockResolvedValue({ data: { view: { id: 3, name: 'New', owner: 'alice' } } })
		await w.vm.onSaveViewConfirm({ name: 'New', isPublic: false, sharedWith: [] })
		expect(axios.post.mock.calls[0][1].query.scope).toBe('source:users')
	})
})

describe('CnAppRoot offers the My views menu group', () => {
	it('for an app whose index pages offer saved views by default', () => {
		const offers = (pages) => CnAppRoot.computed.offersSavedViews.call({ manifest: { pages } })
		expect(offers([{ id: 'Cases', type: 'index', config: { register: 'procest', schema: 'case', sidebar: SIDEBAR } }])).toBe(true)
		expect(offers([{ id: 'Tasks', type: 'index', config: { entitySource: 'tasks', sidebar: SIDEBAR } }])).toBe(true)
		expect(offers([{ id: 'Cases', type: 'index', config: { register: 'procest', schema: 'case', sidebar: SIDEBAR, allowSavedViews: false } }])).toBe(false)
		expect(offers([{ id: 'Home', type: 'dashboard', config: { register: 'procest', schema: 'case', sidebar: SIDEBAR } }])).toBe(false)
	})
})
