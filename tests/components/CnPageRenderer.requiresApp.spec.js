/**
 * Tests for a page's `requiresApp` soft-dependency gate.
 *
 * A page whose required app is absent renders CnDependencyMissing INSTEAD of
 * its body. This is for the deep link: the menu entry is already hidden by
 * `visibleIf.appInstalled`, so the ways in are a bookmark, a shared URL, a
 * redirect or an e2e spec — and every one of those otherwise lands on an empty
 * page where "not installed" is indistinguishable from "no data".
 *
 * The gate resolves through `isAppInstalled`, the SAME helper `visibleIf` uses,
 * which is why these tests drive `OC.appswebroots` rather than stubbing the
 * util: a test that mocked the resolver would pass even if the two predicates
 * had drifted apart, which is the one failure worth catching.
 */
import { shallowMount } from '@vue/test-utils'

import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { __resetAppInstalledCacheForTests } from '../../src/utils/appInstalled.js'

const manifest = {
	version: '1.0.0',
	menu: [],
	pages: [
		{
			id: 'tickets',
			route: '/tickets',
			type: 'index',
			title: 'Tickets',
			requiresApp: 'dossiq',
			config: { schema: { name: 'ticket' }, columns: [] },
		},
		{
			id: 'named',
			route: '/named',
			type: 'index',
			title: 'Named',
			requiresApp: { id: 'dossiq', name: 'DossiQ' },
			config: { schema: { name: 'ticket' }, columns: [] },
		},
		{
			id: 'ungated',
			route: '/ungated',
			type: 'index',
			title: 'Ungated',
			config: { schema: { name: 'lead' }, columns: [] },
		},
	],
}

/**
 * Mount the renderer on one page.
 *
 * @param {string} name The route name to render.
 * @return {object} The wrapper.
 */
function mountPage(name) {
	return shallowMount(CnPageRenderer, {
		props: { manifest },
		global: { mocks: { $route: { name, params: {} } } },
	})
}

describe('CnPageRenderer requiresApp', () => {
	beforeEach(() => {
		global.OC = { ...(global.OC || {}), appswebroots: {} }
		// isAppInstalled memoises per app id for the page lifetime, so without
		// this the first test's "absent" answer would be handed to every test
		// after it and the installed case could never be exercised.
		__resetAppInstalledCacheForTests()
	})

	it('renders the missing-dependency screen when the app is absent', () => {
		const wrapper = mountPage('tickets')

		expect(wrapper.findComponent({ name: 'CnDependencyMissing' }).exists()).toBe(true)
	})

	it('renders the page normally once the app is installed', () => {
		global.OC.appswebroots = { dossiq: '/index.php/apps/dossiq' }

		const wrapper = mountPage('tickets')

		expect(wrapper.findComponent({ name: 'CnDependencyMissing' }).exists()).toBe(false)
	})

	it('leaves a page without requiresApp alone', () => {
		const wrapper = mountPage('ungated')

		expect(wrapper.findComponent({ name: 'CnDependencyMissing' }).exists()).toBe(false)
	})

	it('passes the missing app through to the screen', () => {
		const wrapper = mountPage('tickets')
		const screen = wrapper.findComponent({ name: 'CnDependencyMissing' })

		expect(screen.props('dependencies')).toEqual([{ id: 'dossiq', name: 'dossiq' }])
	})

	it('uses the declared display name when the object form is used', () => {
		const wrapper = mountPage('named')
		const screen = wrapper.findComponent({ name: 'CnDependencyMissing' })

		expect(screen.props('dependencies')).toEqual([{ id: 'dossiq', name: 'DossiQ' }])
	})

	it('says a feature is missing, not that the app is broken', () => {
		const wrapper = mountPage('tickets')
		const screen = wrapper.findComponent({ name: 'CnDependencyMissing' })

		// CnDependencyMissing's own default heading is written for the
		// app-level check, where nothing works at all. Reusing it here would
		// send the reader hunting for a broken install.
		expect(screen.props('heading')).not.toBe('Required apps are missing')
		expect(screen.props('intro')).toContain('Tickets')
	})
})
