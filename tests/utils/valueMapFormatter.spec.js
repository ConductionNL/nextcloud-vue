/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqOrganisaties Rechtsvorm: a display map shows "BV" for "Besloten Vennootschap".
 *
 * @spec openspec/changes/value-map-formatter/specs/index-page/spec.md#requirement-a-column-can-show-stored-values-through-a-display-map
 */
const { BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')

describe('valueMap formatter', () => {
	const format = BUILT_IN_FORMATTERS.valueMap
	const options = { map: { 'Besloten Vennootschap': 'BV', 'Naamloze Vennootschap': 'NV' } }

	it('shows the mapped label', () => {
		expect(format('Besloten Vennootschap', {}, {}, options)).toBe('BV')
	})

	it('shows a value the map does not name as stored', () => {
		expect(format('Stichting', {}, {}, options)).toBe('Stichting')
	})

	it('is empty for nothing, and safe without options', () => {
		expect(format(null, {}, {}, options)).toBe('')
		expect(format('', {}, {}, options)).toBe('')
		expect(format('Vereniging', {}, {}, undefined)).toBe('Vereniging')
	})
})
