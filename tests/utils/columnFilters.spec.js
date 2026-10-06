/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the per-column sort and filter helpers behind table headers.
 */

import {
	clearedColumnFilterParams,
	columnFilterDef,
	columnFilterParams,
	columnFilterState,
	isColumnFilterActive,
	isColumnSortable,
} from '../../src/utils/columnFilters.js'

const schema = {
	properties: {
		title: { type: 'string', title: 'Title' },
		status: { type: 'string', enum: ['open', 'won'], 'x-enum-labels': { open: 'Open', won: 'Won' } },
		active: { type: 'boolean' },
		value: { type: 'number' },
		closeDate: { type: 'string', format: 'date' },
		createdAt: { type: 'string', format: 'date-time' },
		client: { type: 'string', $ref: '#/components/schemas/client' },
		address: { type: 'object' },
	},
}

describe('isColumnSortable', () => {
	it('sorts an object-form manifest column backed by a property, with no flag', () => {
		expect(isColumnSortable({ key: 'title', label: 'Title' }, schema)).toBe(true)
	})

	it('honours sortable: false', () => {
		expect(isColumnSortable({ key: 'title', sortable: false }, schema)).toBe(false)
	})

	it('keeps a widget column without a backing property unsortable', () => {
		expect(isColumnSortable({ key: 'openDeals', widget: 'badge' }, schema)).toBe(false)
	})

	it('keeps a computed column unsortable even when its key matches a property', () => {
		expect(isColumnSortable({ key: 'value', aggregate: { schema: 'lead' } }, schema)).toBe(false)
	})

	it('keeps an object property unsortable', () => {
		expect(isColumnSortable({ key: 'address' }, schema)).toBe(false)
	})

	it('without a schema, only an explicit flag sorts', () => {
		expect(isColumnSortable({ key: 'title' }, null)).toBe(false)
		expect(isColumnSortable({ key: 'title', sortable: true }, null)).toBe(true)
	})
})

describe('columnFilterDef', () => {
	it('picks the control from the property', () => {
		expect(columnFilterDef({ key: 'status' }, schema)).toMatchObject({ kind: 'enum', options: [{ value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }] })
		expect(columnFilterDef({ key: 'active' }, schema).kind).toBe('boolean')
		expect(columnFilterDef({ key: 'value' }, schema).kind).toBe('number')
		expect(columnFilterDef({ key: 'closeDate' }, schema)).toMatchObject({ kind: 'date', dateTime: false })
		expect(columnFilterDef({ key: 'createdAt' }, schema)).toMatchObject({ kind: 'date', dateTime: true })
		expect(columnFilterDef({ key: 'title' }, schema).kind).toBe('string')
		expect(columnFilterDef({ key: 'client' }, schema)).toMatchObject({ kind: 'reference', reference: { schema: 'client' } })
	})

	it('reads an fkResolve column as a reference to its widget target', () => {
		const def = columnFilterDef({ key: 'category', widget: 'fkResolve', widgetProps: { register: 'pipelinq', schema: 'category', labelField: 'name' } }, { properties: { category: { type: 'string' } } })
		expect(def).toMatchObject({ kind: 'reference', reference: { register: 'pipelinq', schema: 'category', labelField: 'name' } })
	})

	it('is off for filterable: false, a computed column and a column with nothing behind it', () => {
		expect(columnFilterDef({ key: 'status', filterable: false }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'value', aggregate: {} }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'openDeals' }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'address' }, schema)).toBeNull()
	})

	it('filters a badge column by its colour map even without a property', () => {
		expect(columnFilterDef({ key: 'stage', widget: 'badge', widgetProps: { colorMap: { new: 'x', done: 'y' } } }, null))
			.toMatchObject({ kind: 'enum', options: [{ value: 'new' }, { value: 'done' }] })
	})
})

describe('state and parameters', () => {
	const range = columnFilterDef({ key: 'value' }, schema)
	const enumDef = columnFilterDef({ key: 'status' }, schema)
	const dateTime = columnFilterDef({ key: 'createdAt' }, schema)

	it('writes the same parameters the sidebar sends', () => {
		expect(columnFilterParams(enumDef, { values: ['open', 'won'] })).toEqual({ status: ['open', 'won'] })
		expect(columnFilterParams(range, { from: '10', to: '' })).toEqual({ 'value[gte]': ['10'], 'value[lte]': [] })
		expect(columnFilterParams(columnFilterDef({ key: 'active' }, schema), { value: '' })).toEqual({ active: [] })
		expect(columnFilterParams(columnFilterDef({ key: 'title' }, schema), { value: ' Acme ' })).toEqual({ title: ['Acme'] })
	})

	it('queries a date-time column up to the end of the picked day, and shows the date back', () => {
		const params = columnFilterParams(dateTime, { from: '2026-10-01', to: '2026-10-06' })
		expect(params).toEqual({ 'createdAt[gte]': ['2026-10-01'], 'createdAt[lte]': ['2026-10-06T23:59:59'] })
		expect(columnFilterState(dateTime, params)).toEqual({ from: '2026-10-01', to: '2026-10-06' })
	})

	it('reads state back from the active filters, including scalars from a route query', () => {
		expect(columnFilterState(enumDef, { status: 'open' })).toEqual({ values: ['open'] })
		expect(columnFilterState(range, { 'value[gte]': ['5'] })).toEqual({ from: '5', to: '' })
		expect(isColumnFilterActive(range, { 'value[lte]': ['9'] })).toBe(true)
		expect(isColumnFilterActive(enumDef, { status: [] })).toBe(false)
	})

	it('clears every key a column owns', () => {
		expect(clearedColumnFilterParams(range)).toEqual({ 'value[gte]': [], 'value[lte]': [] })
	})
})
