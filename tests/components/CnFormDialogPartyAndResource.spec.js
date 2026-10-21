/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFormDialog `widget: "party"` (CnPartyPicker over the field's `sources`,
 * storing the row id) and `widget: "resource"` (CnResourceSelect with a scope
 * whose value is read from the page's object). dossiq's PartySearchField and
 * RoleTypePicker, as manifest configuration.
 *
 * @spec openspec/changes/party-picker/specs/party-picker/spec.md#requirement-one-search-field-over-several-kinds-of-party
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
	CnPartyPicker: {
		name: 'CnPartyPicker',
		props: ['modelValue', 'sources', 'inputLabel', 'labelOutside', 'placeholder', 'clearable', 'disabled'],
		emits: ['update:modelValue'],
		template: '<div class="party-picker" />',
	},
	CnResourceSelect: {
		name: 'CnResourceSelect',
		props: ['modelValue', 'register', 'schema', 'labelField', 'scope', 'failedText', 'allowCreate', 'inputLabel'],
		emits: ['update:modelValue'],
		template: '<div class="resource-select" />',
	},
}

const schema = {
	title: 'Role',
	properties: {
		roleType: { type: 'string', title: 'Role type' },
		representedParty: { type: 'string', title: 'Represented party' },
	},
}

const SOURCES = [
	{ id: 'person', register: 'dossiq', schema: 'brpPerson', label: 'Resident', title: '{displayName}' },
	{ id: 'company', register: 'dossiq', schema: 'kvkCompany', label: 'Organisation', title: '{tradeName}', secondary: 'CoC {kvkNumber}' },
]

const OVERRIDES = {
	representedParty: { widget: 'party', label: 'Represented by', placeholder: 'Name, BSN, trade name or KvK number', sources: SOURCES, testid: 'initiator-picker-search' },
	roleType: {
		widget: 'resource',
		label: 'Role',
		resource: {
			register: 'dossiq',
			schema: 'roleType',
			scope: { field: 'caseType', value: '@object.caseType', includeUnscoped: true, dedupeOn: 'genericRole' },
			failedText: 'The roles could not be read.',
		},
	},
}

/**
 * @param {object} [provide] What CnAppRoot and the detail page would provide.
 * @return {object} The wrapper.
 */
function mountDialog(provide = {}) {
	return mount(CnFormDialog, {
		props: { schema, item: null, fieldOverrides: OVERRIDES },
		global: { stubs, provide: { cnTranslate: (k) => ({ 'The roles could not be read.': 'De rollen konden niet worden gelezen.' })[k] ?? k, ...provide } },
	})
}

describe('CnFormDialog party widget', () => {
	it('draws CnPartyPicker over the declared sources with the field label', () => {
		const picker = mountDialog().findComponent({ name: 'CnPartyPicker' })

		expect(picker.props('sources')).toEqual(SOURCES)
		expect(picker.props('inputLabel')).toContain('Represented by')
		expect(picker.props('labelOutside')).toBe(true)
		expect(picker.props('placeholder')).toBe('Name, BSN, trade name or KvK number')
		expect(picker.attributes('data-testid')).toBe('initiator-picker-search')
	})

	it('stores the chosen row id only', async () => {
		const wrapper = mountDialog()
		wrapper.findComponent({ name: 'CnPartyPicker' }).vm.$emit('update:modelValue', 'person-7')

		expect(wrapper.vm.formData.representedParty).toBe('person-7')
	})
})

describe('CnFormDialog resource widget', () => {
	it("reads the scope value off the page's object, by id when it is a relation", () => {
		const select = mountDialog({ cnDetailObjectContext: { value: { objectData: { id: 'case-1', caseType: { id: 'ct-1' } } } } })
			.findComponent({ name: 'CnResourceSelect' })

		expect(select.props('register')).toBe('dossiq')
		expect(select.props('schema')).toBe('roleType')
		expect(select.props('allowCreate')).toBe(false)
		expect(select.props('scope')).toEqual({ field: 'caseType', value: 'ct-1', includeUnscoped: true, dedupeOn: 'genericRole' })
		expect(select.props('failedText')).toBe('De rollen konden niet worden gelezen.')
	})

	it('offers every row when the page has no object to read the scope from', () => {
		const select = mountDialog().findComponent({ name: 'CnResourceSelect' })

		expect(select.props('scope').value).toBe('')
	})

	it('writes the picked id, and null when cleared', async () => {
		const wrapper = mountDialog()
		const select = wrapper.findComponent({ name: 'CnResourceSelect' })
		select.vm.$emit('update:modelValue', 'rt-2')
		expect(wrapper.vm.formData.roleType).toBe('rt-2')
		select.vm.$emit('update:modelValue', '')
		expect(wrapper.vm.formData.roleType).toBeNull()
	})
})
