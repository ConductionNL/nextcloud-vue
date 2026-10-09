/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-ref-column-labels/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'

function mountCell(value, widgetProps) {
	return mount(CnCellRenderer, {
		props: { value, widget: 'refLabel', widgetProps },
		global: { stubs: { 'router-link': { props: ['to'], template: '<a class="rl" :data-to="JSON.stringify(to)"><slot /></a>' } } },
	})
}

describe('CnCellRenderer refLabel widget', () => {
	it('shows the label', () => {
		expect(mountCell('c1', { labels: { c1: 'Permit A' } }).text()).toBe('Permit A')
	})
	it('shows the id in mono when the reference did not resolve', () => {
		const w = mountCell('gone', { labels: { gone: null } })
		expect(w.text()).toBe('gone')
		expect(w.find('.cn-cell-renderer__mono').exists()).toBe(true)
	})
	it('shows a placeholder while the batch is pending', () => {
		expect(mountCell('c1', { labels: {} }).text()).toBe('…')
	})
	it('links a resolved label to the detail page', () => {
		const w = mountCell('c1', { labels: { c1: 'Permit A' }, route: 'CaseDetail' })
		expect(JSON.parse(w.find('.rl').attributes('data-to'))).toEqual({ name: 'CaseDetail', params: { id: 'c1' } })
	})
	it('joins several references', () => {
		expect(mountCell(['a', 'b'], { labels: { a: 'A', b: 'B' } }).text()).toBe('A, B')
	})
})
