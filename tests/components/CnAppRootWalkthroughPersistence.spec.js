/**
 * Tests for CnAppRoot ↔ CnWalkthrough completion persistence (ADR-043,
 * REQ-WALK-NV-004 / REQ-WALK-NV-006).
 *
 * Observed defect (live, Buildiq): the manifest declared
 * `walkthrough.completionConfigKey`, `GET /api/preferences/{key}` answered
 * `{"value": null}`, and dismissing the tour issued NO request at all — nothing
 * was ever written back. The first-visit tour therefore reopened on every visit
 * for every user; its full-viewport dim intercepted pointer events and its
 * step-tracking kept `networkidle` from settling in e2e runs.
 *
 * These specs pin both directions: the dismiss/complete path must PUT the
 * recorded version to the declared key, and a user whose preference is already
 * set must not get the tour rendered.
 */

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => Promise.resolve({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(),
		put: jest.fn(),
		post: jest.fn(),
	},
}))

const axios = require('@nextcloud/axios').default
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const {
	__resetWalkthroughCacheForTests,
	WALKTHROUGH_SEEN_STORAGE_PREFIX,
} = require('../../src/composables/useWalkthrough.js')

const CONFIG_KEY = 'walkthrough_completed_version'
const PREF_PATH = '/api/preferences/' + CONFIG_KEY

const walkthroughManifest = {
	version: '2.1.0',
	menu: [{ id: 'home', label: 'app.home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'app.home' }],
	dependencies: [],
	walkthrough: {
		enabled: true,
		version: 1,
		completionConfigKey: CONFIG_KEY,
		tours: [{
			id: 'getting-started',
			trigger: 'first-visit',
			steps: [
				{ id: 'welcome', sinceVersion: '1.0.0', placement: 'center', title: 'Welcome', advanceOn: { type: 'manual' } },
			],
		}],
	},
}

/**
 * Flush pending microtasks (the mounted() preference GET) and re-render.
 *
 * @return {Promise<void>}
 */
async function settle() {
	await Promise.resolve()
	await Promise.resolve()
	await nextTick()
	await nextTick()
}

/**
 * Mount CnAppRoot with the walkthrough manifest under a unique app id, so the
 * per-appId useWalkthrough cache never leaks between tests.
 *
 * @param {string} appId Unique app id for this test.
 * @param {object} [manifest] Manifest override.
 * @return {object} The VTU wrapper.
 */
function mountRoot(appId, manifest = walkthroughManifest) {
	return mount(CnAppRoot, {
		propsData: {
			manifest,
			appId,
			isLoading: false,
			translate: (k) => k,
			requiresApps: [],
			supportDialog: false,
		},
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

describe('CnAppRoot walkthrough completion persistence', () => {
	beforeEach(() => {
		__resetWalkthroughCacheForTests()
		window.localStorage.clear()
		axios.get.mockReset()
		axios.put.mockReset()
		axios.post.mockReset()
		// Default: fresh user — the endpoint exists and has no recorded version.
		axios.get.mockImplementation((url) => (String(url).includes(PREF_PATH)
			? Promise.resolve({ data: { value: null } })
			: Promise.reject(new Error('no route'))))
		axios.put.mockResolvedValue({ data: { value: 'ok' } })
		axios.post.mockRejectedValue(new Error('no batch route'))
	})

	it('reads the declared completionConfigKey on mount', async () => {
		const w = mountRoot('wt-read')
		await settle()
		expect(axios.get).toHaveBeenCalledWith(
			expect.stringContaining('/apps/wt-read' + PREF_PATH),
		)
		w.unmount()
	})

	it('auto-opens the tour for a fresh user whose preference is null', async () => {
		const w = mountRoot('wt-fresh')
		await settle()
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		w.unmount()
	})

	it('PUTs the app version to the same preference key when the tour is closed', async () => {
		const w = mountRoot('wt-close')
		await settle()
		const tour = w.findComponent(CnWalkthrough)
		expect(tour.exists()).toBe(true)

		tour.vm.close()
		await settle()

		expect(axios.put).toHaveBeenCalledWith(
			expect.stringContaining('/apps/wt-close' + PREF_PATH),
			{ value: '2.1.0' },
		)
		// Read and write must address one identical URL.
		expect(axios.put.mock.calls[0][0]).toBe(axios.get.mock.calls[0][0])
		w.unmount()
	})

	it('PUTs the app version when the tour is dismissed from the backdrop / ESC', async () => {
		const w = mountRoot('wt-dismiss')
		await settle()
		const tour = w.findComponent(CnWalkthrough)

		tour.vm.onBackdrop()
		await settle()

		expect(axios.put).toHaveBeenCalledWith(
			expect.stringContaining('/apps/wt-dismiss' + PREF_PATH),
			{ value: '2.1.0' },
		)
		w.unmount()
	})

	it('does not render the tour for a user whose preference is already set', async () => {
		axios.get.mockImplementation((url) => (String(url).includes(PREF_PATH)
			? Promise.resolve({ data: { value: '2.1.0' } })
			: Promise.reject(new Error('no route'))))

		const w = mountRoot('wt-returning')
		await settle()

		expect(w.vm.walkthroughSeenVersion).toBe('2.1.0')
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
		w.unmount()
	})

	it('does not render the tour for a preference stored as a falsy scalar', async () => {
		axios.get.mockImplementation((url) => (String(url).includes(PREF_PATH)
			? Promise.resolve({ data: { value: 0 } })
			: Promise.reject(new Error('no route'))))

		const w = mountRoot('wt-falsy')
		await settle()

		expect(w.vm.walkthroughSeenVersion).toBe('0')
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
		w.unmount()
	})

	it('holds the overlay back until the preference answer arrives (no flash for a returning user)', async () => {
		let resolveGet
		axios.get.mockImplementation((url) => (String(url).includes(PREF_PATH)
			? new Promise((res) => { resolveGet = res })
			: Promise.reject(new Error('no route'))))

		const w = mountRoot('wt-noflash')
		await nextTick()
		// Answer still in flight — nothing may auto-open yet.
		expect(w.findComponent(CnWalkthrough).exists()).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(false)

		resolveGet({ data: { value: '2.1.0' } })
		await settle()
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
		w.unmount()
	})

	it('still mirrors the version to localStorage so the next boot is synchronous', async () => {
		const w = mountRoot('wt-mirror')
		await settle()
		w.findComponent(CnWalkthrough).vm.close()
		await settle()
		expect(window.localStorage.getItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'wt-mirror')).toBe('2.1.0')
		w.unmount()
	})

	it('falls back to localStorage-only persistence when no completionConfigKey is declared', async () => {
		const noKey = {
			...walkthroughManifest,
			walkthrough: { ...walkthroughManifest.walkthrough, completionConfigKey: undefined },
		}
		const w = mountRoot('wt-nokey', noKey)
		await settle()
		expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining(PREF_PATH))

		w.findComponent(CnWalkthrough).vm.close()
		await settle()
		expect(axios.put).not.toHaveBeenCalled()
		expect(window.localStorage.getItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + 'wt-nokey')).toBe('2.1.0')
		w.unmount()
	})

	it('does not surface a failed preference write as an error', async () => {
		axios.put.mockRejectedValue(new Error('403'))
		const w = mountRoot('wt-writefail')
		await settle()
		expect(() => w.findComponent(CnWalkthrough).vm.close()).not.toThrow()
		await settle()
		expect(w.emitted('walkthrough-complete')).toBeTruthy()
		w.unmount()
	})
})
