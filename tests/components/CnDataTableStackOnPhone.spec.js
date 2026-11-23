/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table can stack its rows on a phone (`stackOnPhone`): each cell carries
 * its column name for the stacked layout (larpinq admin-phone-friendly-pages 1.2).
 *
 * @spec openspec/changes/data-table-stack-on-phone/specs/data-table-stack-on-phone/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

const COLUMNS = [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }]
const ROWS = [{ id: 'c1', name: 'Aldric', role: 'Knight' }]

describe('CnDataTable stackOnPhone', () => {
	it('marks the table and names every cell after its column', () => {
		const w = mount(CnDataTable, { props: { columns: COLUMNS, rows: ROWS, stackOnPhone: true } })
		expect(w.find('table').classes()).toContain('cn-data-table--stack')
		const labels = w.findAll('tbody td').map((td) => td.attributes('data-label')).filter(Boolean)
		expect(labels).toEqual(['Name', 'Role'])
	})

	it('leaves the table as it was without it', () => {
		const w = mount(CnDataTable, { props: { columns: COLUMNS, rows: ROWS } })
		expect(w.find('table').classes()).not.toContain('cn-data-table--stack')
		expect(w.findAll('tbody td').some((td) => td.attributes('data-label') !== undefined)).toBe(false)
	})

	it('stacks only under the phone breakpoint', () => {
		const css = fs.readFileSync(path.resolve(__dirname, '../../src/css/table.css'), 'utf8')
		expect(css).toMatch(/@media \(max-width: 600px\) \{[\s\S]*\.cn-data-table--stack td\[data-label\]::before/)
	})
})
