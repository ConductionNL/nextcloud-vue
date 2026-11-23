/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktypeVelden "In de lijst" draws a plain checkbox per field, ticked when
 * the case type shows the field in its case list. The switch cell draws a
 * checkbox with `widgetProps.type: "checkbox"`, and without a `checked`
 * function a formatter that answers true or false decides whether it is on.
 *
 * @spec openspec/changes/cell-toggle-request/specs/cell-renderer/spec.md#requirement-a-switch-cell-can-draw-a-checkbox-whose-state-a-formatter-answers
 */
import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function cell(propsData, formatters = {}) {
	return mount(CnCellRenderer, {
		propsData: { property: { type: 'string' }, widget: 'switch', row: { name: 'welstandsgebied' }, ...propsData },
		provide: { cnFormatters: formatters },
	})
}

describe('CnCellRenderer switch as a checkbox', () => {
	it('draws a checkbox when widgetProps.type is checkbox', () => {
		const w = cell({ value: true, widgetProps: { type: 'checkbox', onToggle: () => Promise.resolve() } })
		expect(w.findComponent({ name: 'NcCheckboxRadioSwitch' }).attributes('type')).toBe('checkbox')
	})

	it('keeps drawing a switch by default', () => {
		const w = cell({ value: true, widgetProps: { onToggle: () => Promise.resolve() } })
		expect(w.findComponent({ name: 'NcCheckboxRadioSwitch' }).attributes('type')).toBe('switch')
	})

	it('is on when its formatter answers true', () => {
		const w = cell({ value: 'welstandsgebied', formatter: 'inList', widgetProps: { type: 'checkbox' } }, { inList: (value) => value === 'welstandsgebied' })
		expect(w.vm.switchChecked).toBe(true)
	})

	it('is off when its formatter answers false', () => {
		const w = cell({ value: 'bouwkosten', formatter: 'inList', widgetProps: { type: 'checkbox' } }, { inList: (value) => value === 'welstandsgebied' })
		expect(w.vm.switchChecked).toBe(false)
	})
})
