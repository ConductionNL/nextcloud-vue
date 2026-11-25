/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A property row opens from the keyboard: an editable row's name is a button,
 * Enter or Space on it selects the row the way a click does, and a locked row
 * has no button.
 *
 * @spec openspec/changes/properties-table-by-keyboard/specs/properties-table-by-keyboard/spec.md#requirement-a-property-row-opens-from-the-keyboard
 */
import { mount } from '@vue/test-utils'
import CnPropertiesTab from '@/components/CnAdvancedFormDialog/CnPropertiesTab.vue'

const stubs = {
	NcTextField: true,
	NcTextArea: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	NcSelect: true,
}

const schema = {
	properties: {
		title: { type: 'string', title: 'Title' },
		locked: { type: 'string', immutable: true },
	},
}

/** @return {object} the mounted table with a persisted `locked` value. */
function table() {
	return mount(CnPropertiesTab, {
		propsData: { schema, item: { title: 'Hello', locked: 'val' }, formData: {} },
		stubs,
	})
}

/**
 * @param {object} wrapper the mounted table.
 * @param {string} key a property key.
 * @return {object} that row's wrapper.
 */
function row(wrapper, key) {
	const index = wrapper.vm.objectProperties.findIndex(([k]) => k === key)
	return wrapper.findAll('tbody tr').at(index)
}

describe('CnPropertiesTab by keyboard', () => {
	it('gives an editable row a name button', () => {
		const button = row(table(), 'title').find('button.cn-advanced-form-dialog__prop-name-button')
		expect(button.exists()).toBe(true)
		expect(button.attributes('type')).toBe('button')
		expect(button.text()).toBe('Title')
		expect(button.attributes('aria-expanded')).toBe('false')
	})

	it('gives a locked row no button', () => {
		expect(row(table(), 'locked').find('button.cn-advanced-form-dialog__prop-name-button').exists()).toBe(false)
	})

	it('selects the row when its name button is activated', async () => {
		const wrapper = table()
		await row(wrapper, 'title').find('button.cn-advanced-form-dialog__prop-name-button').trigger('click')
		expect(wrapper.emitted('update:selected-property')).toEqual([['title']])
	})

	it('still selects the row on a click elsewhere in it', async () => {
		const wrapper = table()
		await row(wrapper, 'title').find('td').trigger('click')
		expect(wrapper.emitted('update:selected-property')).toEqual([['title']])
	})

	it('marks the open row expanded', () => {
		const wrapper = mount(CnPropertiesTab, {
			propsData: { schema, item: { title: 'Hello' }, formData: {}, selectedProperty: 'title' },
			stubs,
		})
		expect(row(wrapper, 'title').find('button.cn-advanced-form-dialog__prop-name-button').attributes('aria-expanded')).toBe('true')
	})
})
