/**
 * Tests for CnAppRoot's walkthrough ↔ support-note sequencing.
 *
 * A fresh user qualifies for BOTH first-open surfaces at once: the support
 * note (the founder's introduction) and the first-visit walkthrough tour.
 * Unsequenced, the two overlays stack on the same first moment. CnAppRoot
 * therefore withholds the walkthrough while the support note is visible;
 * dismissing the note lets the tour mount and auto-start. The tour machine
 * lives in the per-app useWalkthrough cache, so this gating only hides the
 * overlay — it never loses tour progress.
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
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const CONFIG_KEY = 'walkthrough_completed_version'
const WT_PREF_PATH = '/api/preferences/' + CONFIG_KEY
const SUPPORT_PREF_PATH = '/api/preferences/support-dialog-seen'

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
 * Flush pending microtasks (the mounted() preference GETs) and re-render.
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
 * Mount CnAppRoot with the support note LEFT ENABLED (the default), under a
 * unique app id so the per-appId walkthrough cache never leaks between tests.
 *
 * @param {string} appId Unique app id for this test.
 * @return {object} The VTU wrapper.
 */
function mountRoot(appId) {
	return mount(CnAppRoot, {
		propsData: {
			manifest: walkthroughManifest,
			appId,
			isLoading: false,
			translate: (k) => k,
			requiresApps: [],
		},
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

describe('CnAppRoot walkthrough ↔ support-note sequencing', () => {
	beforeEach(() => {
		__resetWalkthroughCacheForTests()
		window.localStorage.clear()
		axios.get.mockReset()
		axios.put.mockReset()
		axios.post.mockReset()
		// Fresh user on both counts: no walkthrough seen, no support note seen.
		axios.get.mockImplementation((url) => {
			const u = String(url)
			if (u.includes(WT_PREF_PATH)) return Promise.resolve({ data: { value: null } })
			if (u.includes(SUPPORT_PREF_PATH)) return Promise.resolve({ data: { value: null } })
			return Promise.reject(new Error('no route'))
		})
		axios.put.mockResolvedValue({ data: { value: 'ok' } })
		axios.post.mockRejectedValue(new Error('no batch route'))
	})

	it('withholds the walkthrough while the support note is visible, then starts it on dismiss', async () => {
		const w = mountRoot('wt-seq')
		await settle()

		// Both first-open surfaces qualify — the support note wins the moment.
		expect(w.vm.cnSupportVisible).toBe(true)
		expect(w.find('.cn-walkthrough').exists()).toBe(false)

		w.vm.cnSupportHide()
		await settle()

		// The note is gone; the first-visit tour mounts and auto-starts.
		expect(w.vm.cnSupportVisible).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		w.unmount()
	})

	it('a returning support-note user gets the walkthrough with no interruption', async () => {
		axios.get.mockImplementation((url) => {
			const u = String(url)
			if (u.includes(WT_PREF_PATH)) return Promise.resolve({ data: { value: null } })
			if (u.includes(SUPPORT_PREF_PATH)) return Promise.resolve({ data: { value: '1' } })
			return Promise.reject(new Error('no route'))
		})

		const w = mountRoot('wt-seq-seen')
		await settle()

		expect(w.vm.cnSupportVisible).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		w.unmount()
	})
})
