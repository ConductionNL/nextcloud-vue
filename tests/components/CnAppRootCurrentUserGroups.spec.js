/**
 * Tests for CnAppRoot's `currentUserGroups` initial-state read.
 *
 * Initial state is namespaced by the PUBLISHING app's id, and Buildiq's id
 * moved from `openbuild` to `buildiq`. A stale namespace is silent: `loadState`
 * with a default returns the default, so the owner-group fallback gate reads
 * false and nothing reports the wrong key. Both namespaces are asserted here so
 * a single-key read on either name fails the suite.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		post: jest.fn().mockRejectedValue(new Error('no batch route')),
		get: jest.fn().mockRejectedValue(new Error('no theme route')),
	},
}))
jest.mock('@nextcloud/initial-state', () => ({
	loadState: jest.fn(),
}))

const { loadState } = require('@nextcloud/initial-state')
const { __resetAppStatusCacheForTests } = require('../../src/composables/useAppStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
}

/**
 * Mount CnAppRoot with a stubbed router-view.
 *
 * @return {object} the mounted wrapper
 */
function mountRoot() {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'myapp', translate: (k) => k },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

/**
 * Serve `currentUserGroups` from exactly one initial-state namespace, so a
 * read against the other namespace resolves to its caller-supplied default.
 *
 * @param {string} appId the namespace that holds the value
 * @param {Array<string>} groups the GIDs to serve
 */
function serveGroupsFrom(appId, groups) {
	loadState.mockImplementation((app, key, fallback) =>
		(app === appId && key === 'currentUserGroups') ? groups : fallback,
	)
}

describe('CnAppRoot currentUserGroups', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		__resetAppStatusCacheForTests()
		global.OC = { appswebroots: {} }
	})

	it('reads the groups from the current `buildiq` namespace', () => {
		serveGroupsFrom('buildiq', ['editors'])
		expect(mountRoot().vm.currentUserGroups).toEqual(['editors'])
	})

	it('reads the groups from the legacy `openbuild` namespace', () => {
		serveGroupsFrom('openbuild', ['editors'])
		expect(mountRoot().vm.currentUserGroups).toEqual(['editors'])
	})

	it('prefers `buildiq` when both namespaces publish', () => {
		loadState.mockImplementation((app, key, fallback) => {
			if (key !== 'currentUserGroups') return fallback
			if (app === 'buildiq') return ['current']
			if (app === 'openbuild') return ['legacy']
			return fallback
		})
		expect(mountRoot().vm.currentUserGroups).toEqual(['current'])
	})

	it('resolves to an empty list on a non-Buildiq host', () => {
		loadState.mockImplementation((app, key, fallback) => fallback)
		expect(mountRoot().vm.currentUserGroups).toEqual([])
	})

	it('resolves to an empty list when the state is not an array', () => {
		serveGroupsFrom('buildiq', 'editors')
		expect(mountRoot().vm.currentUserGroups).toEqual([])
	})

	it('resolves to an empty list when loadState throws', () => {
		loadState.mockImplementation(() => { throw new Error('no initial state') })
		expect(mountRoot().vm.currentUserGroups).toEqual([])
	})
})
