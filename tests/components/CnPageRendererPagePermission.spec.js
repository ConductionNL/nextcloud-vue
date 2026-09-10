/**
 * A page that declares a `permission` is refused to a user who does not hold it.
 *
 * The manifest schema carried `pages[].permission` as SCHEMA-ONLY from the day
 * it was added: "CnPageRenderer / CnAppRoot do NOT currently gate the page on
 * it; consumers that want enforcement filter the manifest themselves before
 * passing it to CnAppRoot". No consumer did.
 *
 * So a declared page was dropped from the MENU by CnAppNav and served in full
 * to anyone who typed its URL — the worst of the two, because it reads as
 * protected to whoever declared it. Measured on dossiq: a non-admin opening
 * `/settings/integrations` directly got the page with seven links into admin
 * settings, while the same account correctly saw no entry for it in the nav.
 *
 * The semantics here are CnAppNav's on purpose, so the route and the menu agree:
 * an empty `permissions` list still means "the app did not say" and allows.
 */

import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const manifest = {
	version: '1.0.0',
	menu: [],
	pages: [
		{
			id: 'integrations',
			route: '/settings/integrations',
			type: 'index',
			title: 'app.integrations',
			permission: 'admin',
			config: { schema: { name: 's1' }, columns: [] },
		},
		{
			id: 'home',
			route: '/',
			type: 'index',
			title: 'app.home',
			config: { schema: { name: 's1' }, columns: [] },
		},
	],
}

/**
 * Mount the renderer on a route, as a user holding `permissions`.
 *
 * @param {string} routeName The route name, matched against page.id.
 * @param {Array<string>|undefined} permissions What the user holds.
 * @return {object} The wrapper.
 */
function mountAs(routeName, permissions) {
	return shallowMount(CnPageRenderer, {
		provide: {
			cnManifest: manifest,
			...(permissions === undefined ? {} : { cnPermissions: permissions }),
		},
		mocks: { $route: { name: routeName, params: {} } },
	})
}

describe('CnPageRenderer page-level permission', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('refuses a declared page to a user without the permission', () => {
		const wrapper = mountAs('integrations', ['user'])

		expect(wrapper.vm.forbiddenPagePermission).toBe('admin')
		expect(wrapper.find('[data-testid="cn-page-forbidden"]').exists()).toBe(true)
	})

	it('renders the same page for a user who holds it', () => {
		const wrapper = mountAs('integrations', ['user', 'admin'])

		expect(wrapper.vm.forbiddenPagePermission).toBeNull()
		expect(wrapper.find('[data-testid="cn-page-forbidden"]').exists()).toBe(false)
	})

	it('leaves a page that declares nothing alone', () => {
		const wrapper = mountAs('home', ['user'])

		expect(wrapper.vm.forbiddenPagePermission).toBeNull()
		expect(wrapper.find('[data-testid="cn-page-forbidden"]').exists()).toBe(false)
	})

	it('allows on an empty list, so the route agrees with the menu', () => {
		// CnAppNav reads an empty array as "the app did not say" and renders
		// the item. Refusing here would hide every declared page in an app that
		// passes no permissions, which is the shape that once rendered an
		// Admin-settings entry for nobody. That is a separate decision from
		// closing the deep-link hole.
		expect(mountAs('integrations', []).vm.forbiddenPagePermission).toBeNull()
		expect(mountAs('integrations', undefined).vm.forbiddenPagePermission).toBeNull()
	})
})
