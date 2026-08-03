/**
 * Tests for the generic admin-settings surface (`openbuild-admin-settings-abstraction`):
 *  - manifest-admin-settings: the admin dialog renders `manifest.adminSettings[]`
 *    sorted by `order` — the built-in `organisation-credentials` type maps to
 *    `CnCredentials scope="organisation"`, a `component` entry resolves from the
 *    v2 `registry` prop (mirroring CnBodySections/CnPageRenderer precedence);
 *    absent/empty `adminSettings` mounts no admin surface at all (no dialog,
 *    no nav entry).
 *  - admin-settings-owner-gating: `isOwner` gates the dialog + the CnAppNav
 *    "Admin settings" entry — PRIMARY via `manifest.runtime.user.isOwner`,
 *    FALLBACK via `openbuild.currentUserGroups` (loadState) intersected with
 *    owner GIDs parsed from the `permissions` prop. `OC.isUserAdmin()` alone
 *    does NOT unlock the surface. A section's `permission` narrows only.
 *
 * A custom `component` section's rendered content is asserted via
 * `wrapper.findComponent(...)` (reference-based), not raw HTML/class lookups
 * — mounting a plain component-options object through a reactive Vue prop
 * (`registry`/`customComponents`) makes `<component :is="...">` unreliable to
 * assert on by rendered DOM in this Vue 2 + @vue/test-utils harness (Vue's
 * observer instruments the object's own fields once it is nested in reactive
 * props); this is the same convention CnPageRenderer.spec.js already uses for
 * dynamically-resolved registry components (see e.g. "resolves type=custom
 * pages from the v2 cnRegistry").
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')) },
}))
jest.mock('@nextcloud/initial-state', () => ({
	loadState: jest.fn((app, key, fallback) => fallback),
}))

const { getCapabilities } = require('@nextcloud/capabilities')
const { loadState } = require('@nextcloud/initial-state')
const { __resetAppStatusCacheForTests } = require('../../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../../src/components/CnAppRoot/CnAppRoot.vue').default

const baseManifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

const AdminBilling = {
	name: 'AdminBilling',
	template: '<div class="admin-billing">Billing</div>',
}

/**
 * Mount helper. Stubs `router-view` and `CnCredentials` (which owns its own
 * network calls, exercised separately in CnCredentials.spec.js).
 *
 * @param {object} [options] Mount options.
 * @param {object} [options.manifest] Manifest override.
 * @param {Array<string>} [options.permissions] `permissions` prop.
 * @param {object} [options.registry] v2 `registry` prop (component resolution).
 * @return {import('@vue/test-utils').Wrapper}
 */
function mountRoot({ manifest = baseManifest, permissions = [], registry = {} } = {}) {
	return mount(CnAppRoot, {
		propsData: {
			manifest,
			appId: 'myapp',
			requiresApps: [],
			permissions,
			registry,
		},
		mocks: {
			$route: { name: 'home' },
		},
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnCredentials: true,
		},
	})
}

describe('CnAppRoot — generic admin-settings surface', () => {
	beforeEach(() => {
		getCapabilities.mockReset()
		getCapabilities.mockReturnValue({})
		loadState.mockReset()
		loadState.mockImplementation((app, key, fallback) => fallback)
		__resetAppStatusCacheForTests()
		global.OC = global.OC || {}
		global.OC.appswebroots = {}
		delete global.OC.isUserAdmin
	})

	describe('manifest-admin-settings — rendering + ordering', () => {
		const manifestWithSections = {
			...baseManifest,
			runtime: { user: { isOwner: true } },
			adminSettings: [
				{ id: 'org-credentials', type: 'organisation-credentials', label: 'Org credentials', order: 20 },
				{ id: 'billing', component: 'AdminBilling', label: 'Billing', order: 10 },
			],
		}

		it('mounts the admin dialog for an owner and renders both sections in order', async () => {
			const wrapper = mountRoot({
				manifest: manifestWithSections,
				registry: { AdminBilling: { kind: 'section', component: AdminBilling } },
			})
			expect(wrapper.vm.isOwner).toBe(true)
			expect(wrapper.vm.hasAdminSettings).toBe(true)
			// order:10 (billing) before order:20 (org-credentials)
			expect(wrapper.vm.sortedAdminSettings.map((s) => s.id)).toEqual(['billing', 'org-credentials'])

			wrapper.vm.adminSettingsOpen = true
			await wrapper.vm.$nextTick()
			expect(wrapper.find('#org-credentials').exists()).toBe(true)
			expect(wrapper.find('#billing').exists()).toBe(true)
			expect(wrapper.findComponent({ name: 'CnCredentials' }).exists()).toBe(true)
			expect(wrapper.findComponent({ name: 'CnCredentials' }).props('scope')).toBe('organisation')
			expect(wrapper.findComponent(AdminBilling).exists()).toBe(true)
		})

		it('renders no admin nav entry or dialog when adminSettings is absent', async () => {
			const wrapper = mountRoot({ manifest: { ...baseManifest, runtime: { user: { isOwner: true } } } })
			expect(wrapper.vm.isOwner).toBe(true)
			expect(wrapper.vm.hasAdminSettings).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
			wrapper.vm.adminSettingsOpen = true
			await wrapper.vm.$nextTick()
			expect(wrapper.find('#org-credentials').exists()).toBe(false)
		})

		it('renders no admin nav entry or dialog when adminSettings is an empty array', () => {
			const wrapper = mountRoot({ manifest: { ...baseManifest, runtime: { user: { isOwner: true } }, adminSettings: [] } })
			expect(wrapper.vm.hasAdminSettings).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
		})
	})

	describe('admin-settings-owner-gating', () => {
		const manifestWithOrgCredentials = {
			...baseManifest,
			adminSettings: [
				{ id: 'org-credentials', type: 'organisation-credentials', label: 'Org credentials' },
			],
		}

		// ADR-079: the nav's "Admin settings" entry moved off `isOwner` onto
		// `isAdmin` and became a LINK to /settings/admin/<app>. Owning an app is
		// not administering the instance, so the owner signals below still
		// compute `isOwner` correctly — they simply no longer surface that entry.
		// CnAppNav.spec.js carries the matching positive case and the
		// owner-who-is-not-admin negative control.
		it('computes isOwner from runtime.user.isOwner but no longer surfaces the nav entry', () => {
			const wrapper = mountRoot({
				manifest: { ...manifestWithOrgCredentials, runtime: { user: { isOwner: true } } },
			})
			expect(wrapper.vm.isOwner).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
		})

		it('computes isOwner from the currentUserGroups ∩ permissions.owners fallback without surfacing the nav entry', () => {
			loadState.mockImplementation((app, key, fallback) => (
				app === 'openbuild' && key === 'currentUserGroups' ? ['owners'] : fallback
			))
			const wrapper = mountRoot({
				manifest: manifestWithOrgCredentials,
				permissions: ['group:owners'],
			})
			expect(wrapper.vm.isOwner).toBe(true)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
		})

		it('hides the admin surface for a non-owner (no group intersection, no runtime signal)', () => {
			loadState.mockImplementation((app, key, fallback) => (
				app === 'openbuild' && key === 'currentUserGroups' ? ['some-other-group'] : fallback
			))
			const wrapper = mountRoot({
				manifest: manifestWithOrgCredentials,
				permissions: ['group:owners'],
			})
			expect(wrapper.vm.isOwner).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
		})

		it('does NOT unlock the admin surface on the NC super-admin flag alone', () => {
			global.OC.isUserAdmin = () => true
			loadState.mockImplementation((app, key, fallback) => (
				app === 'openbuild' && key === 'currentUserGroups' ? [] : fallback
			))
			const wrapper = mountRoot({ manifest: manifestWithOrgCredentials })
			expect(wrapper.vm.isOwner).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
		})

		it('narrows (never widens) a section via its permission field, within the owner gate', async () => {
			loadState.mockImplementation((app, key, fallback) => (
				app === 'openbuild' && key === 'currentUserGroups' ? ['owners'] : fallback
			))
			const manifest = {
				...baseManifest,
				adminSettings: [
					{ id: 'org-credentials', type: 'organisation-credentials', label: 'Org credentials' },
					{ id: 'billing', component: 'AdminBilling', label: 'Billing', permission: 'group:billing-only' },
				],
			}
			const wrapper = mountRoot({
				manifest,
				permissions: ['group:owners'],
				registry: { AdminBilling: { kind: 'section', component: AdminBilling } },
			})
			expect(wrapper.vm.isOwner).toBe(true)
			// The owner does NOT hold 'group:billing-only', so that section is
			// narrowed out while org-credentials (no permission) still shows.
			expect(wrapper.vm.visibleAdminSettingsSections.map((s) => s.id)).toEqual(['org-credentials'])

			wrapper.vm.adminSettingsOpen = true
			await wrapper.vm.$nextTick()
			expect(wrapper.find('#org-credentials').exists()).toBe(true)
			expect(wrapper.find('#billing').exists()).toBe(false)
			expect(wrapper.findComponent(AdminBilling).exists()).toBe(false)
		})

		it('never widens a section permission to a non-owner — the whole dialog stays unmounted', async () => {
			loadState.mockImplementation((app, key, fallback) => (
				app === 'openbuild' && key === 'currentUserGroups' ? ['billing-only'] : fallback
			))
			const manifest = {
				...baseManifest,
				adminSettings: [
					{ id: 'billing', component: 'AdminBilling', label: 'Billing', permission: 'group:billing-only' },
				],
			}
			// currentUserGroups intersects the SECTION's permission, but not any
			// owner GID — the caller is not an app owner, so the dialog (and the
			// section within it) must not mount regardless.
			const wrapper = mountRoot({
				manifest,
				permissions: ['group:owners'],
				registry: { AdminBilling: { kind: 'section', component: AdminBilling } },
			})
			expect(wrapper.vm.isOwner).toBe(false)
			expect(wrapper.find('[data-testid="cn-nav-admin-settings"]').exists()).toBe(false)
			wrapper.vm.adminSettingsOpen = true
			await wrapper.vm.$nextTick()
			expect(wrapper.find('#billing').exists()).toBe(false)
			expect(wrapper.findComponent(AdminBilling).exists()).toBe(false)
		})
	})
})
