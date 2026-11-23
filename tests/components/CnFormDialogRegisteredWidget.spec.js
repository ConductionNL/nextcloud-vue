/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `fieldOverrides[key].widget` that names a registered component mounts
 * that component as the field's control (board DqNieuweZaak, Aanvrager).
 */
const { mount } = require('@vue/test-utils')
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcTextArea: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Case',
	properties: {
		title: { type: 'string', title: 'Title' },
		applicant: { type: 'string', title: 'Applicant' },
	},
}

const ApplicantPicker = {
	name: 'ApplicantPicker',
	props: { value: { type: null, default: null }, field: { type: Object, default: null }, error: { type: String, default: '' } },
	template: '<button class="applicant-picker" @click="$emit(\'input\', \'person-1\')">{{ field && field.label }}</button>',
}

/**
 * @param {object} provide The registries CnAppRoot would provide.
 * @param {object} [fieldOverrides] The overrides.
 * @return {object} The wrapper.
 */
function mountDialog(provide, fieldOverrides = { applicant: { widget: 'ApplicantPicker' } }) {
	return mount(CnFormDialog, {
		propsData: { schema, item: null, fieldOverrides },
		provide,
		stubs,
	})
}

describe('CnFormDialog registered field widget', () => {
	it('mounts a component from the v2 registry', () => {
		const wrapper = mountDialog({ cnRegistry: { ApplicantPicker: { kind: 'component', component: ApplicantPicker } } })
		const picker = wrapper.findComponent(ApplicantPicker)
		expect(picker.exists()).toBe(true)
		expect(picker.props('field').key).toBe('applicant')
		expect(wrapper.find('[data-cn-field="applicant"] .applicant-picker').exists()).toBe(true)
	})

	it('mounts a component from the legacy customComponents map', () => {
		const wrapper = mountDialog({ cnCustomComponents: { ApplicantPicker } })
		expect(wrapper.findComponent(ApplicantPicker).exists()).toBe(true)
	})

	it('writes what the component emits into the form', async () => {
		const wrapper = mountDialog({ cnRegistry: { ApplicantPicker: { component: ApplicantPicker } } })
		await wrapper.find('.applicant-picker').trigger('click')
		expect(wrapper.vm.formData.applicant).toBe('person-1')
		expect(wrapper.findComponent(ApplicantPicker).props('value')).toBe('person-1')
	})

	it('keeps a built-in widget name for the built-in control', () => {
		const Rogue = { name: 'Rogue', template: '<i class="rogue" />' }
		const wrapper = mountDialog({ cnRegistry: { textarea: { component: Rogue } } }, { applicant: { widget: 'textarea' } })
		expect(wrapper.find('.rogue').exists()).toBe(false)
	})

	it('falls back to the text input for a name nothing answers to', () => {
		const wrapper = mountDialog({ cnRegistry: {} })
		expect(wrapper.find('.applicant-picker').exists()).toBe(false)
		expect(wrapper.find('[data-cn-field="applicant"] nc-text-field-stub').exists()).toBe(true)
	})
})
