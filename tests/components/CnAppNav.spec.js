/**
 * Tests for CnAppNav.
 *
 * Covers REQ-JMR-004 from the json-manifest-renderer spec — manifest
 * menu rendering, ordering, permission filtering, label resolution
 * via the injected translate function, active-route highlighting,
 * one-level nested children, the standalone props-vs-inject fallback
 * path, and the `visibleIf.appInstalled` nav filter.
 */

// Mock `@nextcloud/capabilities` before loading CnAppNav so that the
// `isAppInstalled` utility (imported by CnAppNav) can have its
// `getCapabilities` call intercepted.
jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))

const { getCapabilities } = require('@nextcloud/capabilities')

// Import the cache-reset helper so each test starts with a clean slate.
const { __resetAppInstalledCacheForTests } = require('../../src/utils/appInstalled.js')

import { mount } from '@vue/test-utils'
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'

const baseManifest = {
	version: '1.0.0',
	pages: [],
	menu: [
		{ id: 'b', label: 'app.b', route: 'b', order: 2 },
		{ id: 'a', label: 'app.a', route: 'a', order: 1 },
		{ id: 'no-order', label: 'app.no-order', route: 'no-order' },
		{
			id: 'c',
			label: 'app.c',
			route: 'c',
			order: 3,
			children: [
				{ id: 'c1', label: 'app.c1', route: 'c1' },
				{ id: 'c2', label: 'app.c2', route: 'c2', permission: 'admin' },
			],
		},
		{ id: 'admin', label: 'app.admin', route: 'admin', order: 4, permission: 'admin' },
	],
}

function mountNav({
	manifest = baseManifest,
	permissions = [],
	useProps = false,
	routeName = 'a',
	routePath,
	translate,
	openUserSettings,
} = {}) {
	const provide = useProps
		? {}
		: {
				cnManifest: manifest,
				cnTranslate: translate ?? ((k) => k),
				...(openUserSettings ? { cnOpenUserSettings: openUserSettings } : {}),
			}
	const propsData = {
		permissions,
		...(useProps
			? {
					manifest,
					translate: translate ?? ((k) => k),
				}
			: {}),
	}
	return mount(CnAppNav, {
		propsData,
		provide,
		mocks: {
			$route: { name: routeName, path: routePath },
		},
	})
}

// Manifest with two independent, prefix-sharing namespaces (`/pos` and
// `/pos/tender-types`) plus a detail route under `/pos`, to exercise
// active-route disambiguation.
const posManifest = {
	version: '1.0.0',
	pages: [
		{ id: 'pos', route: '/pos' },
		{ id: 'posTenderTypes', route: '/pos/tender-types' },
		{ id: 'posDetail', route: '/pos/:id' },
	],
	menu: [
		{ id: 'pos', label: 'POS', route: 'pos', order: 1 },
		{ id: 'posTenderTypes', label: 'Tender types', route: 'posTenderTypes', order: 2 },
	],
}

describe('CnAppNav', () => {
	beforeEach(() => {
		// Reset the isAppInstalled per-page-load cache between tests so
		// each test controls its own OC.appswebroots / capabilities state.
		__resetAppInstalledCacheForTests()
		getCapabilities.mockReset()
		// Default: no apps visible via capabilities.
		getCapabilities.mockReturnValue({})
		// Default: no OC.appswebroots.
		delete global.OC
	})

	describe('ordering', () => {
		it('renders top-level items sorted by ascending `order`, with unordered items last', () => {
			const wrapper = mountNav()
			const ids = wrapper.vm.visibleItems.map((item) => item.id)
			// permissions=[] means no permission gating → all items render.
			// Order by `order` ascending: a(1), b(2), c(3), admin(4), then unordered.
			expect(ids).toEqual(['a', 'b', 'c', 'admin', 'no-order'])
		})
	})

	describe('label resolution', () => {
		it('resolves labels via the injected translate function', () => {
			const translate = jest.fn((key) => key.split('.').pop())
			mountNav({ translate })
			expect(translate).toHaveBeenCalledWith('app.a')
			expect(translate).toHaveBeenCalledWith('app.b')
		})

		it('uses the props-supplied translate when no inject is available', () => {
			const translate = jest.fn((key) => `[t]${key}`)
			mountNav({ useProps: true, translate })
			expect(translate).toHaveBeenCalledWith('app.a')
		})
	})

	describe('permission filtering', () => {
		it('hides items whose permission is not in the permissions prop', () => {
			const wrapper = mountNav({ permissions: ['user'] })
			const ids = wrapper.vm.visibleItems.map((item) => item.id)
			expect(ids).not.toContain('admin')
		})

		it('shows items with matching permission', () => {
			const wrapper = mountNav({ permissions: ['admin'] })
			const ids = wrapper.vm.visibleItems.map((item) => item.id)
			expect(ids).toContain('admin')
		})

		it('renders all items when the permissions prop is empty (default)', () => {
			const wrapper = mountNav()
			const ids = wrapper.vm.visibleItems.map((item) => item.id)
			expect(ids).toContain('admin')
		})

		it('filters children by permission too', () => {
			const wrapper = mountNav({ permissions: ['user'] })
			const c = wrapper.vm.visibleItems.find((i) => i.id === 'c')
			const childIds = wrapper.vm.visibleChildren(c).map((ch) => ch.id)
			expect(childIds).toEqual(['c1'])
		})
	})

	describe('active route', () => {
		it('marks the item whose route equals $route.name as active', () => {
			const wrapper = mountNav({ routeName: 'b' })
			expect(wrapper.vm.isActive({ route: 'b' })).toBe(true)
			expect(wrapper.vm.isActive({ route: 'a' })).toBe(false)
		})

		it('returns false when item has no route', () => {
			const wrapper = mountNav()
			expect(wrapper.vm.isActive({ id: 'noroute' })).toBe(false)
		})

		// Regression: an ancestor-namespace entry (`/pos`) must NOT light up
		// when a sibling route that merely shares its prefix is active
		// (`/pos/tender-types`), since they are independent menu items.
		it('does not mark a prefix-sharing sibling namespace as active', () => {
			const wrapper = mountNav({
				manifest: posManifest,
				routeName: 'posTenderTypes',
				routePath: '/pos/tender-types',
			})
			expect(wrapper.vm.isActive({ route: 'posTenderTypes' })).toBe(true)
			expect(wrapper.vm.isActive({ route: 'pos' })).toBe(false)
		})

		// A genuine nested detail route (no menu entry of its own) still lights
		// up its index entry via the longest-prefix `activeRouteName` resolution.
		it('marks the index entry active for its own nested detail route', () => {
			const wrapper = mountNav({
				manifest: posManifest,
				routeName: 'posDetail',
				routePath: '/pos/42',
			})
			expect(wrapper.vm.isActive({ route: 'pos' })).toBe(true)
			expect(wrapper.vm.isActive({ route: 'posTenderTypes' })).toBe(false)
		})

		// An ancestor entry overruled by a more specific sibling owner must use
		// exact matching so the router-link's inclusive active state can't
		// independently light it up.
		it('forces exact matching on an ancestor namespace owned by a more specific sibling', () => {
			const wrapper = mountNav({
				manifest: posManifest,
				routeName: 'posTenderTypes',
				routePath: '/pos/tender-types',
			})
			expect(wrapper.vm.isExact({ route: 'pos' })).toBe(true)
			// The owner itself keeps inclusive matching.
			expect(wrapper.vm.isExact({ route: 'posTenderTypes' })).toBe(false)
		})

		// Backwards compatible: an index entry on its OWN nested route (no
		// dedicated menu entry) keeps inclusive matching so it still lights up.
		it('keeps inclusive matching for an index entry on its own nested detail route', () => {
			const wrapper = mountNav({
				manifest: posManifest,
				routeName: 'posDetail',
				routePath: '/pos/42',
			})
			expect(wrapper.vm.isExact({ route: 'pos' })).toBe(false)
		})
	})

	describe('children rendering', () => {
		it('returns child items when present', () => {
			const wrapper = mountNav()
			const c = wrapper.vm.visibleItems.find((i) => i.id === 'c')
			expect(wrapper.vm.visibleChildren(c)).toHaveLength(2)
		})

		it('returns an empty array when item has no children', () => {
			const wrapper = mountNav()
			const a = wrapper.vm.visibleItems.find((i) => i.id === 'a')
			expect(wrapper.vm.visibleChildren(a)).toEqual([])
		})
	})

	describe('props vs inject', () => {
		it('uses manifest prop when provided', () => {
			const customManifest = {
				version: '1.0.0',
				pages: [],
				menu: [{ id: 'only', label: 'app.only' }],
			}
			const wrapper = mountNav({ manifest: customManifest, useProps: true })
			expect(wrapper.vm.visibleItems).toEqual([{ id: 'only', label: 'app.only' }])
		})

		it('falls back to injected manifest when no prop given', () => {
			const wrapper = mountNav()
			expect(wrapper.vm.effectiveManifest).toEqual(baseManifest)
		})
	})

	describe('defensive handling', () => {
		it('handles a manifest with no menu array', () => {
			const wrapper = mountNav({ manifest: { version: '1.0.0', pages: [] }, useProps: true })
			expect(wrapper.vm.visibleItems).toEqual([])
		})
	})

	describe('visibleIf.appInstalled filter', () => {
		const crossAppManifest = {
			version: '1.0.0',
			pages: [],
			menu: [
				{ id: 'always', label: 'app.always', route: 'always', order: 1 },
				{
					id: 'view-in-mydash',
					label: 'scholiq.nav.viewInMydash',
					href: '/index.php/apps/mydash#scholiq-compliance',
					order: 2,
					visibleIf: { appInstalled: 'mydash' },
				},
			],
		}

		it('hides items where visibleIf.appInstalled names an app not in OC.appswebroots', () => {
			// mydash not installed: OC.appswebroots empty, capabilities empty.
			global.OC = { appswebroots: {} }
			getCapabilities.mockReturnValue({})

			const wrapper = mountNav({ manifest: crossAppManifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('always')
			expect(ids).not.toContain('view-in-mydash')
		})

		it('shows items where visibleIf.appInstalled names an app in OC.appswebroots', () => {
			global.OC = { appswebroots: { mydash: '/apps/mydash' } }
			getCapabilities.mockReturnValue({})

			const wrapper = mountNav({ manifest: crossAppManifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('always')
			expect(ids).toContain('view-in-mydash')
		})

		it('shows items where visibleIf.appInstalled is in capabilities (fallback path)', () => {
			// No OC.appswebroots, but capabilities advertise mydash.
			delete global.OC
			getCapabilities.mockReturnValue({ mydash: {} })

			const wrapper = mountNav({ manifest: crossAppManifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('view-in-mydash')
		})

		it('keeps items without visibleIf always visible (backwards-compatible)', () => {
			global.OC = { appswebroots: {} }
			getCapabilities.mockReturnValue({})

			const wrapper = mountNav({ manifest: crossAppManifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('always')
		})

		it('hides conditional children when the named app is not installed', () => {
			const manifest = {
				version: '1.0.0',
				pages: [],
				menu: [
					{
						id: 'parent',
						label: 'app.parent',
						order: 1,
						children: [
							{ id: 'child-always', label: 'app.child-always', route: 'ca' },
							{
								id: 'child-mydash',
								label: 'app.child-mydash',
								href: '/index.php/apps/mydash',
								visibleIf: { appInstalled: 'mydash' },
							},
						],
					},
				],
			}
			global.OC = { appswebroots: {} }
			getCapabilities.mockReturnValue({})

			const wrapper = mountNav({ manifest, useProps: true })
			const parent = wrapper.vm.visibleItems.find((i) => i.id === 'parent')
			const childIds = wrapper.vm.visibleChildren(parent).map((c) => c.id)
			expect(childIds).toContain('child-always')
			expect(childIds).not.toContain('child-mydash')
		})

		it('shows conditional children when the named app is installed', () => {
			const manifest = {
				version: '1.0.0',
				pages: [],
				menu: [
					{
						id: 'parent',
						label: 'app.parent',
						order: 1,
						children: [
							{ id: 'child-always', label: 'app.child-always', route: 'ca' },
							{
								id: 'child-mydash',
								label: 'app.child-mydash',
								href: '/index.php/apps/mydash',
								visibleIf: { appInstalled: 'mydash' },
							},
						],
					},
				],
			}
			global.OC = { appswebroots: { mydash: '/apps/mydash' } }
			getCapabilities.mockReturnValue({})

			const wrapper = mountNav({ manifest, useProps: true })
			const parent = wrapper.vm.visibleItems.find((i) => i.id === 'parent')
			const childIds = wrapper.vm.visibleChildren(parent).map((c) => c.id)
			expect(childIds).toContain('child-always')
			expect(childIds).toContain('child-mydash')
		})

		it('passesVisibleIf returns true when visibleIf is absent', () => {
			const wrapper = mountNav()
			expect(wrapper.vm.passesVisibleIf({ id: 'no-condition', label: 'x' })).toBe(true)
		})

		it('passesVisibleIf returns true when visibleIf is an empty object', () => {
			const wrapper = mountNav()
			expect(wrapper.vm.passesVisibleIf({ id: 'x', label: 'x', visibleIf: {} })).toBe(true)
		})
	})

	describe('visibleIf context-path predicates (user.* / runtime.*)', () => {
		const runtimeManifest = (runtime, extraMenu = []) => ({
			version: '1.0.0',
			pages: [],
			runtime,
			menu: [
				{ id: 'always', label: 'app.always', route: 'always', order: 1 },
				...extraMenu,
			],
		})

		it('hides an item when user.primaryRole is not in the allowed roles', () => {
			const manifest = runtimeManifest(
				{ user: { primaryRole: 'employee' } },
				[{
					id: 'compliance-dashboard',
					label: 'scholiq.nav.complianceDashboard',
					route: 'compliance-dashboard',
					order: 2,
					visibleIf: { 'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] } },
				}],
			)
			const wrapper = mountNav({ manifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('always')
			expect(ids).not.toContain('compliance-dashboard')
		})

		it('shows an item when user.primaryRole is in the allowed roles', () => {
			const manifest = runtimeManifest(
				{ user: { primaryRole: 'compliance-officer' } },
				[{
					id: 'compliance-dashboard',
					label: 'scholiq.nav.complianceDashboard',
					route: 'compliance-dashboard',
					order: 2,
					visibleIf: { 'user.primaryRole': { in: ['compliance-officer', 'hr-coordinator'] } },
				}],
			)
			const wrapper = mountNav({ manifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('compliance-dashboard')
		})

		it('hides an item when the boolean runtime flag is false', () => {
			const manifest = runtimeManifest(
				{ user: { isOverdueOnMandatoryTraining: false } },
				[{
					id: 'overdue-banner',
					label: 'scholiq.nav.overdue',
					route: 'overdue-courses',
					order: 2,
					visibleIf: { 'user.isOverdueOnMandatoryTraining': true },
				}],
			)
			const wrapper = mountNav({ manifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).not.toContain('overdue-banner')
		})

		it('shows an item when the boolean runtime flag is true', () => {
			const manifest = runtimeManifest(
				{ user: { isOverdueOnMandatoryTraining: true } },
				[{
					id: 'overdue-banner',
					label: 'scholiq.nav.overdue',
					route: 'overdue-courses',
					order: 2,
					visibleIf: { 'user.isOverdueOnMandatoryTraining': true },
				}],
			)
			const wrapper = mountNav({ manifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('overdue-banner')
		})

		it('hides an item (fail-safe) when runtime is absent and context predicates are declared', () => {
			const manifest = {
				version: '1.0.0',
				pages: [],
				// No `runtime` field — OR backend hasn't injected it yet.
				menu: [
					{ id: 'always', label: 'app.always', route: 'always', order: 1 },
					{
						id: 'compliance-dashboard',
						label: 'scholiq.nav.complianceDashboard',
						route: 'compliance-dashboard',
						order: 2,
						visibleIf: { 'user.primaryRole': { in: ['compliance-officer'] } },
					},
				],
			}
			const wrapper = mountNav({ manifest, useProps: true })
			const ids = wrapper.vm.visibleItems.map((i) => i.id)
			expect(ids).toContain('always')
			expect(ids).not.toContain('compliance-dashboard')
		})

		it('coexists with appInstalled — both conditions must pass', () => {
			// Item requires mydash installed AND user.primaryRole === 'compliance-officer'.
			const manifest = runtimeManifest(
				{ user: { primaryRole: 'compliance-officer' } },
				[{
					id: 'combined',
					label: 'scholiq.nav.combined',
					href: '/apps/mydash#scholiq',
					order: 2,
					visibleIf: {
						appInstalled: 'mydash',
						'user.primaryRole': { in: ['compliance-officer'] },
					},
				}],
			)
			// mydash IS installed, role IS correct → visible.
			global.OC = { appswebroots: { mydash: '/apps/mydash' } }
			const wrapperVisible = mountNav({ manifest, useProps: true })
			expect(wrapperVisible.vm.visibleItems.map((i) => i.id)).toContain('combined')

			// Reset and verify: mydash NOT installed → hidden despite correct role.
			__resetAppInstalledCacheForTests()
			global.OC = { appswebroots: {} }
			getCapabilities.mockReturnValue({})
			const wrapperHidden = mountNav({ manifest, useProps: true })
			expect(wrapperHidden.vm.visibleItems.map((i) => i.id)).not.toContain('combined')
		})

		it('filters children using context predicates too', () => {
			const manifest = runtimeManifest(
				{ user: { primaryRole: 'employee' } },
				[{
					id: 'parent',
					label: 'app.parent',
					order: 2,
					children: [
						{ id: 'child-always', label: 'app.child-always', route: 'ca' },
						{
							id: 'child-hr-only',
							label: 'app.child-hr',
							route: 'ch',
							visibleIf: { 'user.primaryRole': { in: ['hr-coordinator'] } },
						},
					],
				}],
			)
			const wrapper = mountNav({ manifest, useProps: true })
			const parent = wrapper.vm.visibleItems.find((i) => i.id === 'parent')
			const childIds = wrapper.vm.visibleChildren(parent).map((c) => c.id)
			expect(childIds).toContain('child-always')
			expect(childIds).not.toContain('child-hr-only')
		})
	})

	describe('action: "user-settings"', () => {
		const actionManifest = {
			version: '1.0.0',
			pages: [],
			menu: [
				{ id: 'home', label: 'app.home', route: 'home', order: 1 },
				{
					id: 'user-settings',
					label: 'app.settings',
					action: 'user-settings',
					section: 'settings',
					order: 99,
				},
			],
		}

		it('invokes the injected cnOpenUserSettings on click and prevents default', () => {
			const openUserSettings = jest.fn()
			const wrapper = mountNav({
				manifest: actionManifest,
				openUserSettings,
				routeName: 'home',
			})
			const event = { preventDefault: jest.fn() }
			wrapper.vm.onItemClick(actionManifest.menu[1], event)
			expect(openUserSettings).toHaveBeenCalledTimes(1)
			expect(event.preventDefault).toHaveBeenCalledTimes(1)
		})

		it('returns null for itemTo so vue-router does not navigate', () => {
			const wrapper = mountNav({ manifest: actionManifest, routeName: 'home' })
			expect(wrapper.vm.itemTo(actionManifest.menu[1])).toBeNull()
		})

		it('falls back to a no-op when no cnOpenUserSettings inject is provided', () => {
			const wrapper = mountNav({ manifest: actionManifest, routeName: 'home' })
			const event = { preventDefault: jest.fn() }
			expect(() => wrapper.vm.onItemClick(actionManifest.menu[1], event)).not.toThrow()
			expect(event.preventDefault).toHaveBeenCalledTimes(1)
		})

		it('does not open URLs for action items even if href is also set', () => {
			const openUserSettings = jest.fn()
			const item = {
				id: 'mixed',
				label: 'app.mixed',
				action: 'user-settings',
				href: 'https://example.com',
			}
			const wrapper = mountNav({
				manifest: { version: '1.0.0', pages: [], menu: [item] },
				openUserSettings,
				useProps: false,
			})
			const originalOpen = window.open
			window.open = jest.fn()
			wrapper.vm.onItemClick(item, { preventDefault: jest.fn() })
			expect(window.open).not.toHaveBeenCalled()
			expect(openUserSettings).toHaveBeenCalledTimes(1)
			window.open = originalOpen
		})

		it('returns null for itemHref so the anchor stays a router-link / button', () => {
			const wrapper = mountNav({ manifest: actionManifest, routeName: 'home' })
			expect(wrapper.vm.itemHref(actionManifest.menu[1])).toBeNull()
		})
	})

	describe('href menu items', () => {
		const hrefManifest = {
			version: '1.0.0',
			pages: [],
			menu: [
				{ id: 'home', label: 'app.home', route: 'home', order: 1 },
				{ id: 'docs', label: 'app.docs', href: 'https://docs.example.org/', order: 2 },
				{ id: 'shillinq', label: 'app.shillinq', href: '/index.php/apps/shillinq/', order: 3 },
			],
		}

		it('itemHref returns the href for an href item and null for a route item', () => {
			const wrapper = mountNav({ manifest: hrefManifest, routeName: 'home' })
			expect(wrapper.vm.itemHref(hrefManifest.menu[1])).toBe('https://docs.example.org/')
			expect(wrapper.vm.itemHref(hrefManifest.menu[0])).toBeNull()
		})

		it('itemTo returns null for href items so vue-router does not navigate', () => {
			const wrapper = mountNav({ manifest: hrefManifest, routeName: 'home' })
			expect(wrapper.vm.itemTo(hrefManifest.menu[1])).toBeNull()
		})

		// NcAppNavigationItem is stubbed in this suite, so the rendered
		// anchor (and its `target="_blank"` derivation for external URLs)
		// belongs to that component's own contract. Here we assert only
		// that CnAppNav forwards the real `href` through to it — the stub
		// reflects props as attributes — for both external and internal
		// destinations.
		it('forwards an external URL as the entry href', () => {
			const wrapper = mountNav({ manifest: hrefManifest, routeName: 'home' })
			const entry = wrapper.find('[data-testid="cn-nav-entry-docs"]')
			expect(entry.attributes('href')).toBe('https://docs.example.org/')
		})

		it('forwards an internal app path as the entry href', () => {
			const wrapper = mountNav({ manifest: hrefManifest, routeName: 'home' })
			const entry = wrapper.find('[data-testid="cn-nav-entry-shillinq"]')
			expect(entry.attributes('href')).toBe('/index.php/apps/shillinq/')
		})

		it('does not intercept the click with window.open (native navigation)', () => {
			const wrapper = mountNav({ manifest: hrefManifest, routeName: 'home' })
			const originalOpen = window.open
			window.open = jest.fn()
			wrapper.vm.onItemClick(hrefManifest.menu[1], { preventDefault: jest.fn() })
			expect(window.open).not.toHaveBeenCalled()
			window.open = originalOpen
		})
	})

	describe('three-section model (main / footer / settings foldout)', () => {
		const sectionManifest = {
			version: '1.0.0',
			pages: [],
			menu: [
				{ id: 'home', label: 'Home', route: 'home', order: 1 },
				{ id: 'docs', label: 'Documentation', href: 'https://x', section: 'footer', order: 10 },
				{ id: 'roadmap', label: 'Features & roadmap', route: 'roadmap', section: 'footer', order: 11 },
				{ id: 'forms', label: 'Forms', route: 'forms', section: 'settings', order: 20 },
				{ id: 'pipelines', label: 'Pipelines', route: 'pipelines', section: 'settings', order: 21 },
			],
		}

		it('splits items into main / footer / settings computeds', () => {
			const wrapper = mountNav({ manifest: sectionManifest, routeName: 'home' })
			expect(wrapper.vm.mainItems.map((i) => i.id)).toEqual(['home'])
			expect(wrapper.vm.footerItems.map((i) => i.id)).toEqual(['docs', 'roadmap'])
			expect(wrapper.vm.settingsItems.map((i) => i.id)).toEqual(['forms', 'pipelines'])
		})

		it('renders footer-section items in the #footer slot, outside the scroll list', () => {
			const wrapper = mountNav({ manifest: sectionManifest, routeName: 'home' })
			// Footer items live in the .cn-app-nav__footer-list <ul> inside
			// NcAppNavigation's #footer slot so they stay visible above the
			// settings foldout even when the main list overflows (the pinned
			// prop only bottom-pins while the list does not scroll).
			const footerList = wrapper.find('.cn-app-nav__footer-list')
			expect(footerList.exists()).toBe(true)
			expect(footerList.find('[data-testid="cn-nav-entry-docs"]').exists()).toBe(true)
			expect(footerList.find('[data-testid="cn-nav-entry-roadmap"]').exists()).toBe(true)
		})

		it('mounts the settings foldout with the settings items inside', () => {
			const wrapper = mountNav({ manifest: sectionManifest, routeName: 'home' })
			// showSettingsFoldout drives the foldout mount; the settings
			// entries rendering inside it is the observable proof (the dist
			// NcAppNavigationSettings component name isn't reliably matchable
			// via findComponent, so assert on its slot content instead).
			expect(wrapper.vm.showSettingsFoldout).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-forms"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-pipelines"]').exists()).toBe(true)
		})

		it('auto-prepends a Personal settings entry that invokes cnOpenUserSettings', () => {
			const openUserSettings = jest.fn()
			const wrapper = mountNav({ manifest: sectionManifest, routeName: 'home', openUserSettings })
			const personal = wrapper.find('[data-testid="cn-nav-personal-settings"]')
			expect(personal.exists()).toBe(true)
			wrapper.vm.onPersonalSettingsClick()
			expect(openUserSettings).toHaveBeenCalledTimes(1)
		})

		it('suppresses Personal settings when nav.includePersonalSettings is false', () => {
			const m = { ...sectionManifest, nav: { includePersonalSettings: false } }
			const wrapper = mountNav({ manifest: m, routeName: 'home' })
			expect(wrapper.vm.includePersonalSettings).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-personal-settings"]').exists()).toBe(false)
			// Foldout still mounts because there are settings items.
			expect(wrapper.vm.showSettingsFoldout).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-forms"]').exists()).toBe(true)
		})

		it('still mounts the foldout (Personal settings only) when there are no settings items', () => {
			const m = {
				version: '1.0.0',
				pages: [],
				menu: [
					{ id: 'home', label: 'Home', route: 'home', order: 1 },
					{ id: 'docs', label: 'Docs', href: 'https://x', section: 'footer', order: 10 },
				],
			}
			const wrapper = mountNav({ manifest: m, routeName: 'home' })
			// New semantics: foldout mounts whenever personal settings is on
			// (default), so every app shows a Settings gear + Personal settings.
			expect(wrapper.vm.showSettingsFoldout).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-personal-settings"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-docs"]').exists()).toBe(true)
		})

		it('fully suppresses the foldout only when no settings items AND includePersonalSettings is false', () => {
			const m = {
				version: '1.0.0',
				nav: { includePersonalSettings: false },
				pages: [],
				menu: [
					{ id: 'home', label: 'Home', route: 'home', order: 1 },
					{ id: 'docs', label: 'Docs', href: 'https://x', section: 'footer', order: 10 },
				],
			}
			const wrapper = mountNav({ manifest: m, routeName: 'home' })
			expect(wrapper.vm.showSettingsFoldout).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-personal-settings"]').exists()).toBe(false)
		})

		it('uses nav.settingsLabel override for the foldout label', () => {
			const m = { ...sectionManifest, nav: { settingsLabel: 'Beheer' } }
			const wrapper = mountNav({ manifest: m, routeName: 'home', translate: (k) => k })
			expect(wrapper.vm.settingsFoldoutLabel).toBe('Beheer')
		})

		it('items with no section still default to main', () => {
			const wrapper = mountNav({ manifest: sectionManifest, routeName: 'home' })
			expect(wrapper.vm.mainItems.every((i) => (i.section ?? 'main') === 'main')).toBe(true)
		})
	})

	describe('primary action', () => {
		const withPrimary = (primaryAction) => ({
			version: '1.0.0',
			pages: [],
			nav: { primaryAction },
			menu: [{ id: 'a', label: 'app.a', route: 'a', order: 1 }],
		})

		it('renders an NcAppNavigationNew when nav.primaryAction is declared', () => {
			const wrapper = mountNav({
				manifest: withPrimary({ label: 'app.new', icon: 'Plus', route: 'a' }),
				useProps: true,
				translate: (k) => k,
			})
			const btn = wrapper.find('[data-testid="cn-nav-primary-action"]')
			expect(btn.exists()).toBe(true)
			expect(wrapper.vm.primaryAction).toEqual({ label: 'app.new', icon: 'Plus', route: 'a' })
		})

		it('does not render a primary action when nav.primaryAction is absent', () => {
			const wrapper = mountNav({ useProps: true })
			expect(wrapper.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(false)
			expect(wrapper.vm.primaryAction).toBeNull()
		})

		it('the #primary-action slot overrides the manifest field', () => {
			const wrapper = mount(CnAppNav, {
				propsData: { manifest: withPrimary({ label: 'app.new', route: 'a' }), translate: (k) => k },
				mocks: { $route: { name: 'a' } },
				slots: { 'primary-action': '<button class="host-primary">Custom</button>' },
			})
			expect(wrapper.find('.host-primary').exists()).toBe(true)
			// The default NcAppNavigationNew fallback is not rendered.
			expect(wrapper.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(false)
		})

		it('emits primary-action-click and pushes the named route on click', () => {
			const push = jest.fn()
			const wrapper = mount(CnAppNav, {
				propsData: { manifest: withPrimary({ label: 'app.new', route: 'a' }), translate: (k) => k },
				mocks: { $route: { name: 'b' }, $router: { push } },
			})
			wrapper.vm.onPrimaryActionClick()
			expect(wrapper.emitted('primary-action-click')).toBeTruthy()
			expect(push).toHaveBeenCalledWith({ name: 'a' })
		})

		it('opens an external href in a new tab and does not navigate', () => {
			const push = jest.fn()
			const open = jest.spyOn(window, 'open').mockImplementation(() => {})
			const wrapper = mount(CnAppNav, {
				propsData: { manifest: withPrimary({ label: 'app.docs', href: 'https://example.test' }), translate: (k) => k },
				mocks: { $route: { name: 'a' }, $router: { push } },
			})
			wrapper.vm.onPrimaryActionClick()
			expect(open).toHaveBeenCalledWith('https://example.test', '_blank', 'noopener,noreferrer')
			expect(push).not.toHaveBeenCalled()
			open.mockRestore()
		})
	})

	describe('page-scoped primary action', () => {
		const buildManifest = ({ pageAction, navAction } = {}) => ({
			version: '1.0.0',
			pages: [
				{ id: 'a', route: '/a', type: 'index', title: 'A', ...(pageAction ? { primaryAction: pageAction } : {}) },
				{ id: 'b', route: '/b', type: 'index', title: 'B' },
			],
			...(navAction ? { nav: { primaryAction: navAction } } : {}),
			menu: [
				{ id: 'a', label: 'app.a', route: 'a' },
				{ id: 'b', label: 'app.b', route: 'b' },
			],
		})

		it('renders a page-scoped primaryAction when the active route matches', () => {
			const wrapper = mountNav({
				manifest: buildManifest({ pageAction: { id: 'create-a', label: '+ New A', icon: 'Plus' } }),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.activePrimaryAction).toEqual({ id: 'create-a', label: '+ New A', icon: 'Plus' })
			expect(wrapper.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(true)
		})

		it('falls back to nav.primaryAction when no page-level action is declared for the active route', () => {
			const wrapper = mountNav({
				manifest: buildManifest({ navAction: { id: 'app-create', label: '+ New', icon: 'Plus' } }),
				useProps: true,
				routeName: 'b',
			})
			expect(wrapper.vm.activePrimaryAction).toEqual({ id: 'app-create', label: '+ New', icon: 'Plus' })
		})

		it('page-scoped action wins over nav.primaryAction when both are declared', () => {
			const wrapper = mountNav({
				manifest: buildManifest({
					pageAction: { id: 'create-a', label: '+ New A', icon: 'Plus' },
					navAction: { id: 'app-create', label: '+ New', icon: 'Plus' },
				}),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.activePrimaryAction.id).toBe('create-a')
		})

		it('emits @primary-action with the resolved payload + page route name', () => {
			const wrapper = mountNav({
				manifest: buildManifest({ pageAction: { id: 'create-a', label: '+ New A', icon: 'Plus', payload: { presetId: 42 } } }),
				useProps: true,
				routeName: 'a',
			})
			wrapper.vm.onPrimaryActionClick()
			const events = wrapper.emitted('primary-action')
			expect(events).toBeTruthy()
			expect(events[0][0]).toMatchObject({ id: 'create-a', label: '+ New A', icon: 'Plus', payload: { presetId: 42 }, page: 'a' })
		})

		it('defaults the icon to Plus when the action omits an icon field', () => {
			const wrapper = mountNav({
				manifest: buildManifest({ pageAction: { id: 'create-a', label: '+ New A' } }),
				useProps: true,
				routeName: 'a',
			})
			// The computed exists and resolves to a non-null Vue component (Plus).
			expect(wrapper.vm.primaryActionIconComponent).toBeTruthy()
			expect(wrapper.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(true)
		})

		it('renders no primary-action button when neither page-scoped nor nav-root action is declared', () => {
			const wrapper = mountNav({
				manifest: buildManifest(),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.activePrimaryAction).toBeNull()
			expect(wrapper.find('[data-testid="cn-nav-primary-action"]').exists()).toBe(false)
		})
	})

	describe('counter badges', () => {
		const buildManifest = (menu, pages = []) => ({
			version: '1.0.0',
			pages,
			menu,
		})

		it('renders a literal positive integer count via NcCounterBubble', () => {
			const wrapper = mountNav({
				manifest: buildManifest([
					{ id: 'a', label: 'app.a', route: 'a', count: 42 },
				]),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.resolveCount({ id: 'a', label: 'app.a', route: 'a', count: 42 })).toBe(42)
			// NcCounterBubble renders its count in the DOM somewhere
			expect(wrapper.html()).toContain('42')
		})

		it('does not render a bubble when count is 0', () => {
			const item = { id: 'a', label: 'app.a', route: 'a', count: 0 }
			const wrapper = mountNav({
				manifest: buildManifest([item]),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.resolveCount(item)).toBeNull()
		})

		it('resolves count:"auto" from the injected cnMenuCounts map for an index-type page', () => {
			const item = { id: 'a', label: 'app.a', route: 'a', count: 'auto' }
			const wrapper = mount(CnAppNav, {
				propsData: {
					manifest: buildManifest(
						[item],
						[{ id: 'a', route: '/a', type: 'index', title: 'A', config: { register: 'decisions', schema: 'decision' } }],
					),
					translate: (k) => k,
				},
				provide: {
					cnMenuCounts: { decisions: { decision: 17 } },
				},
				mocks: { $route: { name: 'a' } },
			})
			expect(wrapper.vm.resolveCount(item)).toBe(17)
		})

		it('returns null and warns once when count:"auto" cannot resolve an index page', () => {
			const item = { id: 'a', label: 'app.a', route: 'a', count: 'auto' }
			const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const wrapper = mountNav({
				manifest: buildManifest([item], [{ id: 'a', route: '/a', type: 'detail', title: 'A' }]),
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.vm.resolveCount(item)).toBeNull()
			expect(warn).toHaveBeenCalledTimes(1)
			// Second call must not produce another warn (idempotent).
			wrapper.vm.resolveCount(item)
			expect(warn).toHaveBeenCalledTimes(1)
			warn.mockRestore()
		})

		it('returns null when count:"auto" but the store has no entry for the slug', () => {
			const item = { id: 'a', label: 'app.a', route: 'a', count: 'auto' }
			const wrapper = mount(CnAppNav, {
				propsData: {
					manifest: buildManifest(
						[item],
						[{ id: 'a', route: '/a', type: 'index', title: 'A', config: { register: 'decisions', schema: 'decision' } }],
					),
					translate: (k) => k,
				},
				provide: { cnMenuCounts: {} },
				mocks: { $route: { name: 'a' } },
			})
			expect(wrapper.vm.resolveCount(item)).toBeNull()
		})
	})

	describe('caption entries', () => {
		it('renders type:"caption" as NcAppNavigationCaption (not an NcAppNavigationItem)', () => {
			const wrapper = mountNav({
				manifest: {
					version: '1.0.0',
					pages: [],
					menu: [
						{ id: 'section-1', type: 'caption', label: 'Section', order: 1 },
						{ id: 'a', label: 'app.a', route: 'a', order: 2 },
					],
				},
				useProps: true,
				routeName: 'a',
			})
			expect(wrapper.find('[data-testid="cn-nav-caption-section-1"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-section-1"]').exists()).toBe(false)
		})
	})

	describe('allow-collapse + open', () => {
		it('passes allow-collapse=true to a parent with visible children', () => {
			const wrapper = mountNav({
				manifest: {
					version: '1.0.0',
					pages: [],
					menu: [
						{
							id: 'parent',
							label: 'app.p',
							route: 'parent',
							open: true,
							children: [{ id: 'child', label: 'app.c', route: 'child' }],
						},
					],
				},
				useProps: true,
				routeName: 'parent',
			})
			// The parent renders + has the child
			expect(wrapper.find('[data-testid="cn-nav-entry-parent"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-entry-child"]').exists()).toBe(true)
		})

		const groupManifest = {
			version: '1.0.0',
			pages: [],
			menu: [
				{
					id: 'group',
					label: 'app.group',
					children: [{ id: 'leaf', label: 'app.leaf', route: 'leaf' }],
				},
			],
		}

		it('toggles a route-less group open/closed on title click', async () => {
			// routeName is not the group's child, so the group starts collapsed
			// (no active child) — isolating the title-click toggle behaviour.
			const wrapper = mountNav({ manifest: groupManifest, useProps: true, routeName: 'home' })
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(false)
			const event = { preventDefault: jest.fn() }
			wrapper.vm.onItemClick(groupManifest.menu[0], event)
			expect(event.preventDefault).toHaveBeenCalled()
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(true)
			wrapper.vm.onItemClick(groupManifest.menu[0], event)
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(false)
		})

		it('does not toggle on title click when the item has a route', () => {
			const item = {
				id: 'parent',
				label: 'app.p',
				route: 'parent',
				children: [{ id: 'child', label: 'app.c', route: 'child' }],
			}
			const wrapper = mountNav({
				manifest: { version: '1.0.0', pages: [], menu: [item] },
				useProps: true,
				routeName: 'parent',
			})
			const event = { preventDefault: jest.fn() }
			wrapper.vm.onItemClick(item, event)
			// Routed parents navigate via :to — the click handler must not
			// hijack them into a collapse toggle.
			expect(event.preventDefault).not.toHaveBeenCalled()
			expect(wrapper.vm.isItemOpen(item)).toBe(false)
		})

		it('auto-expands a group when the active route is one of its children', () => {
			const wrapper = mountNav({ manifest: groupManifest, useProps: true, routeName: 'leaf' })
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(true)
		})

		it('lets a manual collapse override auto-expansion of the active group', () => {
			const wrapper = mountNav({ manifest: groupManifest, useProps: true, routeName: 'leaf' })
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(true)
			wrapper.vm.setItemOpen(groupManifest.menu[0], false)
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(false)
		})

		it('syncs chevron-driven update:open into local state', () => {
			const wrapper = mountNav({ manifest: groupManifest, useProps: true, routeName: 'leaf' })
			wrapper.vm.setItemOpen(groupManifest.menu[0], true)
			expect(wrapper.vm.isItemOpen(groupManifest.menu[0])).toBe(true)
		})

		it('seeds the open state from the manifest item.open until first interaction', () => {
			const openedGroup = {
				version: '1.0.0',
				pages: [],
				menu: [
					{
						id: 'group',
						label: 'app.group',
						open: true,
						children: [{ id: 'leaf', label: 'app.leaf', route: 'leaf' }],
					},
				],
			}
			const wrapper = mountNav({ manifest: openedGroup, useProps: true, routeName: 'leaf' })
			expect(wrapper.vm.isItemOpen(openedGroup.menu[0])).toBe(true)
			wrapper.vm.onItemClick(openedGroup.menu[0], { preventDefault: jest.fn() })
			expect(wrapper.vm.isItemOpen(openedGroup.menu[0])).toBe(false)
		})
	})

	describe('per-item pinned pass-through', () => {
		it('forwards pinned:true on a main-section item to the rendered NcAppNavigationItem', () => {
			const wrapper = mountNav({
				manifest: {
					version: '1.0.0',
					pages: [],
					menu: [{ id: 'pinned-one', label: 'app.p', route: 'p', pinned: true }],
				},
				useProps: true,
				routeName: 'p',
			})
			expect(wrapper.find('[data-testid="cn-nav-entry-pinned-one"]').exists()).toBe(true)
		})
	})

	describe('search slot pass-through', () => {
		it('forwards the host #search slot into NcAppNavigation', () => {
			const wrapper = mount(CnAppNav, {
				propsData: { manifest: { version: '1.0.0', pages: [], menu: [] }, translate: (k) => k },
				mocks: { $route: { name: 'a' } },
				slots: { search: '<div class="host-search">Search</div>' },
			})
			expect(wrapper.find('.host-search').exists()).toBe(true)
		})
	})

	describe('per-item actions slot pass-through', () => {
		it('renders content from item-${id}-actions slot inside the NcAppNavigationItem #actions slot', () => {
			const wrapper = mount(CnAppNav, {
				propsData: {
					manifest: {
						version: '1.0.0',
						pages: [],
						menu: [{ id: 'a', label: 'app.a', route: 'a' }],
					},
					translate: (k) => k,
				},
				mocks: { $route: { name: 'a' } },
				scopedSlots: { 'item-a-actions': '<button class="host-action">Do</button>' },
			})
			expect(wrapper.find('.host-action').exists()).toBe(true)
		})
	})
})
