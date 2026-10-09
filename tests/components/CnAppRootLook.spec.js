/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-chrome-parity/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default
const { validateManifest } = require('../../src/utils/validateManifest.js')

const SCHEMA = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

function makeManifest(extra = {}, pageConfig) {
	return {
		id: 'testapp',
		name: 'Test App',
		menu: [],
		pages: [{ id: 'Home', type: 'custom', ...(pageConfig ? { config: pageConfig } : {}) }],
		...extra,
	}
}

function mountRoot(manifest, extraProps = {}) {
	return mount({
		render() {
			return h(CnAppRoot, { manifest, appId: 'testapp', translate: (k) => k, requiresApps: [], ...extraProps })
		},
	}, {
		mocks: { $route: { name: 'Home', params: {} } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

function mountPage(manifest, rootLook) {
	return mount(CnPageRenderer, {
		global: {
			provide: { cnManifest: manifest, cnLook: rootLook },
			mocks: { $route: { name: 'Home', params: {}, meta: { cnPageId: 'Home' } } },
			stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
		},
	})
}

describe('the board look on CnAppRoot', () => {
	it('puts no look class on an app without the key', () => {
		const w = mountRoot(makeManifest())
		expect(w.find('[data-testid="cn-app-root"]').classes()).not.toContain('cn-look-board')
		expect(w.html()).not.toContain('cn-look-board')
	})

	it('puts cn-look-board on the root for look: board in the manifest', () => {
		const w = mountRoot(makeManifest({ look: 'board' }))
		expect(w.find('[data-testid="cn-app-root"]').classes()).toContain('cn-look-board')
	})

	it('lets the look prop win over the manifest', () => {
		const w = mountRoot(makeManifest({ look: 'board' }), { look: 'nextcloud' })
		expect(w.find('[data-testid="cn-app-root"]').classes()).not.toContain('cn-look-board')
	})
})

describe('the board look on CnPageRenderer (nearest wins)', () => {
	it('adds no class when the page does not set a look', () => {
		const m = makeManifest({ look: 'board' })
		const w = mountPage(m, 'board')
		expect(w.classes()).not.toContain('cn-look-board')
		expect(w.classes()).not.toContain('cn-look-nextcloud')
	})

	it('puts cn-look-nextcloud on a page that opts out of the board look', () => {
		const m = makeManifest({ look: 'board' }, { look: 'nextcloud' })
		const w = mountPage(m, 'board')
		expect(w.classes()).toContain('cn-look-nextcloud')
		expect(w.classes()).not.toContain('cn-look-board')
	})

	it('puts cn-look-board on a page that opts in under a Nextcloud app', () => {
		const m = makeManifest({}, { look: 'board' })
		const w = mountPage(m, 'nextcloud')
		expect(w.classes()).toContain('cn-look-board')
	})
})

describe('the look keys in the manifest schema', () => {
	const base = { $schema: SCHEMA, version: '1.0.0', menu: [], pages: [] }

	it('accepts look at the root and config.look on a page', () => {
		expect(validateManifest({ ...base, look: 'board' }).valid).toBe(true)
		expect(validateManifest({ ...base, look: 'nextcloud' }).valid).toBe(true)
		const withPage = (look) => validateManifest({
			...base,
			menu: [{ id: 'a', label: 'A', route: 'a', order: 1 }],
			pages: [{ id: 'a', route: '/a', type: 'index', title: 'A', config: { register: 'r', schema: 's', look } }],
		})
		expect(withPage('board').valid).toBe(true)
		expect(withPage('nextcloud').valid).toBe(true)
		const out = withPage('compact')
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/look/)
	})

	it('refuses an unknown value naming the key', () => {
		const out = validateManifest({ ...base, look: 'compact' })
		expect(out.valid).toBe(false)
		expect(out.errors.join(' ')).toMatch(/look/)
	})
})
