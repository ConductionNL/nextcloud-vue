/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `#actions-start` footer slot of CnWizardDialog, passed through by
 * CnSetupWizard: a host draws more ways out of the wizard before its own
 * buttons (thematiq's first-time setup, board TqSetupWelkom: "Skip, keep
 * Nextcloud as it is" ends the whole setup on every step).
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { version: 1, completed: false, steps: {} } })), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const { mount, shallowMount } = require('@vue/test-utils')
const { h } = require('vue')
const CnWizardDialog = require('../../src/components/CnWizardDialog/CnWizardDialog.vue').default
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default

const stubs = {
	NcDialog: { template: '<div><slot /><div class="actions"><slot name="actions" /></div></div>' },
	NcButton: {
		template: '<button :disabled="disabled" @click="$attrs.onClick && $attrs.onClick()"><slot /></button>',
		props: ['disabled', 'type', 'variant', 'alignment'],
	},
	NcNoteCard: { template: '<div><slot /></div>' },
	NcLoadingIcon: true,
}

const steps = [
	{ id: 'welcome', label: 'Welcome' },
	{ id: 'done', label: 'Done' },
]

describe('CnWizardDialog #actions-start', () => {
	function mountDialog() {
		return mount(CnWizardDialog, {
			propsData: { steps },
			scopedSlots: {
				'step-welcome': '<p>Hello</p>',
				'step-done': '<p>Bye</p>',
				'actions-start': '<button data-test="skip-all" @click="props.close()">Skip setup {{ props.stepIndex + 1 }} of {{ props.totalSteps }} {{ props.currentStep.id }} {{ props.isFirst }} {{ props.isLast }}</button>',
			},
			stubs,
		})
	}

	it('draws the host\'s actions before the wizard\'s own buttons, with the step in scope', async () => {
		const wrapper = mountDialog()
		const buttons = wrapper.findAll('.actions button')
		expect(buttons.at(0).attributes('data-test')).toBe('skip-all')
		expect(buttons.at(0).text()).toBe('Skip setup 1 of 2 welcome true false')

		await wrapper.vm.next()
		expect(wrapper.find('[data-test="skip-all"]').text()).toBe('Skip setup 2 of 2 done false true')
	})

	it('closes the wizard from the slot', async () => {
		const wrapper = mountDialog()
		await wrapper.find('[data-test="skip-all"]').trigger('click')
		expect(wrapper.emitted('close')).toHaveLength(1)
	})

	it('draws nothing extra without the slot', () => {
		const wrapper = mount(CnWizardDialog, {
			propsData: { steps },
			scopedSlots: { 'step-welcome': '<p>Hello</p>', 'step-done': '<p>Bye</p>' },
			stubs,
		})
		expect(wrapper.find('[data-test="skip-all"]').exists()).toBe(false)
	})
})

describe('CnSetupWizard passes #actions-start through', () => {
	function mountSetup(slots) {
		return shallowMount(CnSetupWizard, {
			props: { appId: 'thematiq', steps: [{ id: 'welcome', type: 'info', title: 'Welcome', body: 'Hi' }] },
			slots,
			global: {
				provide: { cnTranslate: (s) => s },
				stubs: {
					CnWizardDialog: {
						name: 'CnWizardDialog',
						template: '<div><slot name="actions-start" :currentStep="{ id: \'welcome\' }" :stepIndex="0" :totalSteps="1" :isFirst="true" :isLast="true" :loading="false" :close="() => {}" /></div>',
					},
				},
			},
		})
	}

	it('hands the dialog the host\'s actions with the dialog\'s scope', () => {
		const wrapper = mountSetup({
			'actions-start': (footer) => h('button', { 'data-test': 'skip-all' }, footer.currentStep.id),
		})
		expect(wrapper.find('[data-test="skip-all"]').text()).toBe('welcome')
	})

	it('adds nothing when the host gives no actions', () => {
		expect(mountSetup({}).find('[data-test="skip-all"]').exists()).toBe(false)
	})
})
