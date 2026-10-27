/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `optionsFrom.keepFields`: an option carries values of its row along, such as
 * the terms url a create form links to for the chosen programme.
 *
 * @spec openspec/changes/create-form-widget/specs/create-form-widget/spec.md#requirement-a-dashboard-card-can-create-an-object-from-declared-fields
 */
import { optionFromRow } from '../../src/utils/optionsFrom.js'

describe('optionFromRow keepFields', () => {
	const row = { '@self': { id: 'p-1' }, name: 'Spaarpas', termsUrl: 'https://example.org/t', brand: { name: 'Zuiddrecht' } }

	it('keeps the named values of the row as data', () => {
		expect(optionFromRow(row, { labelField: 'name', keepFields: ['termsUrl', 'brand.name'] })).toEqual({
			id: 'p-1',
			label: 'Spaarpas',
			data: { termsUrl: 'https://example.org/t', 'brand.name': 'Zuiddrecht' },
		})
	})

	it('adds no data without keepFields', () => {
		expect(optionFromRow(row, { labelField: 'name' })).toEqual({ id: 'p-1', label: 'Spaarpas' })
	})
})
