/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column with a `template` shows the filled line as text. The schema type of
 * the column's key (a `date-time` behind `{occurredAt|relativetime}`) does not
 * format that text again: "today, 09:42" is not a date to parse.
 *
 * @spec openspec/changes/template-cell-is-text/specs/data-table/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const SCHEMA = { properties: { occurredAt: { type: 'string', format: 'date-time', title: 'When' } } }

function mountTable(rows) {
	return mount(CnDataTable, {
		props: {
			rows,
			rowKey: 'id',
			schema: SCHEMA,
			columns: [{ key: 'occurredAt', label: 'When', template: '{occurredAt|relativetime}' }],
		},
	})
}

describe('CnDataTable: a template cell is text', () => {
	it('shows a moment of today as the template wrote it', () => {
		const today = new Date()
		today.setHours(9, 42, 0, 0)
		const w = mountTable([{ id: '1', occurredAt: today.toISOString() }])
		const text = w.find('tbody td').text()
		expect(text).toMatch(/^today, 09[:.]42$/)
	})

	it('shows an older moment as the short date the template wrote, not re-parsed into another year', () => {
		const earlier = new Date()
		earlier.setDate(earlier.getDate() - 10)
		earlier.setHours(14, 5, 0, 0)
		const w = mountTable([{ id: '1', occurredAt: earlier.toISOString() }])
		const text = w.find('tbody td').text()
		expect(text).toMatch(/, 14[:.]05$/)
		expect(text).not.toContain('2001')
		expect(text).not.toBe('—')
	})
})
