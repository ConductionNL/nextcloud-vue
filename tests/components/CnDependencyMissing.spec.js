/**
 * Tests for CnDependencyMissing — the full-page blocking screen shown for
 * unresolved HARD dependencies.
 *
 * Covers REQ-JMR-011 (per-dependency rendering, store-link fallback) and
 * REQ-DIA-2 (admin-aware install/enable button, non-admin "ask your
 * administrator" copy, install-success/fail branches). The success path
 * installs a real app + reloads against the live instance, so it is
 * @e2e-excluded and covered here with useAppInstaller and @nextcloud/auth
 * mocked at the network / auth boundary only.
 */

import { mount } from '@vue/test-utils'

// Admin/non-admin gating boundary.
jest.mock('@nextcloud/auth', () => ({
	getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })),
}))
// Mock the shared installer so the component tests never hit the real
// confirmPassword() + settings/apps/enable round-trip.
const mockInstallAndEnable = jest.fn()
const mockInstallerRefs = { installing: { value: false }, error: { value: null } }
jest.mock('../../src/composables/useAppInstaller.js', () => ({
	useAppInstaller: () => ({
		installing: mockInstallerRefs.installing,
		error: mockInstallerRefs.error,
		installAndEnable: mockInstallAndEnable,
	}),
}))

const { getCurrentUser } = require('@nextcloud/auth')
const CnDependencyMissing = require('../../src/components/CnDependencyMissing/CnDependencyMissing.vue').default

function mountDep(propsData) {
	return mount(CnDependencyMissing, { propsData })
}

describe('CnDependencyMissing', () => {
	beforeEach(() => {
		getCurrentUser.mockReturnValue({ uid: 'admin', isAdmin: true })
		mockInstallAndEnable.mockReset().mockResolvedValue(undefined)
		mockInstallerRefs.installing.value = false
		mockInstallerRefs.error.value = null
	})

	it('renders an item per dependency', () => {
		const wrapper = mountDep({
			dependencies: [
				{ id: 'openregister', name: 'OpenRegister' },
				{ id: 'opencatalogi', name: 'OpenCatalogi' },
			],
		})
		const items = wrapper.findAll('.cn-dependency-missing__item')
		expect(items).toHaveLength(2)
		expect(items.at(0).text()).toContain('OpenRegister')
		expect(items.at(1).text()).toContain('OpenCatalogi')
	})

	it('falls back to id when no name provided', () => {
		const wrapper = mountDep({ dependencies: [{ id: 'openregister' }] })
		expect(wrapper.text()).toContain('openregister')
	})

	it('uses Nextcloud CSS variables only', () => {
		const wrapper = mountDep({ dependencies: [{ id: 'x', name: 'X' }] })
		expect(wrapper.html()).not.toContain('--nldesign-')
	})

	describe('admin install/enable action (REQ-DIA-2)', () => {
		it('renders an install/enable button for an admin', () => {
			const wrapper = mountDep({ dependencies: [{ id: 'openregister', name: 'OpenRegister' }] })
			expect(wrapper.find('[data-testid="cn-dependency-missing-install"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-dependency-missing-ask-admin"]').exists()).toBe(false)
		})

		it('labels the action "Install and enable" for a not-installed dependency', () => {
			const wrapper = mountDep({ dependencies: [{ id: 'openregister', name: 'OpenRegister' }] })
			expect(wrapper.find('[data-testid="cn-dependency-missing-install"]').text()).toContain('Install and enable')
		})

		it('labels the action "Enable" for an installed-but-disabled dependency', () => {
			const wrapper = mountDep({ dependencies: [{ id: 'deck', name: 'Deck', enabled: false }] })
			expect(wrapper.find('[data-testid="cn-dependency-missing-install"]').text()).toContain('Enable')
			expect(wrapper.find('[data-testid="cn-dependency-missing-install"]').text()).not.toContain('Install and enable')
		})

		it('calls mockInstallAndEnable and reloads on success', async () => {
			const reload = jest.fn()
			const original = window.location
			delete window.location
			window.location = { reload }

			const wrapper = mountDep({ dependencies: [{ id: 'openregister', name: 'OpenRegister' }] })
			await wrapper.find('[data-testid="cn-dependency-missing-install"]').trigger('click')
			await Promise.resolve()

			expect(mockInstallAndEnable).toHaveBeenCalledWith('openregister')
			expect(reload).toHaveBeenCalled()

			window.location = original
		})

		it('shows the error and keeps the store link on failure', async () => {
			mockInstallAndEnable.mockImplementation(async () => {
				mockInstallerRefs.error.value = 'Could not download app'
				throw new Error('boom')
			})
			const wrapper = mountDep({ dependencies: [{ id: 'openregister', name: 'OpenRegister' }] })
			await wrapper.find('[data-testid="cn-dependency-missing-install"]').trigger('click')
			await Promise.resolve()
			await wrapper.vm.$nextTick()

			expect(wrapper.find('.cn-dependency-missing__item-error').text()).toContain('Could not download app')
			expect(wrapper.find('.cn-dependency-missing__item-link').attributes('href')).toBe(
				'/index.php/settings/apps/featured/openregister',
			)
		})
	})

	describe('non-admin copy (REQ-DIA-2)', () => {
		beforeEach(() => {
			getCurrentUser.mockReturnValue({ uid: 'bob', isAdmin: false })
		})

		it('renders ask-your-administrator copy and no install button', () => {
			const wrapper = mountDep({ dependencies: [{ id: 'openregister', name: 'OpenRegister' }] })
			expect(wrapper.find('[data-testid="cn-dependency-missing-install"]').exists()).toBe(false)
			const ask = wrapper.find('[data-testid="cn-dependency-missing-ask-admin"]')
			expect(ask.exists()).toBe(true)
			expect(ask.text()).toBe('Ask your administrator to enable OpenRegister')
		})
	})
})
