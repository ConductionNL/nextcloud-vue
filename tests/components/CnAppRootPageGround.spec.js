/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `pageGround` draws the content without its own surface, so the pages sit
 * on the page background. By default the content panel renders as before.
 *
 * @spec openspec/changes/app-root-page-ground/specs/app-root-page-ground/spec.md#requirement-an-app-root-can-draw-its-content-on-the-page-ground
 */
import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { join } from 'path'

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

function mountRoot(props = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'launchpad', requiresApps: [], ...props },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

describe('CnAppRoot — pageGround', () => {
	it('keeps the content panel by default', () => {
		const wrapper = mountRoot()
		expect(wrapper.find('[data-testid="cn-app-root"]').classes()).not.toContain('cn-app-root--page-ground')
	})

	it('marks the root for the page ground with pageGround', () => {
		const wrapper = mountRoot({ pageGround: true })
		expect(wrapper.find('[data-testid="cn-app-root"]').classes()).toContain('cn-app-root--page-ground')
	})

	it('makes NcContent and NcAppContent transparent under the class', () => {
		const source = readFileSync(join(__dirname, '../../src/components/CnAppRoot/CnAppRoot.vue'), 'utf8')
		const rule = source.match(/#content-vue\.cn-app-root--page-ground,\s*\.cn-app-root--page-ground #app-content-vue \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('background-color: transparent')
	})
})
