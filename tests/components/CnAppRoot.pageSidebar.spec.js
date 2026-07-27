/**
 * `pages[].sidebarComponent` — the manifest key that used to do nothing.
 *
 * CnPageRenderer *provides* `cnPageSidebarComponent` and CnAppRoot *injects*
 * it, but the renderer is CnAppRoot's descendant and provide/inject only flows
 * downward. The value could never reach the slot, so the key was dead config
 * for every app that tried it (#528).
 *
 * CnAppRoot now resolves it itself, from the routed manifest page. These tests
 * pin that behaviour, including the two ways it must decline.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const SidebarStub = {
	name: 'SidebarStub',
	template: '<aside class="resolved-sidebar">resolved</aside>',
}

/**
 * A registry entry carrying the metadata CnAppRoot's validator expects.
 *
 * @param {object} component The component.
 * @return {object} The registry.
 */
const registryWith = (component) => ({
	DetailSidebar: {
		kind: 'widget',
		component,
		defaultSize: { w: 1, h: 1 },
		minSize: { w: 1, h: 1 },
		maxSize: { w: 4, h: 4 },
		allowedSlots: ['sidebar'],
		propsSchema: {},
	},
})

const makeManifest = (page = {}) => ({
	id: 'testapp',
	name: 'Test App',
	menu: [],
	pages: [
		{
			id: 'Detail',
			type: 'custom',
			...page,
		},
	],
})

/**
 * Mount CnAppRoot with a stubbed route and the given manifest/registry.
 *
 * @param {object} manifest The manifest.
 * @param {object} registry The v2 component registry.
 * @param {string} routeName The current route name.
 * @return {object} The wrapper.
 */
const mountRoot = (manifest, extraProps = {}, routeName = 'Detail') => {
	// Nested inside a wrapper render function, and `mocks`/`stubs` at the top
	// level — this project is on @vue/test-utils v1, where `global.mocks` is
	// silently ignored and `$route` arrives undefined.
	return mount({
		render() {
			return h(CnAppRoot, {
				props: { manifest, appId: 'testapp', translate: (k) => k, requiresApps: [], ...extraProps },
			})
		},
	}, {
		mocks: { $route: { name: routeName, params: {} } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

describe('CnAppRoot page sidebar resolution', () => {
	it('renders the component a manifest page names', () => {
		const wrapper = mountRoot(
			makeManifest({ sidebarComponent: 'DetailSidebar' }),
			{ registry: registryWith(SidebarStub) },
		)

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(true)
	})

	it('renders nothing when the page names no sidebar', () => {
		const wrapper = mountRoot(makeManifest())

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(false)
	})

	it('renders nothing when the named component is not registered', () => {
		// A typo in the manifest must not throw — it renders nothing, the same
		// as an unset key.
		const wrapper = mountRoot(makeManifest({ sidebarComponent: 'NoSuchComponent' }))

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(false)
	})

	it('does not resolve a sidebar for a different route', () => {
		const wrapper = mountRoot(
			makeManifest({ sidebarComponent: 'DetailSidebar' }),
			{ registry: registryWith(SidebarStub) },
			'SomeOtherPage',
		)

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(false)
	})

	it('lets sidebar.show:false win over a declared sidebarComponent', () => {
		// A page declaring both is contradictory; suppressing the rail wins,
		// which is what CnPageRenderer already warns about.
		const wrapper = mountRoot(
			makeManifest({ sidebarComponent: 'DetailSidebar', sidebar: { show: false } }),
			{ registry: registryWith(SidebarStub) },
		)

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(false)
	})

	it('resolves through the legacy customComponents map too', () => {
		const wrapper = mountRoot(
			makeManifest({ sidebarComponent: 'DetailSidebar' }),
			{ customComponents: { DetailSidebar: SidebarStub } },
		)

		expect(wrapper.findComponent(SidebarStub).exists()).toBe(true)
	})
})
