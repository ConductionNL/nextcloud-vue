/**
 * Tests for CnAppRoot's first-time-setup surfaces (ADR-042, REQ-SETUP-NV-012).
 *
 * Covers the gating phase (required step unmet → non-cancellable wizard
 * replaces the shell) and the non-gating optional path (shell renders, wizard
 * auto-opens once per `setup.version`, dismissible), including the localStorage
 * dismissal lifecycle and the "finishing counts as dismissal" rule that stops
 * the wizard reopening on every visit when an optional step is skipped.
 *
 * `useSetupStatus` is mocked at the composable boundary so each scenario can
 * state a step-status matrix directly instead of driving the HTTP contract.
 */

import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')) },
}))

const mockRefresh = jest.fn()
let mockSetupState = null
jest.mock('../../src/composables/useSetupStatus.js', () => ({
	useSetupStatus: () => mockSetupState,
	__resetSetupStatusCacheForTests: () => {},
}))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

/**
 * Build the mocked `useSetupStatus` return value from a step matrix.
 *
 * @param {Array<object>} steps  Steps as `{ id, type, required, done }`.
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
		refresh: mockRefresh,
	}
}

const manifestWith = (steps, version = 1) => ({
	version: '1.0.0',
	menu: [{ id: 'home', label: 'Home', route: 'home' }],
	pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
	dependencies: [],
	setup: { enabled: true, version, steps: steps.map(({ id, type, required }) => ({ id, type, required })) },
})

function mountRoot(manifest) {
	return mount(CnAppRoot, {
		// `requiresApps: []` opts out of the capabilities-API availability guard,
		// which otherwise holds the render at its loading state and never reaches
		// the setup/shell phases these tests are about.
		propsData: { manifest, appId: 'myapp', requiresApps: [] },
		mocks: { $route: { name: 'home' } },
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnSetupWizard: {
				name: 'CnSetupWizard',
				template: '<div class="setup-wizard-stub" />',
				props: ['appId', 'steps', 'cancellable', 'completedStepIds'],
			},
		},
	})
}

// A welcome `info` + required `choice` + optional `run-action` + `summary`
// manifest — the shape every consumer app actually ships.
const WELCOME = { id: 'welcome', type: 'info' }
const CURRENCY = { id: 'currency', type: 'choice', required: true }
const DEMO = { id: 'demo', type: 'run-action' }
const DONE = { id: 'done', type: 'summary' }

const wizardOf = (wrapper) => wrapper.findComponent({ name: 'CnSetupWizard' })

describe('CnAppRoot setup wizard', () => {
	beforeEach(() => {
		mockRefresh.mockReset()
		try { window.localStorage.clear() } catch (e) { /* noop */ }
	})

	describe('gating phase (required step unmet)', () => {
		it('replaces the shell with a non-cancellable wizard', () => {
			mockSetupState = setupState([
				{ ...WELCOME, done: false },
				{ ...CURRENCY, done: false },
			])
			const wrapper = mountRoot(manifestWith([WELCOME, CURRENCY]))
			expect(wrapper.vm.phase).toBe('setup')
			expect(wizardOf(wrapper).props('cancellable')).toBe(false)
		})

		it('does not also open the non-gating instance', () => {
			mockSetupState = setupState([
				{ ...CURRENCY, done: false },
				{ ...DEMO, done: false },
			])
			const wrapper = mountRoot(manifestWith([CURRENCY, DEMO]))
			expect(wrapper.vm.optionalSetupPending).toBe(false)
			expect(wrapper.vm.setupWizardOpen).toBe(false)
		})

		it('never gates while the status is still loading', () => {
			mockSetupState = setupState([{ ...CURRENCY, done: false }], true)
			const wrapper = mountRoot(manifestWith([CURRENCY]))
			expect(wrapper.vm.phase).toBe('shell')
			expect(wrapper.vm.optionalSetupPending).toBe(false)
		})
	})

	describe('non-gating optional phase (REQ-SETUP-NV-012)', () => {
		it('renders the shell and auto-opens a cancellable wizard', () => {
			mockSetupState = setupState([
				{ ...CURRENCY, done: true },
				{ ...DEMO, done: false },
			])
			const wrapper = mountRoot(manifestWith([CURRENCY, DEMO]))
			expect(wrapper.vm.phase).toBe('shell')
			expect(wrapper.vm.optionalSetupPending).toBe(true)
			expect(wrapper.vm.setupWizardOpen).toBe(true)
			expect(wizardOf(wrapper).props('cancellable')).toBe(true)
		})

		it('ignores info and summary steps, which no backend can report done', () => {
			// These have nothing to persist server-side, so they report done:false
			// forever — treating them as pending would prompt every user, always.
			mockSetupState = setupState([
				{ ...WELCOME, done: false },
				{ ...CURRENCY, done: true },
				{ ...DONE, done: false },
			])
			const wrapper = mountRoot(manifestWith([WELCOME, CURRENCY, DONE]))
			expect(wrapper.vm.optionalSetupPending).toBe(false)
			expect(wrapper.vm.setupWizardOpen).toBe(false)
			expect(wizardOf(wrapper).exists()).toBe(false)
		})

		it('passes the server-done step ids through so the wizard resumes', () => {
			mockSetupState = setupState([
				{ ...CURRENCY, done: true },
				{ ...DEMO, done: false },
			])
			const wrapper = mountRoot(manifestWith([CURRENCY, DEMO]))
			expect(wizardOf(wrapper).props('completedStepIds')).toEqual(['currency'])
		})
	})

	describe('dismissal lifecycle', () => {
		const pendingManifest = () => {
			mockSetupState = setupState([
				{ ...CURRENCY, done: true },
				{ ...DEMO, done: false },
			])
			return manifestWith([CURRENCY, DEMO])
		}

		it('does not auto-open when already dismissed for this setup.version', () => {
			window.localStorage.setItem('cn-setup-wizard-dismissed:myapp:1', '1')
			const wrapper = mountRoot(pendingManifest())
			expect(wrapper.vm.optionalSetupPending).toBe(true)
			expect(wrapper.vm.setupWizardOpen).toBe(false)
		})

		it('re-prompts when setup.version is bumped', () => {
			window.localStorage.setItem('cn-setup-wizard-dismissed:myapp:1', '1')
			mockSetupState = setupState([
				{ ...CURRENCY, done: true },
				{ ...DEMO, done: false },
			])
			const wrapper = mountRoot(manifestWith([CURRENCY, DEMO], 2))
			expect(wrapper.vm.setupWizardOpen).toBe(true)
		})

		it('persists dismissal and closes on @close', async () => {
			const wrapper = mountRoot(pendingManifest())
			wizardOf(wrapper).vm.$emit('close')
			await wrapper.vm.$nextTick()
			expect(window.localStorage.getItem('cn-setup-wizard-dismissed:myapp:1')).toBe('1')
			expect(wrapper.vm.setupWizardOpen).toBe(false)
			expect(wizardOf(wrapper).exists()).toBe(false)
		})

		it('persists dismissal on @complete too, so Finish is not punished', async () => {
			// Next skips optional steps, so a user can legitimately reach Finish
			// with `demo` still un-done. The server keeps reporting it unmet, so
			// without persisting here the wizard reopens on every single visit.
			const wrapper = mountRoot(pendingManifest())
			wizardOf(wrapper).vm.$emit('complete')
			await wrapper.vm.$nextTick()
			expect(window.localStorage.getItem('cn-setup-wizard-dismissed:myapp:1')).toBe('1')
			expect(mockRefresh).toHaveBeenCalled()
			expect(wrapper.emitted('setup-complete')).toBeTruthy()
		})

		it('keeps the wizard mounted on @complete so the result phase can show', async () => {
			const wrapper = mountRoot(pendingManifest())
			wizardOf(wrapper).vm.$emit('complete')
			await wrapper.vm.$nextTick()
			// CnWizardDialog has just flipped into "Setup complete." — unmounting
			// here would swallow it. Its Close button drives the unmount.
			expect(wrapper.vm.setupWizardOpen).toBe(true)
			expect(wizardOf(wrapper).exists()).toBe(true)
			wizardOf(wrapper).vm.$emit('close')
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.setupWizardOpen).toBe(false)
		})

		it('does not re-auto-open after completing while the step stays unmet', async () => {
			const wrapper = mountRoot(pendingManifest())
			wizardOf(wrapper).vm.$emit('complete')
			await wrapper.vm.$nextTick()
			wizardOf(wrapper).vm.$emit('close')
			await wrapper.vm.$nextTick()
			// Status refresh resolves with `demo` still un-done → pending is true
			// again, but the dismissal must hold.
			expect(wrapper.vm.optionalSetupPending).toBe(true)
			expect(wrapper.vm.setupWizardOpen).toBe(false)
		})

		it('survives localStorage being unavailable', async () => {
			// Scoped to the setup key so the rest of the shell's storage reads
			// (soft-dep dismissals, walkthrough state) behave normally.
			const denied = (key) => {
				if (String(key).startsWith('cn-setup-wizard-dismissed:')) {
					throw new Error('denied')
				}
				return null
			}
			const getItem = jest.spyOn(window.Storage.prototype, 'getItem').mockImplementation(denied)
			const setItem = jest.spyOn(window.Storage.prototype, 'setItem').mockImplementation(denied)
			try {
				const wrapper = mountRoot(pendingManifest())
				expect(wrapper.vm.setupWizardOpen).toBe(true)
				wizardOf(wrapper).vm.$emit('close')
				await wrapper.vm.$nextTick()
				expect(wrapper.vm.setupWizardOpen).toBe(false)
				// Falls back to the session flag when nothing can be written.
				expect(wrapper.vm.isSetupWizardDismissed()).toBe(true)
			} finally {
				getItem.mockRestore()
				setItem.mockRestore()
			}
		})
	})
})
