/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header filter on a field inside an object property, and on the stored
 * field a computed column names (DqOrganisaties "Plaats", DqContacten
 * "Woonplaats").
 */

import { columnFilterDef, columnFilterParams } from '../../src/utils/columnFilters.js'
import { buildQueryString } from '../../src/utils/headers.js'

const schema = {
	properties: {
		tradeName: { type: 'string', title: 'Handelsnaam' },
		address: {
			type: 'object',
			properties: {
				place: { type: 'string', title: 'Plaats' },
				houseNumber: { type: 'integer' },
				kind: { type: 'string', enum: ['visit', 'post'] },
			},
		},
		lastContactAt: { type: 'string', format: 'date-time' },
		openCaseCount: { type: 'integer' },
	},
}

describe('a column on a field inside an object property', () => {
	it('filters address.place as text on contains, under its dotted name', () => {
		const def = columnFilterDef({ key: 'address.place', label: 'Place', sortable: false }, schema)
		expect(def).toMatchObject({ kind: 'string', key: 'address.place', label: 'Place' })
		const params = columnFilterParams(def, { value: 'zuid' })
		expect(params).toEqual({ 'address.place[like]': ['zuid'] })
		expect(buildQueryString({ 'address.place[like]': 'zuid' })).toBe('?address.place%5Blike%5D=zuid')
	})

	it('reads the nested property for its kind', () => {
		expect(columnFilterDef({ key: 'address.houseNumber' }, schema).kind).toBe('number')
		expect(columnFilterDef({ key: 'address.kind' }, schema)).toMatchObject({ kind: 'enum', options: [{ value: 'visit' }, { value: 'post' }] })
	})

	it('has none for a path the schema does not have', () => {
		expect(columnFilterDef({ key: 'address.city' }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'tradeName.first' }, schema)).toBeNull()
	})
})

describe('a column that names the field it filters on (filterField)', () => {
	it('gives a computed column a filter on the stored field it names', () => {
		const def = columnFilterDef({ key: 'openCases', label: 'Open cases', aggregate: { schema: 'case', op: 'count' }, filterField: 'openCaseCount' }, schema)
		expect(def).toMatchObject({ kind: 'number', key: 'openCaseCount', label: 'Open cases' })
		expect(columnFilterParams(def, { from: '1', to: '' })).toEqual({ 'openCaseCount[gte]': ['1'], 'openCaseCount[lte]': [] })
	})

	it('takes the kind of that field, a date for a date-time', () => {
		expect(columnFilterDef({ key: 'lastContact', aggregate: { schema: 'contactmoment', op: 'max', field: 'startTime' }, filterField: 'lastContactAt' }, schema))
			.toMatchObject({ kind: 'date', dateTime: true, key: 'lastContactAt' })
	})

	it('can name a field inside an object property', () => {
		expect(columnFilterDef({ key: 'placeLabel', compute: 'x', filterField: 'address.place' }, schema)).toMatchObject({ kind: 'string', key: 'address.place' })
	})

	it('keeps a computed column without filterField unfiltered, and filterable: false wins', () => {
		expect(columnFilterDef({ key: 'openCases', aggregate: { schema: 'case', op: 'count' } }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'openCases', aggregate: {}, filterField: 'openCaseCount', filterable: false }, schema)).toBeNull()
		expect(columnFilterDef({ key: 'openCases', aggregate: {}, filterField: 'missing' }, schema)).toBeNull()
	})
})
