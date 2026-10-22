/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header filter on a field inside an object property, and on the stored
 * field a computed column names (DqOrganisaties "Plaats", DqContacten
 * "Woonplaats").
 */

import { columnFilterDef, columnFilterParamKeys, columnFilterParams, columnFilterState, isColumnFilterActive } from '../../src/utils/columnFilters.js'
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

describe('an aggregate column that filters through its related rows (aggregate.filterable)', () => {
	const openCases = {
		key: 'openCases',
		label: 'Open cases',
		aggregate: { register: 'dossiq', schema: 'case', op: 'count', where: { requester: '@self.id', isFinalStatus: false }, filterable: true },
	}
	const lastContact = {
		key: 'lastContact',
		label: 'Last contact',
		formatter: 'date',
		aggregate: { register: 'dossiq', schema: 'contactmoment', op: 'max', field: 'startTime', where: { contact: '@self.id' }, filterable: true },
	}

	it('offers "with" for a count, asking OpenRegister for a related row that matches the where', () => {
		const def = columnFilterDef(openCases, schema)
		expect(def).toMatchObject({ kind: 'boolean', existsOnly: true, label: 'Open cases' })
		expect(columnFilterParams(def, { value: 'true' })).toEqual({ '_related[case][requester][isFinalStatus]': ['false'] })
		expect(columnFilterParams(def, { value: '' })).toEqual({ '_related[case][requester][isFinalStatus]': [] })
		expect(columnFilterParamKeys(def)).toEqual(['_related[case][requester][isFinalStatus]'])
		expect(columnFilterState(def, { '_related[case][requester][isFinalStatus]': ['false'] })).toEqual({ value: 'true' })
		expect(isColumnFilterActive(def, { '_related[case][requester][isFinalStatus]': 'false' })).toBe(true)
		expect(buildQueryString({ '_related[case][requester][isFinalStatus]': 'false' })).toBe('?_related%5Bcase%5D%5Brequester%5D%5BisFinalStatus%5D=false')
	})

	it('filters a highest date on a related row in the range', () => {
		const def = columnFilterDef(lastContact, schema)
		expect(def).toMatchObject({ kind: 'date', dateTime: true, key: '_related[contactmoment][contact][startTime]' })
		expect(columnFilterParams(def, { from: '2026-10-01', to: '' })).toEqual({
			'_related[contactmoment][contact][startTime][gte]': ['2026-10-01'],
			'_related[contactmoment][contact][startTime][lte]': [],
		})
		expect(columnFilterState(def, { '_related[contactmoment][contact][startTime][gte]': ['2026-10-01'] })).toEqual({ from: '2026-10-01', to: '' })
	})

	it('stays off without filterable, and for a where it cannot spell', () => {
		expect(columnFilterDef({ ...openCases, aggregate: { ...openCases.aggregate, filterable: undefined } }, schema)).toBeNull()
		expect(columnFilterDef({ ...openCases, aggregate: { ...openCases.aggregate, where: { requester: '@self.id' } } }, schema)).toBeNull()
		expect(columnFilterDef({ ...openCases, aggregate: { ...openCases.aggregate, where: { requester: '@self.kvk', isFinalStatus: false } } }, schema)).toBeNull()
		expect(columnFilterDef({ ...openCases, aggregate: { ...openCases.aggregate, where: { isFinalStatus: false } } }, schema)).toBeNull()
		expect(columnFilterDef({ ...openCases, filterable: false }, schema)).toBeNull()
	})
})
