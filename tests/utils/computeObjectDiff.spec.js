/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the generic nested object/array diff utility that powers
 * CnVersionHistory's diff table.
 */

const { computeObjectDiff } = require('../../src/utils/computeObjectDiff.js')

function find(results, path) {
	return results.find((r) => r.path === path)
}

describe('computeObjectDiff — flat objects', () => {
	it('classifies added, removed, changed, and unchanged fields', () => {
		const oldValue = { a: 1, b: 2, c: 3 }
		const newValue = { a: 1, b: 20, d: 4 }
		const results = computeObjectDiff(oldValue, newValue)

		expect(find(results, 'a')).toEqual({ path: 'a', type: 'unchanged', oldValue: 1, newValue: 1 })
		expect(find(results, 'b')).toEqual({ path: 'b', type: 'changed', oldValue: 2, newValue: 20 })
		expect(find(results, 'c')).toEqual({ path: 'c', type: 'removed', oldValue: 3, newValue: undefined })
		expect(find(results, 'd')).toEqual({ path: 'd', type: 'added', oldValue: undefined, newValue: 4 })
		expect(results).toHaveLength(4)
	})

	it('returns an empty array for two identical empty objects', () => {
		expect(computeObjectDiff({}, {})).toEqual([{ path: '', type: 'unchanged', oldValue: {}, newValue: {} }])
	})

	it('does not mutate either input', () => {
		const oldValue = { a: 1, nested: { x: 1 } }
		const newValue = { a: 2, nested: { x: 2 } }
		const oldSnapshot = JSON.parse(JSON.stringify(oldValue))
		const newSnapshot = JSON.parse(JSON.stringify(newValue))
		computeObjectDiff(oldValue, newValue)
		expect(oldValue).toEqual(oldSnapshot)
		expect(newValue).toEqual(newSnapshot)
	})
})

describe('computeObjectDiff — nested objects and arrays', () => {
	it('produces dotted paths for nested objects', () => {
		const oldValue = { user: { name: 'A', address: { city: 'Utrecht', street: 'Main St' } } }
		const newValue = { user: { name: 'A', address: { city: 'Utrecht', street: 'Elm St' } } }
		const results = computeObjectDiff(oldValue, newValue)

		expect(find(results, 'user.address.street')).toMatchObject({ type: 'changed', oldValue: 'Main St', newValue: 'Elm St' })
		expect(find(results, 'user.address.city')).toMatchObject({ type: 'unchanged' })
		expect(find(results, 'user.name')).toMatchObject({ type: 'unchanged' })
	})

	it('produces bracketed paths for array indices', () => {
		const oldValue = { user: { tags: ['x', 'y'] } }
		const newValue = { user: { tags: ['x', 'z'] } }
		const results = computeObjectDiff(oldValue, newValue)

		expect(find(results, 'user.tags[0]')).toMatchObject({ type: 'unchanged' })
		expect(find(results, 'user.tags[1]')).toMatchObject({ type: 'changed', oldValue: 'y', newValue: 'z' })
	})

	it('treats an appended array element as added', () => {
		const results = computeObjectDiff({ tags: ['x'] }, { tags: ['x', 'y'] })
		expect(find(results, 'tags[1]')).toEqual({ path: 'tags[1]', type: 'added', oldValue: undefined, newValue: 'y' })
	})

	it('treats a removed trailing array element as removed', () => {
		const results = computeObjectDiff({ tags: ['x', 'y'] }, { tags: ['x'] })
		expect(find(results, 'tags[1]')).toEqual({ path: 'tags[1]', type: 'removed', oldValue: 'y', newValue: undefined })
	})

	it('diffs an array of objects by index', () => {
		const oldValue = { items: [{ id: 1, name: 'A' }] }
		const newValue = { items: [{ id: 1, name: 'B' }] }
		const results = computeObjectDiff(oldValue, newValue)
		expect(find(results, 'items[0].name')).toMatchObject({ type: 'changed', oldValue: 'A', newValue: 'B' })
		expect(find(results, 'items[0].id')).toMatchObject({ type: 'unchanged' })
	})

	it('handles deeply nested mixed object/array structures', () => {
		const oldValue = { a: { b: [{ c: { d: 1 } }] } }
		const newValue = { a: { b: [{ c: { d: 2 } }] } }
		const results = computeObjectDiff(oldValue, newValue)
		expect(find(results, 'a.b[0].c.d')).toMatchObject({ type: 'changed', oldValue: 1, newValue: 2 })
	})

	it('treats two identical empty arrays as unchanged', () => {
		const results = computeObjectDiff({ tags: [] }, { tags: [] })
		expect(find(results, 'tags')).toEqual({ path: 'tags', type: 'unchanged', oldValue: [], newValue: [] })
	})
})

describe('computeObjectDiff — null vs. missing key', () => {
	it('an explicit null value removed is reported as removed, not unchanged', () => {
		const results = computeObjectDiff({ a: null }, {})
		expect(find(results, 'a')).toEqual({ path: 'a', type: 'removed', oldValue: null, newValue: undefined })
	})

	it('an explicit null value added is reported as added, not unchanged', () => {
		const results = computeObjectDiff({}, { a: null })
		expect(find(results, 'a')).toEqual({ path: 'a', type: 'added', oldValue: undefined, newValue: null })
	})

	it('null on both sides is unchanged', () => {
		const results = computeObjectDiff({ a: null }, { a: null })
		expect(find(results, 'a')).toEqual({ path: 'a', type: 'unchanged', oldValue: null, newValue: null })
	})

	it('null vs. a real value is changed', () => {
		const results = computeObjectDiff({ a: null }, { a: 'x' })
		expect(find(results, 'a')).toEqual({ path: 'a', type: 'changed', oldValue: null, newValue: 'x' })
	})
})

describe('computeObjectDiff — type changes', () => {
	it('a string-to-number type change is a single changed leaf', () => {
		const results = computeObjectDiff({ a: '1' }, { a: 1 })
		expect(results).toEqual([{ path: 'a', type: 'changed', oldValue: '1', newValue: 1 }])
	})

	it('an object-to-array type change is a single changed leaf, not a partial recursive diff', () => {
		const results = computeObjectDiff({ a: { x: 1 } }, { a: [1, 2] })
		expect(results).toEqual([{ path: 'a', type: 'changed', oldValue: { x: 1 }, newValue: [1, 2] }])
	})

	it('an array-to-object type change is a single changed leaf', () => {
		const results = computeObjectDiff({ a: [1, 2] }, { a: { x: 1 } })
		expect(results).toEqual([{ path: 'a', type: 'changed', oldValue: [1, 2], newValue: { x: 1 } }])
	})
})

describe('computeObjectDiff — root-level primitives', () => {
	it('diffs two primitive root values directly', () => {
		expect(computeObjectDiff(1, 2)).toEqual([{ path: '', type: 'changed', oldValue: 1, newValue: 2 }])
	})

	it('reports two equal primitive root values as unchanged', () => {
		expect(computeObjectDiff('x', 'x')).toEqual([{ path: '', type: 'unchanged', oldValue: 'x', newValue: 'x' }])
	})
})
