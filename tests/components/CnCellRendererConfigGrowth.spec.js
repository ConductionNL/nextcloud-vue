/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Options that let an app declare a cell instead of drawing one: the `number`
 * widget with a unit and a flag, OpenRegister's withheld marker, and a badge
 * tooltip that depends on the row.
 *
 * @spec openspec/changes/cell-config-growth/specs/cell-config-growth/spec.md
 */

import { mount } from '@vue/test-utils'
import CnCellRenderer from '@/components/CnCellRenderer/CnCellRenderer.vue'

const dutch = {
	'{count} working day': '{count} werkdag',
	'{count} working days': '{count} werkdagen',
	stuck: 'vast',
	'Priority set by hand': 'Prioriteit met de hand gezet',
}
const cnTranslate = (key) => dutch[key] ?? key

/**
 * Mount one cell.
 *
 * @param {object} props Props for CnCellRenderer.
 * @param {object} [provide] Injections.
 * @return {object} The wrapper.
 */
function cell(props, provide = {}) {
	return mount(CnCellRenderer, { props, global: { provide } })
}

const DWELL = {
	unit: { one: '{count} working day', other: '{count} working days' },
	flagWhen: { field: 'statusDwellBreached', equals: true, text: 'stuck', variant: 'warning' },
}

describe('CnCellRenderer: the number widget', () => {
	it('reads the value with its unit, through the app translate', () => {
		const wrapper = cell({ value: 12, widget: 'number', widgetProps: DWELL, row: {} }, { cnTranslate })

		expect(wrapper.find('[data-testid="cn-cell-number"]').text()).toBe('12 werkdagen')
		expect(wrapper.find('[data-testid="cn-cell-number-flag"]').exists()).toBe(false)
		wrapper.unmount()
	})

	it('picks the singular for one', () => {
		const wrapper = cell({ value: 1, widget: 'number', widgetProps: DWELL, row: {} })

		expect(wrapper.find('[data-testid="cn-cell-number"]').text()).toBe('1 working day')
		wrapper.unmount()
	})

	it('adds the flag chip with text when the row field holds, and colours the number', () => {
		const wrapper = cell({ value: 9, widget: 'number', widgetProps: DWELL, row: { statusDwellBreached: true } }, { cnTranslate })
		const number = wrapper.find('[data-testid="cn-cell-number"]')
		const flag = wrapper.find('[data-testid="cn-cell-number-flag"]')

		expect(flag.exists()).toBe(true)
		expect(flag.text()).toBe('vast')
		expect(flag.classes()).toContain('cn-status-badge--warning')
		expect(number.classes()).toContain('cn-cell-renderer__number--warning')
		wrapper.unmount()
	})

	it('renders an empty cell for an empty value, never 0', () => {
		for (const value of [null, undefined, '']) {
			const wrapper = cell({ value, widget: 'number', widgetProps: DWELL, row: { statusDwellBreached: true } })

			expect(wrapper.find('[data-testid="cn-cell-number"]').exists()).toBe(false)
			expect(wrapper.text()).toBe('')
			wrapper.unmount()
		}
	})

	it('reads a plain number without a unit', () => {
		const wrapper = cell({ value: 3, widget: 'number', row: {} })

		expect(wrapper.find('[data-testid="cn-cell-number"]').text()).toBe('3')
		wrapper.unmount()
	})
})

describe('CnCellRenderer: a withheld value', () => {
	it('reads Withheld with the access reason as its tooltip, not [object Object]', () => {
		const wrapper = cell({ value: { '@withheld': true, reason: 'access' } })
		const withheld = wrapper.find('[data-testid="cn-cell-withheld"]')

		expect(withheld.exists()).toBe(true)
		expect(withheld.text()).toBe('Withheld')
		expect(withheld.attributes('title')).toBe('You may not open the linked object, so its value is not shown.')
		expect(wrapper.text()).not.toContain('[object Object]')
		wrapper.unmount()
	})

	it('names no reason it was not given', () => {
		const wrapper = cell({ value: { '@withheld': true } })

		expect(wrapper.find('[data-testid="cn-cell-withheld"]').attributes('title')).toBe('This value is not shown.')
		wrapper.unmount()
	})

	it('hides the lock from assistive technology', () => {
		const wrapper = cell({ value: { '@withheld': true } })

		expect(wrapper.find('.cn-cell-renderer__withheld-icon').attributes('aria-hidden')).toBe('true')
		wrapper.unmount()
	})

	it('wins over a registered cell widget and a built-in one', () => {
		const Own = { template: '<b class="own">own</b>' }
		const registered = cell({ value: { '@withheld': true }, widget: 'own' }, { cnCellWidgets: { own: Own } })
		const badge = cell({ value: { '@withheld': true }, widget: 'badge' })

		expect(registered.find('.own').exists()).toBe(false)
		expect(registered.find('[data-testid="cn-cell-withheld"]').exists()).toBe(true)
		expect(badge.find('.cn-status-badge').exists()).toBe(false)
		registered.unmount()
		badge.unmount()
	})

	it('leaves an ordinary value alone', () => {
		const wrapper = cell({ value: 'Building 12' })

		expect(wrapper.find('[data-testid="cn-cell-withheld"]').exists()).toBe(false)
		expect(wrapper.text()).toBe('Building 12')
		wrapper.unmount()
	})
})

describe('CnCellRenderer: a badge tooltip from the row', () => {
	const widgetProps = { titleWhen: { field: 'priorityOverride', text: 'Priority set by hand' } }

	it('carries the translated tooltip when the row field holds', () => {
		const wrapper = cell({ value: 'high', widget: 'badge', widgetProps, row: { priorityOverride: 'high' } }, { cnTranslate })

		expect(wrapper.find('.cn-status-badge').attributes('title')).toBe('Prioriteit met de hand gezet')
		wrapper.unmount()
	})

	it('carries no tooltip otherwise', () => {
		const wrapper = cell({ value: 'high', widget: 'badge', widgetProps, row: {} })

		expect(wrapper.find('.cn-status-badge').attributes('title')).toBeUndefined()
		wrapper.unmount()
	})
})
