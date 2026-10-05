/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnSegmentedControl: radio-group semantics and keyboard behaviour.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-segmented-control
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnSegmentedControl from '../../src/components/CnSegmentedControl/CnSegmentedControl.vue'

const OPTIONS = [
	{ value: 'mine', label: 'My work' },
	{ value: 'team', label: 'My team', count: 12 },
	{ value: 'all', label: 'Everyone', disabled: true },
	{ value: 'archive', label: 'Archive' },
]

/**
 * Mount the control attached to the document, so focus can move.
 *
 * @param {object} propsData The props.
 * @return {object} The wrapper.
 */
function mountControl(propsData = {}) {
	return mount(CnSegmentedControl, {
		attachTo: document.body,
		propsData: { options: OPTIONS, modelValue: 'mine', ariaLabel: 'View', ...propsData },
	})
}

describe('CnSegmentedControl', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('is a named radio group with one checked radio', () => {
		wrapper = mountControl()
		expect(wrapper.attributes('role')).toBe('radiogroup')
		expect(wrapper.attributes('aria-label')).toBe('View')
		const radios = wrapper.findAll('[role="radio"]')
		expect(radios).toHaveLength(4)
		expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual(['true', 'false', 'false', 'false'])
	})

	it('shows the label and the count of an option', () => {
		wrapper = mountControl()
		// The space between them is what a screen reader needs to read two words.
		expect(wrapper.findAll('[role="radio"]')[1].element.textContent.replace(/\s+/g, ' ').trim()).toBe('My team 12')
		expect(wrapper.findAll('.cn-segmented-control__count')).toHaveLength(1)
	})

	it('puts only the checked option in the tab order', () => {
		wrapper = mountControl({ modelValue: 'team' })
		expect(wrapper.findAll('[role="radio"]').map((radio) => radio.attributes('tabindex'))).toEqual(['-1', '0', '-1', '-1'])
	})

	it('puts the first enabled option in the tab order when nothing is chosen', () => {
		wrapper = mountControl({ modelValue: null })
		expect(wrapper.findAll('[role="radio"]').map((radio) => radio.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
		expect(wrapper.findAll('[aria-checked="true"]')).toHaveLength(0)
	})

	it('emits the value of a clicked option, and nothing for the one already chosen', async () => {
		wrapper = mountControl()
		await wrapper.findAll('[role="radio"]')[1].trigger('click')
		expect(wrapper.emitted('update:modelValue')).toEqual([['team']])
		await wrapper.findAll('[role="radio"]')[0].trigger('click')
		expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
	})

	it('marks a disabled option disabled and ignores a click on it', async () => {
		wrapper = mountControl()
		const disabled = wrapper.findAll('[role="radio"]')[2]
		expect(disabled.attributes('disabled')).toBeDefined()
		await disabled.trigger('click')
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('moves the choice and the focus with the right arrow', async () => {
		wrapper = mountControl()
		const radios = wrapper.findAll('[role="radio"]')
		radios[0].element.focus()
		await wrapper.trigger('keydown', { key: 'ArrowRight' })
		expect(wrapper.emitted('update:modelValue')).toEqual([['team']])
		expect(document.activeElement).toBe(radios[1].element)
	})

	it('passes over a disabled option', async () => {
		wrapper = mountControl({ modelValue: 'team' })
		const radios = wrapper.findAll('[role="radio"]')
		radios[1].element.focus()
		await wrapper.trigger('keydown', { key: 'ArrowRight' })
		expect(wrapper.emitted('update:modelValue')).toEqual([['archive']])
		expect(document.activeElement).toBe(radios[3].element)
	})

	it('wraps around at both ends and honours Home and End', async () => {
		wrapper = mountControl()
		const radios = wrapper.findAll('[role="radio"]')
		radios[0].element.focus()
		await wrapper.trigger('keydown', { key: 'ArrowLeft' })
		expect(wrapper.emitted('update:modelValue')[0]).toEqual(['archive'])

		await wrapper.setProps({ modelValue: 'archive' })
		radios[3].element.focus()
		await wrapper.trigger('keydown', { key: 'ArrowDown' })
		expect(wrapper.emitted('update:modelValue')[1]).toEqual(['mine'])

		radios[1].element.focus()
		await wrapper.trigger('keydown', { key: 'End' })
		// Already on `archive`, so End focuses it without emitting again.
		expect(document.activeElement).toBe(radios[3].element)
		await wrapper.trigger('keydown', { key: 'Home' })
		expect(wrapper.emitted('update:modelValue')[2]).toEqual(['mine'])
	})

	it('leaves other keys alone', async () => {
		wrapper = mountControl()
		await wrapper.trigger('keydown', { key: 'a' })
		expect(wrapper.emitted('update:modelValue')).toBeUndefined()
	})

	it('accepts plain strings as options', () => {
		wrapper = mountControl({ options: ['Week', 'Month'], modelValue: 'Month' })
		const radios = wrapper.findAll('[role="radio"]')
		expect(radios.map((radio) => radio.text())).toEqual(['Week', 'Month'])
		expect(radios[1].attributes('aria-checked')).toBe('true')
	})

	it('renders the option slot', () => {
		wrapper = mount(CnSegmentedControl, {
			propsData: { options: ['a', 'b'], modelValue: 'a' },
			slots: { option: ({ option, checked }) => h('em', `${option.label}:${checked}`) },
		})
		expect(wrapper.findAll('em').map((em) => em.text())).toEqual(['a:true', 'b:false'])
	})
})
