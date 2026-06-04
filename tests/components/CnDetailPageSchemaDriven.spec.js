/**
 * Tests for CnDetailPage's schema-driven mode — covers the
 * `schema-driven-detail-page` openspec capability.
 *
 * Scope:
 *   - `resolvedObjectType` fuses `register`+`schema` into the canonical
 *     `${register}-${schema}` slug, with `objectType` winning on collision.
 *   - Mount in schema-driven mode (`register` + `schema` + `objectId` all
 *     set) calls `objectStore.registerObjectType` with the 4-arg signature
 *     and `objectStore.fetchObject(slug, id)` exactly once.
 *   - Subsequent `objectId` changes re-fetch.
 *   - The new top-level `sidebarTabs` prop publishes through
 *     `objectSidebarState.tabs`.
 *   - `beforeDestroy` resets `active = false` AND clears `tabs`.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function makeState() {
	return {
		active: false,
		open: true,
		objectType: '',
		objectId: '',
		title: '',
		subtitle: '',
		register: '',
		schema: '',
		hiddenTabs: [],
		tabs: undefined,
	}
}

function makeFakeStore() {
	return {
		objects: {},
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

describe('CnDetailPage — schema-driven mode', () => {
	describe('resolvedObjectType', () => {
		it('fuses register + schema into ${register}-${schema}', () => {
			const wrapper = mount(CnDetailPage, {
				propsData: { register: 'openbuilt', schema: 'application', objectId: 'a-1' },
			})
			expect(wrapper.vm.resolvedObjectType).toBe('openbuilt-application')
		})

		it('explicit objectType wins over register/schema fusion', () => {
			const wrapper = mount(CnDetailPage, {
				propsData: {
					objectType: 'legacy-slug',
					register: 'openbuilt',
					schema: 'application',
					objectId: 'a-1',
				},
			})
			expect(wrapper.vm.resolvedObjectType).toBe('legacy-slug')
		})

		it('returns empty string when neither pair is set', () => {
			const wrapper = mount(CnDetailPage, { propsData: {} })
			expect(wrapper.vm.resolvedObjectType).toBe('')
		})
	})

	describe('fetch lifecycle', () => {
		it('registers the type and fetches both object + schema on mount', async () => {
			const store = makeFakeStore()
			mount(CnDetailPage, {
				propsData: {
					register: 'openbuilt',
					schema: 'application',
					objectId: 'a-1',
					objectStore: store,
				},
			})
			// flush microtasks
			await Promise.resolve()
			expect(store.registerObjectType).toHaveBeenCalledWith(
				'openbuilt-application',
				'application',
				'openbuilt',
				{ registerSlug: 'openbuilt', schemaSlug: 'application' },
			)
			expect(store.fetchObject).toHaveBeenCalledWith('openbuilt-application', 'a-1')
			expect(store.fetchSchema).toHaveBeenCalledWith('openbuilt-application')
		})

		it('skips the fetch path when only register+schema are set (missing objectId)', () => {
			const store = makeFakeStore()
			mount(CnDetailPage, {
				propsData: {
					register: 'r',
					schema: 's',
					objectStore: store,
				},
			})
			expect(store.registerObjectType).not.toHaveBeenCalled()
			expect(store.fetchObject).not.toHaveBeenCalled()
		})

		it('refetches when objectId changes', async () => {
			const store = makeFakeStore()
			const wrapper = mount(CnDetailPage, {
				propsData: {
					register: 'r',
					schema: 's',
					objectId: 'first',
					objectStore: store,
				},
			})
			await Promise.resolve()
			expect(store.fetchObject).toHaveBeenLastCalledWith('r-s', 'first')

			await wrapper.setProps({ objectId: 'second' })
			expect(store.fetchObject).toHaveBeenLastCalledWith('r-s', 'second')
		})
	})

	describe('sidebarTabs publish', () => {
		it('top-level sidebarTabs prop propagates into objectSidebarState.tabs', () => {
			const state = makeState()
			const store = makeFakeStore()
			const tabs = [
				{ id: 'overview', label: 'Overview', widgets: [{ type: 'data' }] },
				{ id: 'manifest', label: 'Manifest', component: 'AppManifestTab' },
			]
			mount(CnDetailPage, {
				propsData: {
					register: 'openbuilt',
					schema: 'application',
					objectId: 'a-1',
					objectStore: store,
					sidebar: true,
					sidebarTabs: tabs,
				},
				provide: { objectSidebarState: state },
			})
			expect(state.active).toBe(true)
			expect(state.tabs).toBe(tabs)
			expect(state.objectType).toBe('openbuilt-application')
		})

		it('beforeDestroy resets active=false and clears tabs', () => {
			const state = makeState()
			const store = makeFakeStore()
			const wrapper = mount(CnDetailPage, {
				propsData: {
					register: 'r',
					schema: 's',
					objectId: 'o',
					objectStore: store,
					sidebar: true,
					sidebarTabs: [{ id: 'a', label: 'A' }],
				},
				provide: { objectSidebarState: state },
			})
			expect(state.active).toBe(true)
			wrapper.destroy()
			expect(state.active).toBe(false)
			expect(state.tabs).toBeUndefined()
		})
	})

	describe('legacy direct-mount compatibility', () => {
		it('mount with objectType (no register/schema) skips schema-driven fetch', () => {
			const store = makeFakeStore()
			mount(CnDetailPage, {
				propsData: {
					objectType: 'foo',
					objectId: '42',
					objectStore: store,
				},
			})
			expect(store.registerObjectType).not.toHaveBeenCalled()
			expect(store.fetchObject).not.toHaveBeenCalled()
		})
	})
})
