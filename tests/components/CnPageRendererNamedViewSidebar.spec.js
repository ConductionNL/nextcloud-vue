/**
 * Tests for CnPageRenderer's per-page sidebarComponent.
 *
 * Covers REQ-MNVS from the `manifest-named-view-sidebar` change:
 * `pages[].sidebarComponent` (sibling of `config`) drives a
 * reactive `cnPageSidebarComponent` provide channel that resolves
 * the name against the effective `customComponents` registry. The
 * holder's `.value` is the resolved component or null.
 *
 * The flag composes deterministically with the existing
 * `pages[].sidebar.show` visibility gate (visibility wins; a
 * console.warn fires when both are set).
 */

import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const SearchSidebarStub = {
	name: 'SearchSidebarStub',
	template: '<div class="search-sidebar-stub">search-sidebar</div>',
}

const PageStub = {
	name: 'PageStub',
	template: '<div class="page-stub">page</div>',
}

const manifestFixture = {
	version: '1.1.0',
	menu: [],
	pages: [
		{
			id: 'search',
			route: '/search',
			type: 'custom',
			title: 'Search',
			component: 'SearchPage',
			sidebarComponent: 'SearchSideBar',
		},
		{
			id: 'plain',
			route: '/plain',
			type: 'custom',
			title: 'Plain',
			component: 'SearchPage',
		},
		{
			id: 'unknown-sidebar',
			route: '/unknown',
			type: 'custom',
			title: 'Unknown',
			component: 'SearchPage',
			sidebarComponent: 'NotInRegistry',
		},
		{
			id: 'hidden-with-sidebar',
			route: '/hidden',
			type: 'custom',
			title: 'Hidden',
			component: 'SearchPage',
			sidebarComponent: 'SearchSideBar',
			sidebar: { show: false },
		},
	],
}

function mountRenderer(routeName, customComponents = {}) {
	return shallowMount(CnPageRenderer, {
		provide: {
			cnManifest: manifestFixture,
			cnCustomComponents: {
				SearchPage: PageStub,
				SearchSideBar: SearchSidebarStub,
				...customComponents,
			},
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: routeName } },
	})
}

describe('CnPageRenderer — per-page sidebarComponent (REQ-MNVS)', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('cnPageSidebarComponent provide channel', () => {
		it('resolves a registered sidebarComponent and pushes it into the holder', () => {
			const wrapper = mountRenderer('search')
			expect(wrapper.vm.pageSidebarComponent.value).toBe(SearchSidebarStub)
		})

		it('leaves the holder null when no sidebarComponent is set', () => {
			const wrapper = mountRenderer('plain')
			expect(wrapper.vm.pageSidebarComponent.value).toBeNull()
		})

		it('logs a console.warn and leaves the holder null when the registry name is missing', () => {
			const wrapper = mountRenderer('unknown-sidebar')
			expect(wrapper.vm.pageSidebarComponent.value).toBeNull()
			// Filter to warns mentioning the missing key — other unrelated
			// warnings (none expected here, but defensive) MUST NOT fail
			// the assertion.
			const matched = warnSpy.mock.calls.find(([msg]) =>
				typeof msg === 'string' && msg.includes('NotInRegistry') && msg.includes('unknown-sidebar'),
			)
			expect(matched).toBeTruthy()
		})

		it('falls back to the default holder when the page has no sidebarComponent', () => {
			const wrapper = mountRenderer('plain')
			// Inspecting the provide() return mirrors what a descendant
			// inject would observe.
			const provided = wrapper.vm.$options.provide.call(wrapper.vm)
			expect(provided.cnPageSidebarComponent).toBe(wrapper.vm.pageSidebarComponent)
			expect(provided.cnPageSidebarComponent.value).toBeNull()
		})

		it('updates when the route changes between pages', () => {
			// First mount on a plain page, then re-mount on the search
			// page (mocked $route can't be mutated mid-life without a
			// real router instance, so re-mount is the canonical test
			// shape — same pattern as CnPageRendererCustomSidebar).
			const plain = mountRenderer('plain')
			expect(plain.vm.pageSidebarComponent.value).toBeNull()

			const search = mountRenderer('search')
			expect(search.vm.pageSidebarComponent.value).toBe(SearchSidebarStub)
		})
	})

	describe('precedence with sidebar.show', () => {
		it('still resolves the sidebarComponent when sidebar.show is false (visibility wins downstream)', () => {
			const wrapper = mountRenderer('hidden-with-sidebar')
			// The renderer keeps the resolved component in the holder so
			// downstream consumers can inspect it; CnAppRoot's
			// `cnPageSidebarVisible` gate suppresses rendering at the
			// slot level. See REQ-MNVS-4.
			expect(wrapper.vm.pageSidebarComponent.value).toBe(SearchSidebarStub)
			expect(wrapper.vm.pageSidebarVisible.value).toBe(false)
		})

		it('logs a console.warn about dead config when both sidebar.show: false and sidebarComponent are set', () => {
			mountRenderer('hidden-with-sidebar')
			const matched = warnSpy.mock.calls.find(([msg]) =>
				typeof msg === 'string'
				&& msg.includes('hidden-with-sidebar')
				&& msg.includes('sidebar.show')
				&& msg.includes('sidebarComponent'),
			)
			expect(matched).toBeTruthy()
		})

		it('does NOT log the dead-config warning on pages without sidebarComponent', () => {
			mountRenderer('plain')
			const matched = warnSpy.mock.calls.find(([msg]) =>
				typeof msg === 'string' && msg.includes('Visibility wins'),
			)
			expect(matched).toBeFalsy()
		})
	})

	describe('default holder defaults', () => {
		it('initial pageSidebarComponent.value is null before any page resolves', () => {
			// data() returns the initial holder shape; the watcher fires
			// `immediate: true` so by mount time it's already populated,
			// but the data initializer is the contract for the inject
			// default.
			const data = CnPageRenderer.data()
			expect(data.pageSidebarComponent).toEqual({ value: null })
		})
	})
})
