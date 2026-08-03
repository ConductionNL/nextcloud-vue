/**
 * Regression tests for CnAppRoot's first-time-setup GATE (ADR-042).
 *
 * Why this file exists: every pre-existing setup test drove
 * `useSetupStatus()` directly and awaited `refresh()` by hand. None of them
 * mounted CnAppRoot, so none could observe `phase`. The gate is what users
 * actually hit — when it sticks there is no `<main>` and no nav, so every UI
 * e2e spec in the consuming app dies on a selector timeout. That whole class
 * of failure was invisible to the suite.
 *
 * The decisive case is C. `/api/setup/status` is admin-only
 * (`#[AuthorizedAdminSetting]`), so it answers 200 `{completed:true}` to an
 * admin and 403 to everyone else. Checking in a browser as an admin therefore
 * shows a perfectly healthy endpoint while the non-admin e2e user is gated
 * out of the app entirely — the two observations look contradictory and are
 * not. Verified against `7b9639cb^`: case C fails there, A/B/D/E do not.
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((p) => `/index.php${p}`) }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn().mockRejectedValue(new Error('no batch route')) },
}))

const axios = require('@nextcloud/axios').default
const { __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

// Mirrors pipelinq's real manifest shape: presentational steps, exactly one
// REQUIRED step, and optional run-actions.
const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
	setup: {
		enabled: true,
		version: 1,
		steps: [
			{ id: 'welcome', type: 'info', title: 'Welcome' },
			{ id: 'currency', type: 'choice', required: true, title: 'Currency' },
			{ id: 'provision', type: 'run-action', title: 'Provision' },
		],
	},
}

const COMPLETE = { version: 1, completed: true, steps: { currency: { done: true }, provision: { done: true } } }

/**
 * Resolve `/api/setup/status` with `data`; reject everything else.
 *
 * @param {object} data The status payload to serve.
 */
function serveStatus(data) {
	axios.get.mockImplementation((url) => (String(url).includes('/api/setup/status')
		? Promise.resolve({ data })
		: Promise.reject(new Error('no route'))))
}

/**
 * Mount CnAppRoot with the setup manifest.
 *
 * @param {object} props Prop overrides.
 * @return {object} The mounted wrapper.
 */
function mountRoot(props = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId: 'pipelinq', isLoading: false, translate: (k) => k, requiresApps: [], ...props },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

/**
 * Flush the composable's dynamic imports + fetch chain.
 *
 * @param {object} wrapper The mounted wrapper.
 */
async function flush(wrapper) {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve()
		await wrapper.vm.$nextTick()
	}
}

describe('CnAppRoot setup gate', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
	})

	it('POSITIVE CONTROL: a genuinely unmet required step DOES gate', async () => {
		// Without this the whole file could pass by never reaching phase
		// "setup" at all, which is exactly how the gap survived before.
		serveStatus({ version: 1, completed: false, steps: { currency: { done: false }, provision: { done: true } } })
		const wrapper = mountRoot()
		await flush(wrapper)

		expect(wrapper.vm.setupGating).toBe(true)
		expect(wrapper.vm.phase).toBe('setup')
		expect(wrapper.find('.cn-app-root__setup').exists()).toBe(true)
	})

	it('A: renders the shell, not the gate, once status reports completed', async () => {
		serveStatus(COMPLETE)
		const wrapper = mountRoot()
		await flush(wrapper)

		expect(wrapper.vm.setupGating).toBe(false)
		expect(wrapper.vm.phase).toBe('shell')
		expect(wrapper.find('.cn-app-root__setup').exists()).toBe(false)
	})

	it('B: still reaches the shell when the manifest arrives asynchronously', async () => {
		serveStatus(COMPLETE)
		const wrapper = mountRoot({ manifest: null, isLoading: true })
		await flush(wrapper)
		await wrapper.setProps({ manifest, isLoading: false })
		await flush(wrapper)

		expect(wrapper.vm.phase).toBe('shell')
	})

	it('C: a 403 from setup/status must NOT gate the shell (non-admin path)', async () => {
		// Setup is admin-only. "You may not read setup state" is not
		// "setup is unfinished" — treating it as the latter put every
		// non-admin in front of a wizard they cannot complete INSTEAD of
		// the app, and timed out every non-admin e2e spec.
		axios.get.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403 } }))
		const wrapper = mountRoot()
		await flush(wrapper)

		expect(wrapper.vm.setupGating).toBe(false)
		expect(wrapper.vm.phase).toBe('shell')
	})

	it('D: a second mount sharing the module-level cache still resolves', async () => {
		serveStatus(COMPLETE)
		const first = mountRoot()
		await flush(first)
		if (first.unmount) {
			first.unmount()
		} else {
			first.destroy()
		}

		const second = mountRoot()
		await flush(second)
		expect(second.vm.phase).toBe('shell')
	})

	it('E: a new manifest object identity does not re-gate the shell', async () => {
		serveStatus(COMPLETE)
		const wrapper = mountRoot({ manifest: JSON.parse(JSON.stringify(manifest)) })
		await flush(wrapper)
		await wrapper.setProps({ manifest: JSON.parse(JSON.stringify(manifest)) })
		await flush(wrapper)

		expect(wrapper.vm.phase).toBe('shell')
	})
})

/**
 * The second way "the setup gate never clears" happens, and the one that
 * survives a 200. Reproduced with pipelinq's REAL manifest step list and the
 * REAL payload its SetupController returns.
 */
describe('CnAppRoot optional setup wizard — an UNREPORTED step is not an UNDONE step', () => {
	// pipelinq declares 7 steps; its SetupController reports status keys for
	// only 4. `demo-data` is an optional run-action it never reports at all.
	const plqManifest = {
		version: '1.0.0',
		menu: [{ id: 'home', label: 'app.home', route: 'home' }],
		pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
		dependencies: [],
		setup: {
			enabled: true,
			version: 1,
			steps: [
				{ id: 'welcome', type: 'info' },
				{ id: 'currency', type: 'choice', required: true },
				{ id: 'provision', type: 'run-action' },
				{ id: 'demo-data', type: 'run-action' },
				{ id: 'organisation', type: 'config-fields' },
				{ id: 'integrations', type: 'config-fields' },
				{ id: 'done', type: 'summary' },
			],
		},
	}
	// Verbatim shape of pipelinq SetupController::status() for a set-up app.
	const plqServerSaysComplete = {
		version: 1,
		completed: true,
		steps: {
			currency: { done: true },
			provision: { done: true },
			organisation: { done: true },
			integrations: { done: true },
		},
	}

	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
	})

	/**
	 * Mount with pipelinq's manifest.
	 *
	 * @return {object} The mounted wrapper.
	 */
	function mountPlq() {
		return mount(CnAppRoot, {
			propsData: { manifest: plqManifest, appId: 'pipelinq', isLoading: false, translate: (k) => k, requiresApps: [] },
			mocks: { $route: { name: 'home' } },
			stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
		})
	}

	it('POSITIVE CONTROL: a genuinely incomplete setup DOES auto-open the optional wizard', async () => {
		// Same manifest, but the server has NOT declared setup complete —
		// the wizard is supposed to appear here. Without this the test below
		// could pass simply because the overlay never renders in this harness.
		serveStatus({ version: 1, completed: false, steps: { currency: { done: true } } })
		const wrapper = mountPlq()
		await flush(wrapper)

		expect(wrapper.vm.optionalSetupGating).toBe(true)
		expect(wrapper.vm.setupWizardOpen).toBe(true)
		expect(wrapper.find('.cn-app-root__setup-optional').exists()).toBe(true)
	})

	it('does NOT auto-open the wizard when the server reports completed', async () => {
		// `demo-data` has no status key, so `optionalUnmet` is non-empty and
		// stays that way for ever. Before the fix the wizard opened over the
		// app on every fresh browser profile — no dismissal in localStorage —
		// which is precisely "the setup gate never clears" despite a 200.
		serveStatus(plqServerSaysComplete)
		const wrapper = mountPlq()
		await flush(wrapper)

		// The unreported step is still visible as unmet — that is expected.
		expect(wrapper.vm.setupState.optionalUnmet.value.map((s) => s.id)).toEqual(['demo-data'])
		// ...but the authoritative `completed` flag must win.
		expect(wrapper.vm.setupState.completed.value).toBe(true)
		expect(wrapper.vm.optionalSetupGating).toBe(false)
		expect(wrapper.vm.setupWizardOpen).toBe(false)
		expect(wrapper.find('.cn-app-root__setup-optional').exists()).toBe(false)
		// And the app itself is reachable.
		expect(wrapper.vm.phase).toBe('shell')
	})
})
