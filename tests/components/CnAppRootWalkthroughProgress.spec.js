/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An unfinished tour continues where the user left it (pipelinq review C4).
 * Progress lived only in memory, so a reload started again at step 1.
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => Promise.resolve({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const CONFIG_KEY = 'walkthrough_seen_version'
const SEEN_PATH = '/api/preferences/' + CONFIG_KEY
const PROGRESS_PATH = SEEN_PATH + '-progress'

const manifest = {
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
				{ id: 'products', sinceVersion: '1.0.0', placement: 'center', title: 'Products', advanceOn: { type: 'manual' } },
				{ id: 'contacts', sinceVersion: '1.0.0', placement: 'center', title: 'Contacts', advanceOn: { type: 'manual' } },
			],
		}],
	},
}

function mountRoot(appId) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId, isLoading: false, translate: (k) => k, requiresApps: [], supportDialog: false },
		mocks: { $route: { name: 'home' } },
		stubs: { 'router-view': { template: '<div class="router-view-stub" />' } },
	})
}

function serve(progress) {
	axios.get.mockImplementation((url) => {
		const u = String(url)
		if (u.includes(PROGRESS_PATH)) {
			return Promise.resolve({ data: { value: progress ? JSON.stringify(progress) : null } })
		}
		if (u.includes(SEEN_PATH)) {
			return Promise.resolve({ data: { value: null } })
		}
		return Promise.reject(new Error('no route'))
	})
}

beforeEach(() => {
	__resetWalkthroughCacheForTests()
	window.localStorage.clear()
	axios.get.mockReset()
	axios.put.mockReset()
	axios.post.mockReset()
	axios.put.mockResolvedValue({ data: {} })
	axios.post.mockRejectedValue(new Error('no batch route'))
})

describe('CnAppRoot walkthrough progress', () => {
	it('resumes at the remembered step', async () => {
		serve({ tourId: 'getting-started', stepId: 'contacts', index: 2, version: '2.1.0' })
		const w = mountRoot('wtp-resume')
		await flushPromises()
		const tour = w.findComponent(CnWalkthrough)
		expect(tour.exists()).toBe(true)
		expect(tour.vm.step.id).toBe('contacts')
		w.unmount()
	})

	it('remembers each step the user reaches', async () => {
		serve(null)
		const w = mountRoot('wtp-save')
		await flushPromises()
		const tour = w.findComponent(CnWalkthrough)
		tour.vm.advance()
		await flushPromises()
		const call = axios.put.mock.calls.find(([url]) => String(url).includes(PROGRESS_PATH))
		expect(call).toBeTruthy()
		expect(JSON.parse(call[1].value)).toEqual({ tourId: 'getting-started', stepId: 'products', index: 1, version: '2.1.0' })
		w.unmount()
	})

	it('clears the progress when the tour is finished', async () => {
		serve({ tourId: 'getting-started', stepId: 'contacts', index: 2, version: '2.1.0' })
		const w = mountRoot('wtp-finish')
		await flushPromises()
		w.findComponent(CnWalkthrough).vm.advance()
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith(expect.stringContaining(PROGRESS_PATH), { value: '' })
		expect(w.vm.walkthroughProgressValue).toBeNull()
		w.unmount()
	})

	it('offers continue and start over while a tour is unfinished', async () => {
		serve({ tourId: 'getting-started', stepId: 'products', index: 1, version: '2.1.0' })
		const w = mountRoot('wtp-offer')
		await flushPromises()
		expect(w.vm.walkthroughProgressValue).not.toBeNull()
		expect(w.vm.continueWalkthroughLabel).toBe('Continue where you left off')
		expect(w.vm.startOverWalkthroughLabel).toBe('Start over')
		w.unmount()
	})

	it('continue shows a paused tour again at its step', async () => {
		jest.useFakeTimers()
		serve({ tourId: 'getting-started', stepId: 'products', index: 1, version: '2.1.0' })
		const w = mountRoot('wtp-continue')
		jest.useRealTimers()
		await flushPromises()
		const tour = w.findComponent(CnWalkthrough)
		tour.vm.onBackdrop()
		expect(tour.vm.wt.running.value).toBe(false)
		jest.useFakeTimers()
		w.vm.continueWalkthroughFromSettings()
		jest.advanceTimersByTime(60)
		jest.useRealTimers()
		expect(tour.vm.wt.running.value).toBe(true)
		expect(tour.vm.step.id).toBe('products')
		w.unmount()
	})
})
