/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqBiExport's Ingeschakeld column is a bare switch per row. A switch without
 * text has no name for a screen reader, so `widgetProps.ariaLabel` (a string
 * or a function of the row) names it, read out and not shown.
 *
 * @spec openspec/changes/switch-cell-row-label/specs/switch-cell-row-label/spec.md#requirement-a-switch-cell-can-be-named-per-row-without-showing-the-name
 */
import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function switchCell(widgetProps) {
	return mount(CnCellRenderer, {
		propsData: {
			value: true,
			property: { type: 'boolean' },
			widget: 'switch',
			widgetProps: { checked: (row) => row.enabled === true, onToggle: () => Promise.resolve(), ...widgetProps },
			row: { enabled: true, name: 'Tickets voor het KCC-dashboard' },
		},
	}).find('[data-testid="cn-cell-switch"]')
}

describe('CnCellRenderer switch label', () => {
	it('names the switch per row, for screen readers only, and shows no value', () => {
		const cell = switchCell({ ariaLabel: (row) => `Run ${row.name} on its schedule` })
		const label = cell.find('.hidden-visually')
		expect(label.exists()).toBe(true)
		expect(label.text()).toBe('Run Tickets voor het KCC-dashboard on its schedule')
		expect(cell.text()).toBe('Run Tickets voor het KCC-dashboard on its schedule')
	})

	it('takes a plain string too', () => {
		expect(switchCell({ ariaLabel: 'Enabled' }).find('.hidden-visually').text()).toBe('Enabled')
	})

	it('keeps showing the value without one', () => {
		expect(switchCell({}).find('.hidden-visually').exists()).toBe(false)
	})
})
