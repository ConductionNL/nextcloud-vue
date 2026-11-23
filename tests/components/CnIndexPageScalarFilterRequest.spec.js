/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A filter held as one value rather than a list (a default filter
 * `{ "address.place": "Zuiddrecht" }`, or `?status=ended` in the address)
 * reaches the request. DqOrganisaties showed the chip "Plaats: Zuiddrecht" and
 * listed organisations from Leiden and Spanje: the value never left the page.
 *
 * @spec openspec/changes/scalar-filter-reaches-request/specs/index-page/spec.md#requirement-a-filter-held-as-one-value-narrows-the-list
 */
const { facetFilterParams, MISSING_VALUE } = require('../../src/utils/facets.js')

describe('facetFilterParams with one value', () => {
	it('sends a value held as a string', () => {
		expect(facetFilterParams('address.place', 'Zuiddrecht')).toEqual({ 'address.place': 'Zuiddrecht' })
	})

	it('sends numbers and booleans', () => {
		expect(facetFilterParams('count', 3)).toEqual({ count: 3 })
		expect(facetFilterParams('isFinalStatus', false)).toEqual({ isFinalStatus: false })
	})

	it('sends the missing option held as one value', () => {
		expect(facetFilterParams('resultType', MISSING_VALUE)).toEqual({ resultType_isnull: 'true' })
	})

	it('sends nothing for an empty or absent value', () => {
		expect(facetFilterParams('status', '')).toEqual({})
		expect(facetFilterParams('status', null)).toEqual({})
		expect(facetFilterParams('status', undefined)).toEqual({})
	})
})
