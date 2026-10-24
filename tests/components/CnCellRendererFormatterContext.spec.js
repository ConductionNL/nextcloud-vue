/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app's cell formatter can read the record of the page the table sits on:
 * DqZaaktypeVelden's "In de lijst" asks whether the case type shows a field
 * as a column of its case list, which the field row alone cannot say.
 *
 * @spec openspec/changes/cell-formatter-page-record/specs/cell-renderer/spec.md#requirement-a-cell-formatter-can-read-the-page-record
 */
import { mount } from '@vue/test-utils'
import CnCellRenderer from '@/components/CnCellRenderer/CnCellRenderer.vue'

const caseType = { id: 'ct-1', 'x-index': { columns: ['bouwkosten'] } }

/**
 * Mount one cell with a formatter that reports what it was given.
 *
 * @param {object} provide The injections besides the formatter.
 * @return {object} The formatter's calls and the wrapper.
 */
function cell(provide) {
	const calls = []
	const inList = (value, row, property, options, context) => {
		calls.push(context)
		const columns = context?.object?.['x-index']?.columns || []
		return columns.includes(row.name) ? 'Yes' : 'No'
	}
	const wrapper = mount(CnCellRenderer, {
		props: { value: 'bouwkosten', row: { name: 'bouwkosten' }, property: { type: 'string' }, formatter: 'inList' },
		global: { provide: { cnFormatters: { inList }, ...provide } },
	})
	return { calls, wrapper }
}

describe('CnCellRenderer formatter context', () => {
	it('hands the formatter the page record from the detail page', () => {
		const { calls, wrapper } = cell({ cnObjectContext: { value: { objectId: 'ct-1', object: caseType } } })
		expect(wrapper.text()).toBe('Yes')
		expect(calls[0]).toEqual({ objectId: 'ct-1', object: caseType })
	})

	it('reads the v2 grid holder too', () => {
		const { wrapper } = cell({ cnDetailObjectContext: { value: { objectId: 'ct-1', objectData: caseType } } })
		expect(wrapper.text()).toBe('Yes')
	})

	it('hands an empty context outside a detail page', () => {
		const { calls, wrapper } = cell({})
		expect(wrapper.text()).toBe('No')
		expect(calls[0]).toEqual({ objectId: null, object: null })
	})
})
