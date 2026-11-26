/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPeopleWidgetForm: an out-of-range birthday window keeps the form invalid,
 * and a stored unknown sort key falls back to Display name with a message.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
import { mount } from '@vue/test-utils'
import CnPeopleWidgetForm from '@/components/CnPeopleWidgetForm/CnPeopleWidgetForm.vue'

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`)),
}))

const stubs = {
	NcSelect: {
		name: 'NcSelect',
		props: ['modelValue', 'options', 'inputLabel'],
		emits: ['update:modelValue'],
		template: '<div class="nc-select" :data-label="inputLabel" :data-value="modelValue" />',
	},
}

/**
 * Mount the form.
 *
 * @param {object} [props] the props.
 * @return {object} the wrapper.
 */
function mountForm(props = {}) {
	return mount(CnPeopleWidgetForm, { props, global: { stubs } })
}

describe('CnPeopleWidgetForm birthday window', () => {
	it('is valid with the defaults', () => {
		expect(mountForm().vm.validate()).toEqual([])
	})

	it('stays invalid while the window is out of range, and emits so the host revalidates', async () => {
		const wrapper = mountForm()
		const input = wrapper.find('input[type="number"]')
		await input.setValue('50')
		expect(wrapper.text()).toContain('Must be between 0 and 30')
		expect(wrapper.vm.validate()).toContain('Must be between 0 and 30')
		expect(wrapper.emitted('update:content')).toHaveLength(1)
		expect(wrapper.emitted('update:content')[0][0].birthdayWindowDays).toBe(7)

		await input.setValue('14')
		expect(wrapper.vm.validate()).toEqual([])
		expect(wrapper.emitted('update:content').at(-1)[0].birthdayWindowDays).toBe(14)
	})

	it('does not hold an out-of-range window against the form once birthdays are off', async () => {
		const wrapper = mountForm()
		await wrapper.find('input[type="number"]').setValue('-1')
		expect(wrapper.vm.validate()).not.toEqual([])
		const birthdays = wrapper.findAll('input[type="checkbox"]')[1]
		await birthdays.setValue(false)
		expect(wrapper.vm.validate()).toEqual([])
	})
})

describe('CnPeopleWidgetForm sort key', () => {
	it('shows a stored unknown sortBy as Display name, with a message, and is invalid until a sort is picked', async () => {
		const wrapper = mountForm({ editingWidget: { content: { layout: 'grid', sortBy: 'unknown-field' } } })
		const sort = wrapper.findAll('.nc-select').find((select) => select.attributes('data-label') === 'Sort by')
		expect(sort.attributes('data-value')).toBe('displayName')
		expect(wrapper.find('[role="alert"]').text()).toBe('Unknown sort key "unknown-field". Display name is used instead.')
		expect(wrapper.vm.validate()).toEqual(['Unknown sort key "unknown-field". Display name is used instead.'])

		sort.findComponent({ name: 'NcSelect' }).vm.$emit('update:modelValue', 'displayName')
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[role="alert"]').exists()).toBe(false)
		expect(wrapper.vm.validate()).toEqual([])
		expect(wrapper.emitted('update:content').at(-1)[0].sortBy).toBe('displayName')
	})

	it('keeps a known stored sortBy without a message', () => {
		const wrapper = mountForm({ editingWidget: { content: { sortBy: 'group' } } })
		expect(wrapper.find('[role="alert"]').exists()).toBe(false)
		expect(wrapper.vm.validate()).toEqual([])
	})
})
