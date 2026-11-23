/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
 */
import { mount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'

function mountBadge(value, widgetProps) {
	return mount(CnCellRenderer, {
		props: { value, widget: 'badge', widgetProps, formatted: 'Woo-verzoek' },
		global: { stubs: { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } } },
	})
}

describe('CnCellRenderer badge look', () => {
	it('takes the referenced record tone over the column variant, with its icon', () => {
		const w = mountBadge('ct1', { variant: 'info', looks: { ct1: { color: 'red', icon: 'FileDocumentOutline' } } })
		expect(w.find('.cn-status-badge').classes()).toContain('cn-status-badge--error')
		expect(w.find('.icon-stub').attributes('data-name')).toBe('FileDocumentOutline')
	})

	it('keeps the column variant while the record is not read yet', () => {
		const w = mountBadge('ct1', { variant: 'info', looks: {} })
		expect(w.find('.cn-status-badge').classes()).toContain('cn-status-badge--info')
		expect(w.find('.icon-stub').exists()).toBe(false)
	})
})
