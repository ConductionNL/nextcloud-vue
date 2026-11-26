/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Facet buckets that share a label are one option: the statuses of several
 * case types named alike ("Received") read once with their counts added, and
 * choosing the option filters on every value behind it (board IndexZijpaneel).
 */

import { facetFilterParams, facetOptions, MERGED_SEPARATOR } from '../../src/utils/facets.js'

const missing = (count) => `No value (${count})`

describe('facetOptions merges buckets with the same label', () => {
	it('reads a shared status name once with the counts added', () => {
		const options = facetOptions({
			values: [
				{ value: 's1', label: 'Received', count: 2 },
				{ value: 's2', label: 'Received', count: 1 },
				{ value: 's3', label: 'In progress', count: 4 },
			],
		}, missing)
		expect(options).toEqual([
			{ id: `s1${MERGED_SEPARATOR}s2`, label: 'Received (3)' },
			{ id: 's3', label: 'In progress (4)' },
		])
	})

	it('keeps buckets without a label apart, as before', () => {
		const options = facetOptions({ values: [{ value: 'open', count: 1 }, { value: 'closed', count: 2 }] }, missing)
		expect(options.map((option) => option.id)).toEqual(['open', 'closed'])
	})
})

describe('facetFilterParams sends every value behind a merged option', () => {
	it('expands the merged option into its values', () => {
		expect(facetFilterParams('status', [`s1${MERGED_SEPARATOR}s2`])).toEqual({ status: ['s1', 's2'] })
		expect(facetFilterParams('status', [`s1${MERGED_SEPARATOR}s2`, 's3'])).toEqual({ status: ['s1', 's2', 's3'] })
		expect(facetFilterParams('status', ['s3'])).toEqual({ status: 's3' })
	})
})
