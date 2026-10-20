/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSettingsField `date`, `datetime-local`, `email` and `url`: text fields of
 * that input type (dossiq's RebindPropertyField, one field per kind).
 *
 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md
 */
import { mount } from '@vue/test-utils'
import CnSettingsField from '../../src/components/CnSettingsField/CnSettingsField.vue'

/**
 * @param {object} field The field.
 * @param {object} [props] More props.
 * @return {import('@vue/test-utils').VueWrapper} The field.
 */
function make(field, props = {}) {
	return mount(CnSettingsField, { props: { field, ...props } })
}

describe('CnSettingsField input types', () => {
	it.each([
		['date', 'date'],
		['datetime-local', 'datetime-local'],
		['datetime', 'datetime-local'],
		['date-time', 'datetime-local'],
		['email', 'email'],
		['url', 'url'],
		['password', 'password'],
		['text', 'text'],
		['string', 'text'],
	])('draws %s as a text field of type %s', (type, input) => {
		const field = make({ key: 'f', label: 'Field', type }).findComponent({ name: 'NcTextField' })

		expect(field.attributes('type')).toBe(input)
		expect(field.attributes('label')).toBe('Field')
	})

	it('emits the text the input holds', () => {
		const wrapper = make({ key: 'f', label: 'Built', type: 'date' })
		wrapper.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', '1998-05-01')

		expect(wrapper.emitted('update:modelValue')).toEqual([['1998-05-01']])
	})

	it('ties the error under the control to it', () => {
		const wrapper = make({ key: 'f', label: 'Mail', type: 'email' }, { error: 'This value does not fit this field.' })

		expect(wrapper.find('[data-testid="cn-settings-field-error-f"]').text()).toBe('This value does not fit this field.')
	})
})
