/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A closed setup wizard is recorded on the server (Ruben, 7 October 2026).
 * CnAppRoot remembered a close only in localStorage, so every other browser
 * or device opened the wizard again while an optional step was unanswered.
 * OpenRegister worked around it by watching `setupWizardDismissed` and posting
 * its own `dismiss-setup` action (openregister#4445).
 */

import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

jest.mock('@nextcloud/capabilities', () => ({
	getCapabilities: jest.fn(() => ({})),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn(), get: jest.fn(), put: jest.fn() },
}))

let mockSetupState = null
jest.mock('../../src/composables/useSetupStatus.js', () => ({
	useSetupStatus: () => mockSetupState,
	__resetSetupStatusCacheForTests: () => {},
}))

const axios = require('@nextcloud/axios').default
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const CURRENCY = { id: 'currency', type: 'choice', required: true }
const DEMO = { id: 'demo', type: 'run-action' }

function pendingState(status = {}) {
	const steps = ref([{ ...CURRENCY, done: true }, { ...DEMO, done: false }])
	return {
		steps,
		status: ref(status),
		requiredUnmet: computed(() => steps.value.filter((s) => s.required === true && !s.done)),
		optionalUnmet: computed(() => steps.value.filter((s) => s.required !== true && !s.done)),
		completed: computed(() => false),
		enabled: true,
		loading: ref(false),
		error: ref(null),
		refresh: jest.fn(),
	}
}

function manifest(setupExtra = {}, version = 1) {
	return {
		version: '1.0.0',
		menu: [{ id: 'home', label: 'Home', route: 'home' }],
		pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }],
		dependencies: [],
		setup: { enabled: true, version, steps: [CURRENCY, DEMO].map(({ id, type, required }) => ({ id, type, required })), ...setupExtra },
	}
}

function mountRoot(m) {
	return mount(CnAppRoot, {
		propsData: { manifest: m, appId: 'myapp', requiresApps: [] },
		mocks: { $route: { name: 'home' } },
		stubs: {
			'router-view': { template: '<div class="router-view-stub" />' },
			CnSetupWizard: { name: 'CnSetupWizard', template: '<div class="setup-wizard-stub" />', props: ['appId', 'steps', 'cancellable', 'completedStepIds'] },
		},
	})
}

const wizardOf = (w) => w.findComponent({ name: 'CnSetupWizard' })
const dismissPosts = () => axios.post.mock.calls.filter(([url]) => String(url).includes('/api/setup/action/'))

beforeEach(() => {
	axios.post.mockReset()
	axios.post.mockResolvedValue({ data: { success: true } })
	try {
		window.localStorage.clear()
	} catch { /* noop */ }
})

describe('CnAppRoot records a closed setup wizard on the server', () => {
	it('posts the declared dismissAction once when the wizard is closed', async () => {
		mockSetupState = pendingState()
		const w = mountRoot(manifest({ dismissAction: 'dismiss-setup' }))
		expect(w.vm.setupWizardOpen).toBe(true)
		wizardOf(w).vm.$emit('close')
		await w.vm.$nextTick()
		expect(dismissPosts()).toHaveLength(1)
		expect(dismissPosts()[0][0]).toContain('/apps/myapp/api/setup/action/dismiss-setup')
		expect(dismissPosts()[0][1]).toEqual({ finished: false })
		expect(w.emitted('setup-wizard-dismissed')[0][0]).toEqual({ appId: 'myapp', version: 1, finished: false })
	})

	it('posts once with finished: true when the wizard is finished and then closed', async () => {
		mockSetupState = pendingState()
		const w = mountRoot(manifest({ dismissAction: 'dismiss-setup' }))
		wizardOf(w).vm.$emit('complete')
		await w.vm.$nextTick()
		wizardOf(w).vm.$emit('close')
		await w.vm.$nextTick()
		expect(dismissPosts()).toHaveLength(1)
		expect(dismissPosts()[0][1]).toEqual({ finished: true })
		expect(w.emitted('setup-wizard-dismissed')).toHaveLength(1)
	})

	it('posts nothing for an app that declares no dismissAction, and still remembers it here', async () => {
		mockSetupState = pendingState()
		const w = mountRoot(manifest())
		wizardOf(w).vm.$emit('close')
		await w.vm.$nextTick()
		expect(dismissPosts()).toHaveLength(0)
		expect(window.localStorage.getItem('cn-setup-wizard-dismissed:myapp:1')).toBe('1')
		expect(w.emitted('setup-wizard-dismissed')).toHaveLength(1)
	})

	it('a failed post does not break the close', async () => {
		axios.post.mockRejectedValue(new Error('500'))
		mockSetupState = pendingState()
		const w = mountRoot(manifest({ dismissAction: 'dismiss-setup' }))
		wizardOf(w).vm.$emit('close')
		await w.vm.$nextTick()
		expect(w.vm.setupWizardOpen).toBe(false)
	})

	it('does not open in a fresh browser when the status says it was closed', () => {
		mockSetupState = pendingState({ dismissed: true })
		const w = mountRoot(manifest({ dismissAction: 'dismiss-setup' }))
		expect(w.vm.optionalSetupPending).toBe(true)
		expect(w.vm.setupWizardOpen).toBe(false)
	})

	it('reads a dismissed version: closed at this version stays closed, an older one opens again', () => {
		mockSetupState = pendingState({ dismissed: 2 })
		expect(mountRoot(manifest({}, 2)).vm.setupWizardOpen).toBe(false)
		mockSetupState = pendingState({ dismissed: 1 })
		expect(mountRoot(manifest({}, 2)).vm.setupWizardOpen).toBe(true)
	})

	it('ignores an action id that is not a plain slug', async () => {
		mockSetupState = pendingState()
		const w = mountRoot(manifest({ dismissAction: '../config' }))
		wizardOf(w).vm.$emit('close')
		await w.vm.$nextTick()
		expect(dismissPosts()).toHaveLength(0)
	})
})
