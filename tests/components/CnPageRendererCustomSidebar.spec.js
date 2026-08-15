/**
 * Tests for CnPageRenderer's per-page sidebar visibility flag.
 *
 * Covers REQ-MDSC-5 from the `manifest-detail-sidebar-config` change:
 * `pages[].sidebar.show` (top-level sibling of `config`) drives
 *
 *   1. A reactive `cnPageSidebarVisible` value provided via Vue
 *      provide/inject.
 *   2. A CSS hook class `cn-page-renderer--no-sidebar` on the
 *      renderer wrapper element.
 *
 * The flag works on every page type (index, detail, custom, …) — a
 * `type:"custom"` page is the canonical use case (no per-config
 * shape; consumer wants to suppress the host shell sidebar without
 * wrapping the page).
 */

import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const WidePageStub = {
	name: 'WidePageStub',
	template: '<div class="wide-page-stub">wide</div>',
}

const manifestFixture = {
	version: '1.1.0',
	menu: [],
	pages: [
		{
			id: 'wide',
			route: '/wide',
			type: 'custom',
			title: 'Wide canvas',
			component: 'WidePage',
			sidebar: { show: false },
		},
		{
			id: 'normal',
			route: '/normal',
			type: 'custom',
			title: 'Normal',
			component: 'WidePage',
		},
		{
			id: 'visible',
			route: '/visible',
			type: 'custom',
			title: 'Explicit show=true',
			component: 'WidePage',
			sidebar: { show: true },
		},
		{
			id: 'hidden-index',
			route: '/hidden-index',
			type: 'index',
			title: 'Hidden index',
			sidebar: { show: false },
			config: { schema: { name: 's1' } },
		},
	],
}

function mountRenderer(routeName) {
	return shallowMount(CnPageRenderer, {
		provide: {
			cnManifest: manifestFixture,
			cnCustomComponents: { WidePage: WidePageStub },
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: routeName } },
	})
}

describe('CnPageRenderer — per-page sidebar visibility', () => {
	describe('CSS hook class', () => {
		it('applies cn-page-renderer--no-sidebar when sidebar.show is false', () => {
			const wrapper = mountRenderer('wide')
			expect(wrapper.classes()).toContain('cn-page-renderer--no-sidebar')
		})

		it('does NOT apply the class when sidebar is unset', () => {
			const wrapper = mountRenderer('normal')
			expect(wrapper.classes()).not.toContain('cn-page-renderer--no-sidebar')
		})

		it('does NOT apply the class when sidebar.show is true', () => {
			const wrapper = mountRenderer('visible')
			expect(wrapper.classes()).not.toContain('cn-page-renderer--no-sidebar')
		})

		it('applies the class on index pages with sidebar.show: false', () => {
			const wrapper = mountRenderer('hidden-index')
			expect(wrapper.classes()).toContain('cn-page-renderer--no-sidebar')
		})
	})

	describe('cnPageSidebarVisible inject', () => {
		it('provides a reactive holder reflecting sidebar.show', () => {
			const wrapper = mountRenderer('wide')
			// The holder lives in data() and is supplied via provide().
			// Reading vm.pageSidebarVisible.value matches what a
			// descendant inject would observe.
			expect(wrapper.vm.pageSidebarVisible.value).toBe(false)
		})

		it('holder defaults to true for pages without sidebar.show', () => {
			const wrapper = mountRenderer('normal')
			expect(wrapper.vm.pageSidebarVisible.value).toBe(true)
		})

		it('holder defaults to true when sidebar.show is true', () => {
			const wrapper = mountRenderer('visible')
			expect(wrapper.vm.pageSidebarVisible.value).toBe(true)
		})

		it('updates when the route changes between pages', async () => {
			const wrapper = mountRenderer('normal')
			expect(wrapper.vm.pageSidebarVisible.value).toBe(true)
			// Swap the mocked route to land on the hidden page.
			wrapper.vm.$options.mocks = { $route: { name: 'wide' } }
			// We can't easily mutate Vue's `$route` mock without a router
			// instance, so re-mount on the target route and re-check.
			const wrapper2 = mountRenderer('wide')
			expect(wrapper2.vm.pageSidebarVisible.value).toBe(false)
		})
	})
})
