/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An endpoint index source takes the filters its page declares in
 * `sourceConfig.searchFields`, so a board's narrow select reaches the endpoint.
 *
 * @spec openspec/changes/pl4-board-card-actions/specs/pl4-board-card-actions/spec.md#requirement-an-endpoint-source-takes-declared-filters
 */
import { declaredSearchFields } from '../../src/components/CnIndexPage/useNamedSource.js'
import { searchFieldParams } from '../../src/utils/searchFieldParams.js'

describe('declaredSearchFields', () => {
	it('keeps a source\'s own declaration', () => {
		const own = { priority: { single: true } }
		expect(declaredSearchFields({ searchFields: own }, { pipeline: { single: true } })).toBe(own)
	})

	it('takes the page\'s declaration for a source that has none, and sends the chosen value', () => {
		const declared = declaredSearchFields({}, { pipeline: { single: true } })
		expect(searchFieldParams(declared, { pipeline: ['p1'] }, 'endpoint')).toEqual({ pipeline: 'p1' })
		expect(declaredSearchFields({}, undefined)).toBeNull()
	})
})
