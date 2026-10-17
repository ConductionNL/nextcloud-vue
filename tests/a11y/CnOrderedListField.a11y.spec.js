/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for CnOrderedListField, against the REAL
 * @nextcloud/vue: no WCAG 2.1 AA violations with rows, empty and read-only;
 * every row control is a named button reachable with the keyboard, and the
 * picker carries its label.
 *
 * @spec openspec/changes/ordered-list-field/specs/ordered-list-field/spec.md#requirement-a-user-keeps-an-ordered-list-with-the-keyboard
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnOrderedListField = require('../../src/components/CnOrderedListField/CnOrderedListField.vue').default

const OPTIONS = [{ value: 'woo', label: 'Woo request' }, { value: 'objection', label: 'Objection' }, { value: 'permit', label: 'Environment permit' }]

describe('CnOrderedListField: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	it('has no WCAG 2.1 AA violations with rows', async () => {
		wrapper = mountAttached(CnOrderedListField, { propsData: { modelValue: ['woo', 'objection'], options: OPTIONS, label: 'Case types in my menu', addLabel: 'Add case type' } })
		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations empty and read-only', async () => {
		wrapper = mountAttached(CnOrderedListField, { propsData: { modelValue: [], options: OPTIONS, label: 'Case types in my menu', disabled: true } })
		await expectAccessible(wrapper)
	})

	it('gives every row control a name and keeps them native buttons', () => {
		wrapper = mountAttached(CnOrderedListField, { propsData: { modelValue: ['woo', 'objection'], options: OPTIONS, label: 'Case types in my menu', addLabel: 'Add case type' } })
		const buttons = wrapper.findAll('.cn-ordered-list-field__button')
		expect(buttons).toHaveLength(6)
		buttons.forEach((button) => {
			expect(button.element.tagName).toBe('BUTTON')
			expect(button.attributes('aria-label')).toMatch(/Woo request|Objection/)
		})
		expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
		expect(wrapper.text()).toContain('Add case type')
	})
})
