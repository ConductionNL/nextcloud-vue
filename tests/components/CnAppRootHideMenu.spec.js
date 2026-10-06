/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `hideMenu` renders no navigation at all. An empty `#menu` override could
 * not do that (an empty slot falls back to the default CnAppNav), which is
 * why launchpad passed a hidden empty span. By default CnAppNav renders as
 * it always has.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-an-app-root-can-hide-its-menu
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')), get: jest.fn().mockRejectedValue(new Error('no theme route')) },
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

function mountRoot(props = {}, slots = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'launchpad', requiresApps: [], ...props },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
		slots,
	})
}

describe('CnAppRoot — hideMenu', () => {
	it('renders CnAppNav with the menu manifest by default', () => {
		const wrapper = mountRoot()
		const nav = wrapper.findComponent({ name: 'CnAppNav' })
		expect(nav.exists()).toBe(true)
		expect(nav.props('manifest').menu).toHaveLength(1)
		expect(wrapper.find('.stub.NcAppNavigation').exists()).toBe(true)
	})

	it('renders neither CnAppNav nor the #menu slot with hideMenu', () => {
		const wrapper = mountRoot({ hideMenu: true }, { menu: '<div class="custom-menu" />' })
		expect(wrapper.findComponent({ name: 'CnAppNav' }).exists()).toBe(false)
		expect(wrapper.find('.stub.NcAppNavigation').exists()).toBe(false)
		expect(wrapper.find('.custom-menu').exists()).toBe(false)
		expect(wrapper.find('.stub.NcAppContent').exists()).toBe(true)
	})
})
