/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the declarative multi-key sort used by CnIndexPage's `defaultSort`.
 */

import { multiKeySort } from '../../src/utils/multiKeySort.js'

describe('multiKeySort', () => {
	it('returns the rows untouched when the spec is empty', () => {
		const rows = [{ a: 2 }, { a: 1 }]
		expect(multiKeySort(rows, [])).toBe(rows)
	})

	it('sorts by a single string key ascending (default order)', () => {
		const rows = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }]
		const out = multiKeySort(rows, [{ field: 'name' }])
		expect(out.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie'])
	})

	it('respects a desc order', () => {
		const rows = [{ n: 1 }, { n: 3 }, { n: 2 }]
		const out = multiKeySort(rows, [{ field: 'n', order: 'desc' }])
		expect(out.map((r) => r.n)).toEqual([3, 2, 1])
	})

	it('breaks ties with the second key (group by type, then name)', () => {
		const rows = [
			{ type: 'b', name: 'Zeta' },
			{ type: 'a', name: 'Yankee' },
			{ type: 'a', name: 'Alpha' },
			{ type: 'b', name: 'Beta' },
		]
		const out = multiKeySort(rows, [
			{ field: 'type', order: 'asc' },
			{ field: 'name', order: 'asc' },
		])
		expect(out.map((r) => `${r.type}:${r.name}`)).toEqual([
			'a:Alpha', 'a:Yankee', 'b:Beta', 'b:Zeta',
		])
	})

	it('compares numeric strings numerically, not lexically', () => {
		const rows = [{ v: '10' }, { v: '2' }, { v: '1' }]
		const out = multiKeySort(rows, [{ field: 'v' }])
		expect(out.map((r) => r.v)).toEqual(['1', '2', '10'])
	})

	it('compares date-time strings by timestamp', () => {
		const rows = [
			{ d: '2026-03-01T00:00:00Z' },
			{ d: '2026-01-15T00:00:00Z' },
			{ d: '2026-02-20T00:00:00Z' },
		]
		const out = multiKeySort(rows, [{ field: 'd' }])
		expect(out.map((r) => r.d.slice(5, 7))).toEqual(['01', '02', '03'])
	})

	it('sorts empty values last regardless of direction', () => {
		const rows = [{ x: null }, { x: 'a' }, { x: '' }, { x: 'b' }]
		const asc = multiKeySort(rows, [{ field: 'x', order: 'asc' }])
		expect(asc.map((r) => r.x)).toEqual(['a', 'b', null, ''])
		const desc = multiKeySort(rows, [{ field: 'x', order: 'desc' }])
		expect(desc.slice(0, 2).map((r) => r.x)).toEqual(['b', 'a'])
	})

	it('reads dotted fields and falls back to the @self block', () => {
		const rows = [
			{ '@self': { created: '2026-02-01T00:00:00Z' } },
			{ '@self': { created: '2026-01-01T00:00:00Z' } },
		]
		const out = multiKeySort(rows, [{ field: 'created' }])
		expect(out[0]['@self'].created).toContain('2026-01')
	})

	it('is stable for equal keys (preserves input order)', () => {
		const rows = [
			{ k: 1, id: 'a' },
			{ k: 1, id: 'b' },
			{ k: 1, id: 'c' },
		]
		const out = multiKeySort(rows, [{ field: 'k' }])
		expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c'])
	})

	it('does not mutate the input array', () => {
		const rows = [{ n: 3 }, { n: 1 }, { n: 2 }]
		const copy = [...rows]
		multiKeySort(rows, [{ field: 'n' }])
		expect(rows).toEqual(copy)
	})
})
