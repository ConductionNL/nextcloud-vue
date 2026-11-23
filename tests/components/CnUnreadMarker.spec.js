/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-unread-markers/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnUnreadMarker from '../../src/components/CnUnreadMarker/CnUnreadMarker.vue'

describe('CnUnreadMarker', () => {
	it('hides the dot from assistive tech and says Unread in visually hidden text', () => {
		const w = mount(CnUnreadMarker)
		expect(w.find('.cn-unread-marker__dot').attributes('aria-hidden')).toBe('true')
		const hidden = w.find('.hidden-visually')
		expect(hidden.exists()).toBe(true)
		expect(hidden.text()).toBe('Unread')
	})
})

describe('CnDataTable unread rows', () => {
	const rows = [
		{ id: '1', title: 'Changed', '@self': { unread: true } },
		{ id: '2', title: 'Seen', '@self': { unread: false } },
		{ id: '3', title: 'No marker' },
	]
	const table = () => mount(CnDataTable, { props: { columns: [{ key: 'title', label: 'Title' }], rows, rowKey: 'id' } })

	it('shows the marker and the bold class on the unread row only', () => {
		const w = table()
		const trs = w.findAll('tr.cn-table-row')
		expect(trs[0].classes()).toContain('cn-table-row--unread')
		expect(trs[0].find('[data-testid="cn-unread-marker"]').exists()).toBe(true)
		expect(trs[1].classes()).not.toContain('cn-table-row--unread')
		expect(trs[1].find('[data-testid="cn-unread-marker"]').exists()).toBe(false)
		expect(trs[2].find('[data-testid="cn-unread-marker"]').exists()).toBe(false)
	})

	it('puts the marker in the first cell, before the title', () => {
		const first = table().findAll('tr.cn-table-row')[0].find('td')
		expect(first.find('[data-testid="cn-unread-marker"]').exists()).toBe(true)
		expect(first.text().startsWith('Unread')).toBe(true)
	})
})
