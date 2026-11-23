/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const { sourceCounters } = CnIndexPage.computed

describe('CnIndexPage sourceCounters', () => {
	it('reads the tiles off a named source', () => {
		const tiles = [{ id: 'runs', label: 'Runs', count: 2, note: '', variant: 'default' }]

		expect(sourceCounters.call({ isNamedSource: true, namedSource: { counters: () => tiles } })).toEqual(tiles)
	})

	it('is empty without a source that has them', () => {
		expect(sourceCounters.call({ isNamedSource: true, namedSource: {} })).toEqual([])
		expect(sourceCounters.call({ isNamedSource: false, namedSource: null })).toEqual([])
	})
})
