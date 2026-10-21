/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `flow` page mounts CnFlowSidebar in the app sidebar by default, so an app
 * needs no one-line wrapper component to name, describe or edit a flow.
 *
 * @spec openspec/changes/pl4-roadmap-flow/specs/pl4-roadmap-flow/spec.md#requirement-a-flow-page-mounts-the-flow-sidebar-by-default
 */

import { shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { defaultPageSidebars } from '../../src/components/CnPageRenderer/pageTypes.js'

const OwnSidebar = { name: 'OwnSidebar', template: '<div />' }

const manifest = {
	version: '1.1.0',
	menu: [],
	pages: [
		{ id: 'flow', route: '/flows/:id', type: 'flow', title: 'Flow', config: { app: 'pipelinq' } },
		{ id: 'old', route: '/old/:id', type: 'flow-detail', title: 'Flow', config: { app: 'pipelinq' } },
		{ id: 'own', route: '/own/:id', type: 'flow', title: 'Flow', sidebarComponent: 'OwnSidebar' },
		{ id: 'none', route: '/none/:id', type: 'flow', title: 'Flow', sidebar: { show: false } },
		{ id: 'index', route: '/index', type: 'index', title: 'List', config: { register: 'r', schema: 's' } },
	],
}

/**
 * Mount the renderer on one route.
 *
 * @param {string} routeName The route.
 * @return {import('@vue/test-utils').VueWrapper}
 */
function mountRenderer(routeName) {
	return shallowMount(CnPageRenderer, {
		provide: { cnManifest: manifest, cnCustomComponents: { OwnSidebar }, cnTranslate: (k) => k },
		mocks: { $route: { name: routeName, params: { id: 'f1' } } },
	})
}

describe('CnPageRenderer flow sidebar default', () => {
	it('mounts CnFlowSidebar on a flow page that names no sidebar', () => {
		expect(mountRenderer('flow').vm.currentPageSidebarComponent).toBe(defaultPageSidebars.flow)
		expect(mountRenderer('old').vm.currentPageSidebarComponent).toBe(defaultPageSidebars.flow)
	})

	it('keeps a page\'s own sidebar, a hidden sidebar, and other page types as they were', () => {
		expect(mountRenderer('own').vm.currentPageSidebarComponent).toBe(OwnSidebar)
		expect(mountRenderer('none').vm.currentPageSidebarComponent).toBeNull()
		expect(mountRenderer('index').vm.currentPageSidebarComponent).toBeNull()
	})
})
