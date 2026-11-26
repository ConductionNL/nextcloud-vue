/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqPostvak "Voorstel": a message without a proposal reads "Geen zaak"
 * as a grey pill, not a dash. `widgetProps.emptyLabel` names an empty value of
 * the `badge` widget, through the host translate.
 *
 * @spec openspec/changes/badge-cell-empty-label/specs/badge-cell-empty-label/spec.md#requirement-a-badge-cell-can-name-an-empty-value
 */
import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

/**
 * Mount a badge cell.
 *
 * @param {unknown} value The value.
 * @param {object} widgetProps The widget props.
 * @return {object} The wrapper.
 */
function cell(value, widgetProps = {}) {
	return mount(CnCellRenderer, {
		propsData: { value, property: { type: 'string' }, widget: 'badge', widgetProps, row: {} },
		global: { provide: { cnTranslate: (key) => (key === 'No case' ? 'Geen zaak' : key) } },
	})
}

describe('CnCellRenderer badge: an empty value can say so', () => {
	it('draws the empty label as a grey pill, translated', () => {
		const pill = cell(null, { emptyLabel: 'No case' }).find('[data-testid="cn-cell-badge-empty"]')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toBe('Geen zaak')
	})

	it('keeps the dash without an empty label', () => {
		const wrapper = cell(null)
		expect(wrapper.find('[data-testid="cn-cell-badge-empty"]').exists()).toBe(false)
		expect(wrapper.find('.cn-cell-renderer__dash').exists()).toBe(true)
	})

	it('draws the value, not the empty label, when there is one', () => {
		const wrapper = cell('2026-0206', { emptyLabel: 'No case' })
		expect(wrapper.find('[data-testid="cn-cell-badge-empty"]').exists()).toBe(false)
		expect(wrapper.text()).toContain('2026-0206')
	})
})
