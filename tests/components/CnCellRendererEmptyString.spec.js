/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An empty string value is not a boolean `true` (DqAfdelingen: a member
 * without a role showed a check mark in "Rollen").
 *
 * @spec openspec/changes/cell-renderer-empty-string-is-not-true/specs/cell-renderer-empty-string-is-not-true/spec.md#requirement-an-empty-string-value-is-not-a-boolean-true
 */
const { mount } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const CnSegmentedControl = require('../../src/components/CnSegmentedControl/CnSegmentedControl.vue').default
const CnChoiceCards = require('../../src/components/CnChoiceCards/CnChoiceCards.vue').default
const CnPropertyValueCell = require('../../src/components/CnAdvancedFormDialog/CnPropertyValueCell.vue').default

describe('an empty string value', () => {
	it('renders an empty text cell without a check mark', () => {
		const wrapper = mount(CnCellRenderer, { props: { value: '' } })
		expect(wrapper.vm.value).toBe('')
		expect(wrapper.classes()).not.toContain('cn-cell-renderer--boolean')
		expect(wrapper.find('.cn-cell-renderer__icon--success').exists()).toBe(false)
	})

	it('still renders a boolean true as a check mark', () => {
		const wrapper = mount(CnCellRenderer, { props: { value: true } })
		expect(wrapper.classes()).toContain('cn-cell-renderer--boolean')
	})

	it.each([
		['CnCellRenderer', CnCellRenderer, 'value'],
		['CnSegmentedControl', CnSegmentedControl, 'modelValue'],
		['CnChoiceCards', CnChoiceCards, 'modelValue'],
		['CnPropertyValueCell', CnPropertyValueCell, 'value'],
	])('%s lists String before Boolean', (name, component, prop) => {
		const types = component.props[prop].type
		expect(types.indexOf(String)).toBeLessThan(types.indexOf(Boolean))
	})
})
