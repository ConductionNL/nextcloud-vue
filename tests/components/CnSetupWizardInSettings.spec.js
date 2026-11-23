/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The setup wizard from an admin page (BLD-Dq-I, DqInstellen): the shell
 * names the app, so the title reads "{app} instellen" and the eyebrow "...,
 * stap N van M" instead of "Set up this app"; it hands the wizard the app's
 * own catalog as `cnTranslate`, since no CnAppRoot wraps an admin page; the
 * wizard's own button labels go through the library catalog. A board choice
 * step sets its intro as a plain paragraph above the cards and its `note`
 * under them.
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/initial-state', () => ({ loadState: jest.fn((app, key, def) => def) }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => url) }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => `${app}:` + text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { mount, shallowMount } = require('@vue/test-utils')
const CnAdminSettingsShell = require('../../src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue').default
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const CnWizardDialog = require('../../src/components/CnWizardDialog/CnWizardDialog.vue').default

const SECTION = { template: '<div class="settings-section"><slot name="name" /><slot /></div>' }
const steps = [{ id: 'kind', type: 'choice', title: 'Kind', body: 'Pick one.', note: 'You can change this later.', options: [{ value: 'a', label: 'A' }] }]

describe('CnSetupWizard from CnAdminSettingsShell', () => {
	it('names the app and hands the wizard the app\'s own catalog', async () => {
		const wrapper = mount(CnAdminSettingsShell, {
			props: { appId: 'dossiq', appName: 'Dossiq', environment: 'production', showSetup: true, setupSteps: steps },
			global: { stubs: { NcSettingsSection: SECTION, CnBuildiqEditButton: true, CnEnvironmentBanner: true, CnCredentials: true, CnSetupWizard: true } },
		})
		await wrapper.find('[data-testid="cn-admin-run-setup"]').trigger('click')
		const wizard = wrapper.findComponent(CnSetupWizard)
		expect(wizard.props('appName')).toBe('Dossiq')
		expect(wizard.vm.$.provides.cnTranslate('Pick one.')).toBe('dossiq:Pick one.')
	})

	it('translates the wizard dialog\'s own default labels through the library catalog', () => {
		const props = CnWizardDialog.props
		for (const key of ['cancelLabel', 'backLabel', 'nextLabel', 'submitLabel', 'closeLabel', 'successText', 'dialogTitle']) {
			expect(typeof props[key].default).toBe('function')
			expect(props[key].default()).toMatch(/^nextcloud-vue:/)
		}
	})
})

describe('a board choice step', () => {
	const mountStep = (look) => shallowMount(CnSetupWizard, {
		props: { appId: 'dossiq', steps },
		global: { provide: { cnLook: look, cnTranslate: (s) => s }, stubs: { CnWizardDialog: { template: '<div><slot name="step-kind" /></div>' } } },
	})

	it('sets the intro as a plain paragraph and the note under the options', () => {
		const wrapper = mountStep('board')
		expect(wrapper.find('[data-testid="cn-setup-step-intro"]').element.tagName).toBe('P')
		expect(wrapper.find('[data-testid="cn-setup-step-intro"]').text()).toBe('Pick one.')
		expect(wrapper.find('[data-testid="cn-setup-step-note"]').text()).toBe('You can change this later.')
	})

	it('keeps the intro note card outside the board look, and the footnote', () => {
		const wrapper = mountStep('nextcloud')
		expect(wrapper.find('[data-testid="cn-setup-step-intro"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-setup-step-note"]').exists()).toBe(true)
	})

	it('reads `footnote` as well as `note`', () => {
		expect(CnSetupWizard.methods.stepNote.call({ cnTranslate: (s) => s }, { footnote: 'Later.' })).toBe('Later.')
	})
})
