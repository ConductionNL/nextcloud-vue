/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqBiExport "Dataset": a job's datasets as one chip each ("ticket",
 * "client"), not one comma-joined text.
 *
 * @spec openspec/changes/badge-cell-list/specs/badge-cell-list/spec.md#requirement-a-badge-cell-draws-one-chip-per-entry-of-a-list
 */
import { mount } from '@vue/test-utils'

const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function cell(value, widgetProps = {}) {
	return mount(CnCellRenderer, {
		propsData: { value, property: { type: 'array', items: { type: 'string' } }, widget: 'badge', widgetProps, row: {} },
	})
}

describe('CnCellRenderer badge list', () => {
	it('draws one chip per entry', () => {
		const chips = cell(['ticket', 'client']).findAll('.cn-cell-renderer__badges .cn-status-badge')
		expect(chips.map((chip) => chip.text())).toEqual(['ticket', 'client'])
	})

	it('skips empty entries and draws the dash for an empty list', () => {
		expect(cell(['ticket', '', null]).findAll('.cn-status-badge')).toHaveLength(1)
		expect(cell([]).find('.cn-cell-renderer__dash').exists()).toBe(true)
	})

	it('keeps a single value as one badge', () => {
		const wrapper = cell('ticket')
		expect(wrapper.find('.cn-cell-renderer__badges').exists()).toBe(false)
		expect(wrapper.findAll('.cn-status-badge')).toHaveLength(1)
	})
})
