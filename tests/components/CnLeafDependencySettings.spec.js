/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnLeafDependencySettings — the admin-settings section that
 * replaced CnAppRoot's stack of in-app soft-dependency banners.
 *
 * The behaviour that had to survive the move is the TWO-STATE distinction:
 * an app that is not installed offers "Install and enable"; one that is
 * installed but disabled offers "Enable". Collapsing those into one label
 * would be invisible — the section would still render, still list the app,
 * and still have a button — so it is asserted directly.
 */

import { mount } from '@vue/test-utils'

const { ref } = require('vue')

const mockInstallAndEnable = jest.fn()
// REAL refs, not `{ value: false }` stand-ins: setup() unwraps refs onto the
// instance, and a plain object is not unwrapped — `this.installing` would be
// the wrapper object, which is truthy, so the install button would render
// permanently disabled and every click assertion would fail for the wrong
// reason.
const mockInstallerRefs = { installing: ref(false), error: ref(null) }
jest.mock('../../src/composables/useAppInstaller.js', () => ({
	useAppInstaller: () => ({
		installing: mockInstallerRefs.installing,
		error: mockInstallerRefs.error,
		installAndEnable: mockInstallAndEnable,
	}),
}))

// Per-app status, driven per test. `installed: true, enabled: false` is the
// "installed but disabled" case; both false is "not installed".
const statuses = {}
jest.mock('../../src/composables/useAppStatus.js', () => ({
	useAppStatus: (id) => ({
		installed: { value: !!(statuses[id] && statuses[id].installed) },
		enabled: { value: !!(statuses[id] && statuses[id].enabled) },
		loading: { value: !!(statuses[id] && statuses[id].loading) },
	}),
}))

const CnLeafDependencySettings = require('../../src/components/CnLeafDependencySettings/CnLeafDependencySettings.vue').default

const stubs = {
	CnSettingsSection: { props: ['name', 'description'], template: '<section><h3>{{ name }}</h3><slot /></section>' },
	NcButton: { template: '<button :disabled="$attrs.disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>' },
	NcLoadingIcon: { template: '<span class="loading" />' },
	AlertCircleOutline: true,
	PuzzleOutline: true,
	CheckCircleOutline: true,
	Download: true,
}

const mountSection = (propsData = {}) => mount(CnLeafDependencySettings, {
	propsData: { appId: 'dossiq', ...propsData },
	stubs,
})

describe('CnLeafDependencySettings', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		Object.keys(statuses).forEach((k) => delete statuses[k])
		mockInstallerRefs.installing.value = false
		mockInstallerRefs.error.value = null
		mockInstallAndEnable.mockResolvedValue(undefined)
	})

	it('lists an unresolved optional dependency with an install action', () => {
		const w = mountSection({ dependencies: [{ id: 'deck', name: 'Deck', required: false }] })
		expect(w.find('[data-testid="cn-leaf-dependency-deck"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-leaf-dependency-install-deck"]').exists()).toBe(true)
	})

	// The distinction the old banner made, preserved. Losing it would still
	// render a working-looking row — with the wrong verb on the button.
	it('says "Install and enable" for a missing app and "Enable" for a disabled one', () => {
		statuses.forms = { installed: true, enabled: false }
		const w = mountSection({
			dependencies: [
				{ id: 'deck', name: 'Deck', required: false },
				{ id: 'forms', name: 'Forms', required: false },
			],
		})
		expect(w.find('[data-testid="cn-leaf-dependency-install-deck"]').text()).toBe('Install and enable')
		expect(w.find('[data-testid="cn-leaf-dependency-install-forms"]').text()).toBe('Enable')
		expect(w.find('[data-testid="cn-leaf-dependency-forms"]').text()).toContain('installed but disabled')
	})

	it('omits a dependency that is installed and enabled', () => {
		statuses.deck = { installed: true, enabled: true }
		const w = mountSection({ dependencies: [{ id: 'deck', required: false }] })
		expect(w.find('[data-testid="cn-leaf-dependency-deck"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-leaf-dependency-settings-resolved"]').exists()).toBe(true)
	})

	it('normalises bare string dependencies as required', () => {
		const w = mountSection({ dependencies: ['openregister'] })
		expect(w.find('[data-testid="cn-leaf-dependency-openregister"]').classes())
			.toContain('cn-leaf-dependency-settings__row--required')
	})

	it('sorts required dependencies above optional ones', () => {
		const w = mountSection({
			dependencies: [
				{ id: 'deck', name: 'Deck', required: false },
				{ id: 'openregister', name: 'OpenRegister', required: true },
			],
		})
		const ids = w.findAll('.cn-leaf-dependency-settings__row').map((r) => r.attributes('data-testid'))
		expect(ids).toEqual(['cn-leaf-dependency-openregister', 'cn-leaf-dependency-deck'])
	})

	it('installs through the shared installer and reports it upward', async () => {
		const w = mountSection({ dependencies: [{ id: 'deck', required: false }] })
		await w.find('[data-testid="cn-leaf-dependency-install-deck"]').trigger('click')
		expect(mockInstallAndEnable).toHaveBeenCalledWith('deck')
		expect(w.emitted('installed')[0]).toEqual([{ id: 'deck' }])
	})

	it('shows ask-your-administrator copy instead of the button for a non-admin', () => {
		const w = mountSection({ dependencies: [{ id: 'deck', name: 'Deck', required: false }], isAdmin: false })
		expect(w.find('[data-testid="cn-leaf-dependency-install-deck"]').exists()).toBe(false)
		expect(w.find('.cn-leaf-dependency-settings__ask-admin').text()).toContain('Deck')
	})

	it('falls back to the injected manifest when no dependencies prop is given', () => {
		const w = mount(CnLeafDependencySettings, {
			propsData: { appId: 'dossiq' },
			provide: { cnManifest: { dependencies: [{ id: 'deck', required: false }] } },
			stubs,
		})
		expect(w.find('[data-testid="cn-leaf-dependency-deck"]').exists()).toBe(true)
	})
})
