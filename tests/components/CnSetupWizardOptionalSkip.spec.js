/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A setup step can be skipped, mark its fields optional and close with a
 * note (board PqInstellen, step 4 Organisatie: "(optioneel)" after every
 * label, "Deze stap overslaan", and "Per veld opgeslagen als je verdergaat").
 *
 * @spec openspec/changes/setup-wizard-optional-skip/specs/setup-wizard/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { version: 1, completed: true, steps: {} } })), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { mount, shallowMount } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const CnWizardDialog = require('../../src/components/CnWizardDialog/CnWizardDialog.vue').default
const schema = require('../../src/schemas/app-manifest-v2.schema.json')

const step = {
	id: 'organisation',
	type: 'config-fields',
	title: 'Organisation',
	body: 'Your organisation details.',
	optionalLabels: true,
	skippable: true,
	note: 'Saved per field as you continue.',
	schema: { type: 'object', properties: { company_name: { type: 'string', title: 'Organisation name' } } },
}

describe('CnSetupWizard optional fields, skip and note', () => {
	function mountStep(extra = {}) {
		return shallowMount(CnSetupWizard, {
			props: { appId: 'pipelinq', steps: [{ ...step, ...extra }] },
			global: {
				provide: { cnLook: 'board', cnTranslate: (s) => s },
				stubs: {
					CnWizardDialog: { name: 'CnWizardDialog', props: ['steps'], template: '<div><slot name="step-organisation" /></div>' },
					NcTextField: { name: 'NcTextField', props: ['label'], template: '<input :aria-label="label">' },
				},
			},
		})
	}

	it('marks a field optional after its label', () => {
		expect(mountStep().find('input').attributes('aria-label')).toBe('Organisation name (optional)')
		expect(mountStep({ optionalLabels: false }).find('input').attributes('aria-label')).toBe('Organisation name')
	})

	it('closes the step with its note', () => {
		expect(mountStep().find('[data-testid="cn-setup-step-note"]').text()).toBe('Saved per field as you continue.')
	})

	it('tells the dialog the step can be skipped', () => {
		expect(mountStep().findComponent({ name: 'CnWizardDialog' }).props('steps')[0].skippable).toBe(true)
	})

	it('accepts the keys in the manifest schema', () => {
		const props = schema.properties.setup.properties.steps.items.properties
		expect(props.skippable.type).toBe('boolean')
		expect(props.optionalLabels.type).toBe('boolean')
	})
})

describe('CnWizardDialog skip', () => {
	const stubs = {
		NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
		NcButton: { template: '<button :disabled="disabled" @click="$attrs.onClick && $attrs.onClick()"><slot /></button>', props: ['disabled', 'variant'] },
		NcNoteCard: true,
		NcLoadingIcon: true,
	}
	const steps = [{ id: 'a', label: 'A', skippable: true }, { id: 'b', label: 'B' }]

	it('skips a skippable step without validating it', async () => {
		const validate = jest.fn(() => 'Not valid')
		const w = mount(CnWizardDialog, { props: { steps, validate }, global: { stubs } })
		const skip = w.find('[data-testid="cn-wizard-skip"]')
		expect(skip.exists()).toBe(true)
		await skip.trigger('click')
		expect(validate).not.toHaveBeenCalled()
		expect(w.vm.currentIndex).toBe(1)
		expect(w.find('[data-testid="cn-wizard-skip"]').exists()).toBe(false)
	})
})
