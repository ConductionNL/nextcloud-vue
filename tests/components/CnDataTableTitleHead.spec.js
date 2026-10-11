/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The first data column's header carries `cn-table-head--title`, the hook the
 * board look's fitted index table sizes it by (screens-index-table-fit-parity).
 */
import { mount } from '@vue/test-utils'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

describe('CnDataTable title header', () => {
	it('marks the first data column header only, after the selection column', () => {
		const w = mount(CnDataTable, {
			props: {
				columns: [{ key: 'subject', label: 'Subject' }, { key: 'client', label: 'Client' }],
				rows: [{ id: '1', subject: 'A', client: 'B' }],
				selectable: true,
			},
		})
		const heads = w.findAll('thead th')
		const marked = heads.filter((th) => th.classes().includes('cn-table-head--title'))
		expect(marked).toHaveLength(1)
		expect(marked[0].text()).toContain('Subject')
		expect(heads[0].classes()).toContain('cn-table-col--checkbox')
	})
})
