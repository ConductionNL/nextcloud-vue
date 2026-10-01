/**
 * Tests for CnAppRoot's walkthrough ↔ setup-wizard sequencing.
 *
 * On a first run the non-gating setup wizard (an optional step is still
 * outstanding) and the first-visit walkthrough both qualify. Unsequenced, the
 * tour opened behind the wizard, and its window-level ESC listener meant
 * closing the wizard with ESC also dismissed (and could persist) the tour.
 * CnAppRoot therefore withholds the walkthrough while the setup status is
 * still loading and while the wizard is open; dismissing or finishing the
 * wizard lets the tour mount and auto-start.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn().mockRejectedValue(new Error('no route')),
		put: jest.fn().mockResolvedValue({ data: {} }),
		post: jest.fn().mockRejectedValue(new Error('no batch route')),
	},
}))

let mockSetupState = null
jest.mock('../../src/composables/useSetupStatus.js', () => ({
	useSetupStatus: () => mockSetupState,
	__resetSetupStatusCacheForTests: () => {},
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

/**
 * Build the mocked `useSetupStatus` return value from a step matrix.
 *
 * @param {Array<object>} steps   Steps as `{ id, type, required, done }`.
 * @param {boolean}       loading Whether the status is still in flight.
 * @return {object} The composable-shaped state.
 */
function setupState(steps, loading = false) {
	const stepsRef = ref(steps)
	return {
		steps: stepsRef,
		status: ref({}),
		requiredUnmet: computed(() => stepsRef.value.filter((s) => s.required === true && !s.done)),
		optionalUnmet: computed(() => stepsRef.value.filter((s) => s.required !== true && !s.done)),
		completed: computed(() => false),
		enabled: true,
		loading: ref(loading),
		error: ref(null),
		refresh: jest.fn(),
	}
}

const CURRENCY = { id: 'currency', type: 'choice', required: true }
const DEMO = { id: 'demo', type: 'run-action', action: 'demo' }

const manifest = {
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	dependencies: [],
	setup: { enabled: true, version: 1, steps: [CURRENCY, DEMO] },
	walkthrough: {
		enabled: true,
		version: 1,
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
 * Mount CnAppRoot with the support note off, so only the wizard can hold the
 * tour back, under a unique app id so the walkthrough cache never leaks.
 *
 * @param {string} appId Unique app id for this test.
 * @return {object} The VTU wrapper.
 */
function mountRoot(appId) {
	return mount(CnAppRoot, {
		propsData: { manifest, appId, requiresApps: [], supportDialog: false, translate: (k) => k },
		mocks: { $route: { name: 'home' } },
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnSetupWizard: {
				name: 'CnSetupWizard',
				template: '<div class="setup-wizard-stub" />',
				props: ['appId', 'appName', 'steps', 'cancellable', 'completedStepIds'],
			},
		},
	})
}

const wizardOf = (wrapper) => wrapper.findComponent({ name: 'CnSetupWizard' })

describe('CnAppRoot walkthrough ↔ setup-wizard sequencing', () => {
	beforeEach(() => {
		__resetWalkthroughCacheForTests()
		try {
			window.localStorage.clear()
		} catch { /* noop */ }
	})

	it('withholds the walkthrough while the optional setup wizard is open', async () => {
		mockSetupState = setupState([{ ...CURRENCY, done: true }, { ...DEMO, done: false }])
		const w = mountRoot('wt-wiz-open')
		await flushPromises()

		expect(w.vm.setupWizardOpen).toBe(true)
		expect(wizardOf(w).exists()).toBe(true)
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
		w.unmount()
	})

	it('starts the walkthrough once the wizard is dismissed, without recording it as seen', async () => {
		mockSetupState = setupState([{ ...CURRENCY, done: true }, { ...DEMO, done: false }])
		const w = mountRoot('wt-wiz-dismiss')
		await flushPromises()
		expect(w.find('.cn-walkthrough').exists()).toBe(false)

		wizardOf(w).vm.$emit('close')
		await flushPromises()

		expect(w.vm.setupWizardOpen).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		// The tour was held back, never shown: nothing may have been persisted.
		expect(w.vm.walkthroughSeenVersion).toBe('')
		w.unmount()
	})

	it('an ESC that closes the wizard does not also dismiss the held-back tour', async () => {
		mockSetupState = setupState([{ ...CURRENCY, done: true }, { ...DEMO, done: false }])
		const w = mountRoot('wt-wiz-esc')
		await flushPromises()

		// The wizard's own ESC handling closes it; the tour must not hear it.
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		wizardOf(w).vm.$emit('close')
		await flushPromises()

		expect(w.vm.walkthroughSeenVersion).toBe('')
		expect(w.emitted('walkthrough-complete')).toBeUndefined()
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		w.unmount()
	})

	it('withholds the walkthrough while the setup status is still loading', async () => {
		mockSetupState = setupState([{ ...CURRENCY, done: true }, { ...DEMO, done: false }], true)
		const w = mountRoot('wt-wiz-loading')
		await flushPromises()
		expect(w.find('.cn-walkthrough').exists()).toBe(false)

		// The status lands with an optional step outstanding: the wizard wins.
		mockSetupState.loading.value = false
		await flushPromises()
		expect(w.vm.setupWizardOpen).toBe(true)
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
		w.unmount()
	})

	it('shows the walkthrough straight away when no setup step is outstanding', async () => {
		mockSetupState = setupState([{ ...CURRENCY, done: true }, { ...DEMO, done: true }])
		const w = mountRoot('wt-wiz-none')
		await flushPromises()

		expect(w.vm.setupWizardOpen).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(true)
		w.unmount()
	})
})
