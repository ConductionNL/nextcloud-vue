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
	translate,
} = {}) {
	const provide = useProps
		? {}
		: {
				cnManifest: manifest,
				cnTranslate: translate ?? ((k) => k),
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
			$route: { name: routeName },
		},
	})
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
})
