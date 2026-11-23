/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the setup wizard's heading is the current step's title,
 * under the eyebrow "<App> instellen, stap N van M" (board DqInstellen,
 * step 4 "Voorbeeldgegevens"). The Nextcloud look keeps "Set up <App>".
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { mount } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const CnWizardDialog = require('../../src/components/CnWizardDialog/CnWizardDialog.vue').default

const steps = [
	{ id: 'welcome', type: 'info', title: 'Welcome' },
	{ id: 'examples', type: 'choice', title: 'Example data', options: [{ value: 'none', label: 'None' }] },
]
const DUTCH = { Welcome: 'Welkom', 'Example data': 'Voorbeeldgegevens', Dossiq: 'Dossiq' }

/**
 * @param {string} look The look.
 * @return {object} The wrapper.
 */
function mountWizard(look) {
	return mount(CnSetupWizard, {
		props: { appId: 'dossiq', appName: 'Dossiq', steps },
		global: { provide: { cnLook: look, cnTranslate: (s) => DUTCH[s] || s } },
	})
}

const heading = (w) => w.find('[data-testid="cn-dialog-title"]').text()
const eyebrow = (w) => w.find('[data-testid="cn-dialog-eyebrow"]').text()

describe('CnSetupWizard step heading', () => {
	it('heads the board dialog with the current step title under the app eyebrow', async () => {
		const w = mountWizard('board')
		expect(heading(w)).toBe('Welkom')
		expect(eyebrow(w)).toBe('Set up Dossiq, step 1 of 2')

		await w.findComponent(CnWizardDialog).vm.jumpTo('examples')
		expect(heading(w)).toBe('Voorbeeldgegevens')
		expect(eyebrow(w)).toBe('Set up Dossiq, step 2 of 2')
	})

	it('keeps "Set up <App>" as the dialog name outside the board look', () => {
		const w = mountWizard('nextcloud')
		expect(w.findComponent(CnWizardDialog).props('dialogTitle')).toBe('Set up Dossiq')
		expect(w.findComponent(CnWizardDialog).props('stepHeading')).toBe(true)
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').exists()).toBe(false)
	})
})

describe('CnWizardDialog stepHeading', () => {
	const wizardSteps = [{ id: 'a', label: 'Audience' }, { id: 'b', label: 'Course' }]
	const slots = { 'step-a': '<p>a</p>', 'step-b': '<p>b</p>' }

	it('names the board dialog after the step only when asked', () => {
		const plain = mount(CnWizardDialog, { props: { steps: wizardSteps, dialogTitle: 'New newsletter' }, slots, global: { provide: { cnLook: 'board' } } })
		expect(heading(plain)).toBe('New newsletter')
		const stepped = mount(CnWizardDialog, { props: { steps: wizardSteps, dialogTitle: 'New newsletter', stepHeading: true }, slots, global: { provide: { cnLook: 'board' } } })
		expect(heading(stepped)).toBe('Audience')
		expect(eyebrow(stepped)).toBe('New newsletter, step 1 of 2')
	})

	it('returns to the dialog title in the result phase', async () => {
		const w = mount(CnWizardDialog, { props: { steps: wizardSteps, dialogTitle: 'New newsletter', stepHeading: true }, slots, global: { provide: { cnLook: 'board' } } })
		w.vm.setResult({ success: true })
		await w.vm.$nextTick()
		expect(heading(w)).toBe('New newsletter')
	})
})
