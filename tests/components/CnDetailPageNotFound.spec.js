/**
 * CnDetailPage on an address whose record does not exist: the schema-driven
 * fetch answers 404, and the page renders a not-found state with a way back
 * instead of a body, lifecycle menu and sidebar that each query the missing id.
 */

import { flushPromises, mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeState() {
	return { active: false, open: true, objectType: '', objectId: '', tabs: undefined, hiddenTabs: [] }
}

/**
 * A store whose fetchObject resolves on demand, so tests can inspect the
 * page while the fetch is in flight.
 *
 * @param {object|null} record The record to answer with, or null for a 404.
 */
function makeStore(record) {
	let settle
	const store = {
		objects: {},
		schemas: {},
		errors: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(function(slug) {
			store.objectTypeRegistry = { ...store.objectTypeRegistry, [slug]: {} }
		}),
		getError(type) {
			return store.errors[type] || null
		},
		fetchObject: jest.fn((type, id) => new Promise((resolve) => {
			settle = () => {
				if (record) {
					store.objects = { ...store.objects, [type]: { [id]: record } }
				} else {
					store.errors = { ...store.errors, [type]: { status: 404, message: 'not found' } }
				}
				resolve(record)
			}
		})),
		fetchSchema: jest.fn(async () => null),
		settle: () => settle(),
	}
	return store
}

function mountPage(store, extra = {}) {
	const push = jest.fn(() => Promise.resolve())
	const state = makeState()
	const wrapper = mount(CnDetailPage, {
		propsData: {
			register: 'pipelinq',
			schema: 'salesContract',
			objectId: 'missing-id',
			objectStore: store,
			sidebar: { show: true },
			sidebarTabs: [{ id: 'audit', label: 'Audit' }],
			lifecycleActions: { field: 'status' },
			...extra,
		},
		provide: { objectSidebarState: state },
		mocks: { $route: { query: {} }, $router: { push, back: jest.fn() } },
		stubs: { CnLifecycleActions: { template: '<div data-testid="lifecycle-stub" />' } },
	})
	return { wrapper, push, state }
}

describe('CnDetailPage: record not found', () => {
	it('keeps the body, lifecycle menu and sidebar unmounted while the record loads', async () => {
		const store = makeStore(null)
		const { wrapper, state } = mountPage(store)
		await flushPromises()

		expect(wrapper.find('.cn-detail-page__loading').exists()).toBe(true)
		expect(wrapper.find('.cn-detail-page__body').exists()).toBe(false)
		expect(wrapper.find('[data-testid="lifecycle-stub"]').exists()).toBe(false)
		expect(state.active).toBe(false)
	})

	it('renders the not-found state instead of the header and body on a 404', async () => {
		const store = makeStore(null)
		const { wrapper, state } = mountPage(store)
		store.settle()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-detail-page-not-found"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-header"]').exists()).toBe(false)
		expect(wrapper.find('.cn-detail-page__body').exists()).toBe(false)
		expect(wrapper.find('[data-testid="lifecycle-stub"]').exists()).toBe(false)
		expect(state.active).toBe(false)
	})

	it('sends the back button to notFoundRoute, labelled with its page', async () => {
		const store = makeStore(null)
		const { wrapper, push } = mountPage(store, {
			notFoundRoute: { name: 'Contracts' },
			notFoundRouteLabel: 'Contracts',
		})
		store.settle()
		await flushPromises()

		const button = wrapper.find('[data-testid="cn-detail-page-not-found-back"]')
		expect(button.text()).toContain('Back to Contracts')
		await button.trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'Contracts' })
	})

	it('falls back to the app root without a notFoundRoute', async () => {
		const store = makeStore(null)
		const { wrapper, push } = mountPage(store)
		store.settle()
		await flushPromises()

		const button = wrapper.find('[data-testid="cn-detail-page-not-found-back"]')
		expect(button.text()).toContain('Back to home')
		await button.trigger('click')
		expect(push).toHaveBeenCalledWith({ path: '/' })
	})

	it('renders the page normally once an existing record arrives', async () => {
		const store = makeStore({ id: 'missing-id', title: 'Real contract' })
		const { wrapper, state } = mountPage(store)
		store.settle()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-detail-page-not-found"]').exists()).toBe(false)
		expect(wrapper.find('.cn-detail-page__body').exists()).toBe(true)
		expect(wrapper.find('[data-testid="lifecycle-stub"]').exists()).toBe(true)
		expect(state.active).toBe(true)
	})
})
