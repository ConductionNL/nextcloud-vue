/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The missing-value bucket survives the facet normaliser, becomes one more
 * option in the sidebars, and selecting it asks OpenRegister for the objects
 * that hold no value (`<property>_isnull=true`). ConductionNL/nextcloud-vue#1176.
 */

import {
	facetFilterParams,
	facetOptions,
	MISSING_VALUE,
	normalizeFacets,
} from '../../src/utils/facets.js'

const wire = {
	resultType: {
		type: 'terms',
		title: 'Result type',
		buckets: [{ key: 'toegekend', results: 20, label: 'Toegekend' }],
		missing: { results: 12 },
	},
	status: {
		type: 'terms',
		buckets: [{ key: 'open', results: 3 }],
	},
}

describe('normalizeFacets keeps what sits beside the buckets', () => {
	it('carries the missing count, the type and the title', () => {
		const facets = normalizeFacets(wire)

		expect(facets.resultType.values).toEqual([{ value: 'toegekend', count: 20, label: 'Toegekend' }])
		expect(facets.resultType.missing).toBe(12)
		expect(facets.resultType.type).toBe('terms')
		expect(facets.resultType.title).toBe('Result type')
	})

	it('adds no missing count when the backend sent none', () => {
		const facets = normalizeFacets(wire)

		expect('missing' in facets.status).toBe(false)
	})

	it('reads a missing block written as a count', () => {
		const facets = normalizeFacets({ a: { buckets: [], missing: { count: 4 } } })

		expect(facets.a.missing).toBe(4)
	})
})

describe('facetOptions', () => {
	const label = (count) => `No value (${count})`

	it('appends one option for the objects with no value', () => {
		const options = facetOptions(normalizeFacets(wire).resultType, label)

		expect(options).toEqual([
			{ id: 'toegekend', label: 'Toegekend (20)' },
			{ id: MISSING_VALUE, label: 'No value (12)' },
		])
	})

	it('offers no missing option when nothing is missing', () => {
		const facet = normalizeFacets({ a: { buckets: [{ key: 'x', results: 1 }], missing: { results: 0 } } }).a

		expect(facetOptions(facet, label).map((o) => o.id)).toEqual(['x'])
	})

	it('answers null when the facet has no values and nothing missing, so the caller falls back', () => {
		expect(facetOptions(undefined, label)).toBeNull()
		expect(facetOptions({ values: [] }, label)).toBeNull()
	})
})

describe('facetFilterParams', () => {
	it('asks for the empty values when the missing option is chosen', () => {
		expect(facetFilterParams('resultType', [MISSING_VALUE])).toEqual({ resultType_isnull: 'true' })
	})

	it('leaves an ordinary selection as it was: one value unwrapped, several as a list', () => {
		expect(facetFilterParams('status', ['open'])).toEqual({ status: 'open' })
		expect(facetFilterParams('status', ['open', 'won'])).toEqual({ status: ['open', 'won'] })
	})

	it('treats the missing option as exclusive, because no object both holds a value and holds none', () => {
		expect(facetFilterParams('resultType', ['toegekend', MISSING_VALUE])).toEqual({ resultType_isnull: 'true' })
	})

	it('answers nothing for an empty selection', () => {
		expect(facetFilterParams('status', [])).toEqual({})
	})
})
