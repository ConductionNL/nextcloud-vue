/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-1
 */
import { orderColumns, personalColumnsKey, reconcilePersonalColumns } from '../../src/components/CnIndexPage/personalColumns.js'

describe('personalColumnsKey', () => {
	it('holds the layout under columns.<list id>, safe in a key', () => {
		expect(personalColumnsKey('purchase-orders')).toBe('columns.purchase-orders')
		expect(personalColumnsKey('a b/c')).toBe('columns.a_b_c')
		expect(personalColumnsKey('')).toBe('columns.default')
	})
})

describe('reconcilePersonalColumns', () => {
	it('drops a column the schema dropped and keeps the stored order', () => {
		expect(reconcilePersonalColumns({ columns: ['supplier', 'gone', 'number'], pinned: 1 }, ['number', 'supplier', 'date']))
			.toEqual({ columns: ['supplier', 'number'], pinned: 1 })
	})

	it('a new schema column is absent from the layout, so hidden', () => {
		const out = reconcilePersonalColumns({ columns: ['number'], pinned: 0 }, ['number', 'brandNew'])
		expect(out.columns).not.toContain('brandNew')
	})

	it('clamps pinned to the columns left, ignores duplicates, and rejects junk', () => {
		expect(reconcilePersonalColumns({ columns: ['a', 'a', 'b'], pinned: 9 }, ['a', 'b'])).toEqual({ columns: ['a', 'b'], pinned: 2 })
		expect(reconcilePersonalColumns(null, ['a'])).toBeNull()
		expect(reconcilePersonalColumns({ columns: [] }, ['a'])).toBeNull()
		expect(reconcilePersonalColumns({ columns: ['x'] }, ['a'])).toBeNull()
	})

	it('keeps the stored layout while the schema is still loading (no known columns)', () => {
		expect(reconcilePersonalColumns({ columns: ['a', 'b'], pinned: 1 }, [])).toEqual({ columns: ['a', 'b'], pinned: 1 })
	})
})

describe('orderColumns', () => {
	it('puts Supplier first', () => {
		const cols = [{ key: 'number' }, { key: 'date' }, { key: 'supplier' }, { key: 'amount' }]
		expect(orderColumns(cols, ['supplier', 'number', 'date', 'amount']).map((c) => c.key)).toEqual(['supplier', 'number', 'date', 'amount'])
	})

	it('leaves a column the list does not govern in its own slot', () => {
		const cols = ['a', { key: 'custom' }, 'b', 'c']
		expect(orderColumns(cols, ['c', 'b', 'a']).map((c) => (typeof c === 'string' ? c : c.key))).toEqual(['c', 'custom', 'b', 'a'])
	})
})
