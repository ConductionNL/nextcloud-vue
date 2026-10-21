/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Filtering a list on a type's own declared fields (dossiq's case type field
 * filters, now the library's CnRelatedFieldFilters).
 *
 * EVERY FAILURE HERE IS SILENT. A key OpenRegister does not understand narrows
 * nothing, so the whole register comes back as the answer to a narrow
 * question; two conditions merged into one block ask for a row that is two
 * definitions at once, and the list comes back empty with no reason. So the
 * assertions are about the exact wire shape of `RelatedRowFilterParser`.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/related-field-filters/spec.md
 */
import {
	buildRelatedFilters,
	controlFor,
	definitionId,
	filterableDefinitions,
	isFilled,
	readRelatedRefusal,
	relatedKeysIn,
} from '../../src/utils/relatedFieldFilters.js'

const RELATED = { schema: 'caseProperty', backref: 'case', definitionKey: 'propertyDefinition', valueKey: 'value' }

const DEFINITIONS = [
	{ '@self': { uuid: 'pd-1' }, name: 'bouwkosten', propertyType: 'number', filterable: true },
	{ '@self': { uuid: 'pd-2' }, name: 'oppervlakte', propertyType: 'number' },
	{ '@self': { uuid: 'pd-3' }, name: 'aantalBouwlagen', propertyType: 'integer', filterable: false },
]

describe('a type says which of its fields are worth filtering on', () => {
	it('offers only the definition that declares it', () => {
		const offered = filterableDefinitions(DEFINITIONS)
		expect(offered).toHaveLength(1)
		expect(offered[0].name).toBe('bouwkosten')
	})

	it('offers nothing for a type with no definitions at all', () => {
		expect(filterableDefinitions(undefined)).toEqual([])
		expect(filterableDefinitions([])).toEqual([])
	})
})

describe('the control follows the definition', () => {
	it('asks for a number as a range', () => {
		expect(controlFor({ propertyType: 'number' })).toBe('range')
		expect(controlFor({ propertyType: 'integer' })).toBe('range')
	})

	it('asks for a date as a date range, in both spellings a register stores', () => {
		expect(controlFor({ propertyType: 'date' })).toBe('dateRange')
		expect(controlFor({ propertyType: 'string', format: 'date' })).toBe('dateRange')
	})

	it('asks for an enumeration as a select', () => {
		expect(controlFor({ propertyType: 'string', enumValues: ['Noord', 'Zuid'] })).toBe('select')
	})

	it('asks for everything else as text', () => {
		expect(controlFor({ propertyType: 'string' })).toBe('text')
		expect(controlFor({})).toBe('text')
		expect(controlFor({ propertyType: 'number', enumValues: [] })).toBe('range')
	})
})

describe('the bar compiles to one block per field', () => {
	it('writes a single filled field as one unnumbered block', () => {
		expect(buildRelatedFilters([{ definitionId: 'pd-1', value: { gte: '100000' } }], RELATED)).toEqual({
			'_related[caseProperty][case][propertyDefinition]': 'pd-1',
			'_related[caseProperty][case][value][gte]': '100000',
		})
	})

	it('writes two filled fields as TWO numbered blocks, the number after the backref', () => {
		const query = buildRelatedFilters([
			{ definitionId: 'pd-1', value: { gte: '100000' } },
			{ definitionId: 'pd-4', value: { eq: 'Noord' } },
		], RELATED)

		expect(query['_related[caseProperty][case][0][propertyDefinition]']).toBe('pd-1')
		expect(query['_related[caseProperty][case][0][value][gte]']).toBe('100000')
		expect(query['_related[caseProperty][case][1][propertyDefinition]']).toBe('pd-4')
		expect(query['_related[caseProperty][case][1][value]']).toBe('Noord')
		expect(Object.keys(query).filter((k) => k.endsWith('[propertyDefinition]'))).toHaveLength(2)
		expect(query['_related[caseProperty][case][propertyDefinition]']).toBeUndefined()
	})

	it('names the definition and value keys the related schema uses', () => {
		expect(buildRelatedFilters([{ definitionId: 'd', value: { eq: 'x' } }], { schema: 'answer', backref: 'request', definitionKey: 'question', valueKey: 'text' })).toEqual({
			'_related[answer][request][question]': 'd',
			'_related[answer][request][text]': 'x',
		})
	})

	it('writes nothing for a bar nobody has filled in', () => {
		expect(buildRelatedFilters([{ definitionId: 'pd-1', value: {} }], RELATED)).toEqual({})
		expect(buildRelatedFilters([{ definitionId: 'pd-1', value: { eq: '' } }], RELATED)).toEqual({})
		expect(buildRelatedFilters([], RELATED)).toEqual({})
	})

	it('drops an entry with no definition, which could only be sent as an empty id', () => {
		expect(buildRelatedFilters([{ definitionId: '', value: { eq: 'x' } }], RELATED)).toEqual({})
	})

	it('knows a filled field from an empty one', () => {
		expect(isFilled({ eq: 'Noord' })).toBe(true)
		expect(isFilled({ gte: '0' })).toBe(true)
		expect(isFilled({ in: ['a'] })).toBe(true)
		expect(isFilled({ in: [] })).toBe(false)
		expect(isFilled({})).toBe(false)
		expect(isFilled(undefined)).toBe(false)
	})

	it('reads a definition id in either shape the store answers in', () => {
		expect(definitionId({ '@self': { uuid: 'a' } })).toBe('a')
		expect(definitionId({ id: 'b' })).toBe('b')
		expect(definitionId({})).toBe('')
	})
})

describe('a refused filter is not an empty result', () => {
	it('names the field the refusal is about', () => {
		const refusal = readRelatedRefusal({ error: { response: { data: { error: 'Malformed _related block for pd-1' } } }, definitions: DEFINITIONS })
		expect(refusal.name).toBe('bouwkosten')
	})

	it('says nothing when the last fetch was not refused', () => {
		expect(readRelatedRefusal({ error: null, definitions: DEFINITIONS })).toBeNull()
	})

	it('says nothing about a refusal that is not a _related one', () => {
		expect(readRelatedRefusal({ error: { response: { data: { error: 'Unclosed quote in _search' } } }, definitions: DEFINITIONS })).toBeNull()
	})
})

describe('the _related keys on a query', () => {
	it('finds every one', () => {
		const keys = relatedKeysIn({
			caseType: 'ct-1',
			_search: 'dakkapel',
			'_related[caseProperty][case][propertyDefinition]': 'pd-1',
			'_related[caseProperty][case][value][gte]': '100000',
		})
		expect(keys).toHaveLength(2)
	})

	it('finds none on a query that carries none', () => {
		expect(relatedKeysIn({ caseType: 'ct-1' })).toEqual([])
		expect(relatedKeysIn(undefined)).toEqual([])
	})
})
