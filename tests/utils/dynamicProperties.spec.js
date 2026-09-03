// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import {
	DYNAMIC_KEY_PREFIX,
	definitionIdFromKey,
	definitionQueryParams,
	extendsFormDeclarations,
	isDynamicKey,
	prefillDeclarations,
	prefillValues,
	propertiesFromDefinitions,
	splitDynamicFormData,
	valueRecordsFor,
} from '../../src/utils/dynamicProperties.js'
import { fieldsFromSchema } from '../../src/utils/schema.js'

/** The dossiq case → caseType → propertyDefinition → caseProperty shape. */
const CASE_CONFIG = {
	definitions: { schema: 'propertyDefinition', filter: { caseType: '$value' } },
	values: {
		schema: 'caseProperty',
		objectRef: 'case',
		definitionRef: 'propertyDefinition',
		valueKey: 'value',
	},
}

describe('extendsFormDeclarations', () => {
	it('finds the driving property that carries the declaration', () => {
		const schema = {
			properties: {
				title: { type: 'string' },
				caseType: { type: 'string', $ref: 'caseType', 'x-openregister-extends-form': CASE_CONFIG },
			},
		}
		expect(extendsFormDeclarations(schema)).toEqual([{ key: 'caseType', config: CASE_CONFIG }])
	})

	it('returns nothing for the overwhelming majority of schemas, which declare none', () => {
		expect(extendsFormDeclarations({ properties: { title: { type: 'string' } } })).toEqual([])
		expect(extendsFormDeclarations(null)).toEqual([])
		expect(extendsFormDeclarations({})).toEqual([])
	})

	it('ignores a declaration with no definitions schema, rather than fetching nothing forever', () => {
		const schema = { properties: { caseType: { 'x-openregister-extends-form': { values: {} } } } }
		expect(extendsFormDeclarations(schema)).toEqual([])
	})

	it('returns every declaration when a schema has more than one', () => {
		const second = { definitions: { schema: 'segmentField', filter: { segment: '$value' } } }
		const schema = {
			properties: {
				caseType: { 'x-openregister-extends-form': CASE_CONFIG },
				segment: { 'x-openregister-extends-form': second },
			},
		}
		expect(extendsFormDeclarations(schema).map((d) => d.key)).toEqual(['caseType', 'segment'])
	})
})

describe('definitionQueryParams', () => {
	it('substitutes $value with the driving property value', () => {
		const params = definitionQueryParams(CASE_CONFIG, 'uuid-of-case-type')
		expect(params).toEqual({ _limit: 100, caseType: 'uuid-of-case-type' })
	})

	it('caps the fetch even when the declaration carries no filter', () => {
		expect(definitionQueryParams({ definitions: { schema: 'x' } }, 'v')).toEqual({ _limit: 100 })
	})

	it('drops a token it could not resolve instead of filtering on the literal', () => {
		// An unresolved `@object.missing` reaching the API returns zero rows,
		// which is indistinguishable from a case type that has no extra fields.
		const config = { definitions: { schema: 'x', filter: { caseType: '$value', other: '@object.missing' } } }
		const params = definitionQueryParams(config, 'v', {})
		expect(params.caseType).toBe('v')
		expect(params.other).toBeUndefined()
	})

	it('resolves a token against the form data alongside $value', () => {
		const config = { definitions: { schema: 'x', filter: { caseType: '$value', tenant: '@object.tenant' } } }
		const params = definitionQueryParams(config, 'v', { tenant: 'gemeente-a' })
		expect(params).toEqual({ _limit: 100, caseType: 'v', tenant: 'gemeente-a' })
	})

	it('expands an operator filter into bracket params', () => {
		const config = { definitions: { schema: 'x', filter: { validFrom: { lte: '2026-01-01' } } } }
		expect(definitionQueryParams(config, 'v')).toEqual({ _limit: 100, 'validFrom[lte]': '2026-01-01' })
	})
})

describe('propertiesFromDefinitions', () => {
	const definitions = [
		{ id: 'def-1', name: 'Plafond', propertyType: 'number', isRequired: true, description: 'Grant ceiling' },
		{ id: 'def-2', name: 'Doelgroep', propertyType: 'enum', enumValues: ['Cultuur', 'Sport'], defaultValue: 'Sport' },
		{ id: 'def-3', name: 'Startdatum', propertyType: 'date' },
	]

	it('keys each property by its definition id, never the admin-authored name', () => {
		// A definition called `title` or `status` is not merely possible, it is
		// likely — and unprefixed it would silently overwrite the real field.
		const { properties } = propertiesFromDefinitions(definitions, CASE_CONFIG)
		expect(Object.keys(properties)).toEqual([
			`${DYNAMIC_KEY_PREFIX}def-1`,
			`${DYNAMIC_KEY_PREFIX}def-2`,
			`${DYNAMIC_KEY_PREFIX}def-3`,
		])
	})

	it('maps each declared type onto a JSON Schema type and format', () => {
		const { properties } = propertiesFromDefinitions(definitions, CASE_CONFIG)
		expect(properties[`${DYNAMIC_KEY_PREFIX}def-1`]).toMatchObject({ type: 'number', title: 'Plafond' })
		expect(properties[`${DYNAMIC_KEY_PREFIX}def-2`]).toMatchObject({ type: 'string', enum: ['Cultuur', 'Sport'], default: 'Sport' })
		expect(properties[`${DYNAMIC_KEY_PREFIX}def-3`]).toMatchObject({ type: 'string', format: 'date' })
	})

	it('reports the required definitions as the schema required list', () => {
		const { required } = propertiesFromDefinitions(definitions, CASE_CONFIG)
		expect(required).toEqual([`${DYNAMIC_KEY_PREFIX}def-1`])
	})

	it('orders the fields after the schema own, in definition order', () => {
		const { properties } = propertiesFromDefinitions(definitions, CASE_CONFIG, { orderFrom: 1000 })
		expect(properties[`${DYNAMIC_KEY_PREFIX}def-1`].order).toBe(1000)
		expect(properties[`${DYNAMIC_KEY_PREFIX}def-3`].order).toBe(1002)
	})

	it('skips a record with no id, which has nothing stable to key an answer against', () => {
		const { properties } = propertiesFromDefinitions([{ name: 'Orphan' }], CASE_CONFIG)
		expect(Object.keys(properties)).toEqual([])
	})

	it('falls back to a string field for a type nothing maps', () => {
		const { properties } = propertiesFromDefinitions([{ id: 'x', name: 'Odd', propertyType: 'quaternion' }], CASE_CONFIG)
		expect(properties[`${DYNAMIC_KEY_PREFIX}x`].type).toBe('string')
	})

	it('honours a per-schema map instead of the dossiq field names', () => {
		const config = { definitions: { schema: 'productField' }, map: { title: 'label', type: 'kind', required: 'mandatory' } }
		const { properties, required } = propertiesFromDefinitions(
			[{ id: 'p1', label: 'Colour', kind: 'string', mandatory: true }],
			config,
		)
		expect(properties[`${DYNAMIC_KEY_PREFIX}p1`].title).toBe('Colour')
		expect(required).toEqual([`${DYNAMIC_KEY_PREFIX}p1`])
	})

	it('produces properties the ordinary field engine understands', () => {
		// The whole point: a dynamic field is not a second kind of field, so it
		// must survive fieldsFromSchema with widgets and required-marking intact.
		const { properties, required } = propertiesFromDefinitions(definitions, CASE_CONFIG)
		const fields = fieldsFromSchema({ properties, required })
		expect(fields.map((f) => f.widget)).toEqual(['number', 'select', 'date'])
		expect(fields.map((f) => f.label)).toEqual(['Plafond', 'Doelgroep', 'Startdatum'])
		expect(fields[0].required).toBe(true)
		expect(fields[1].required).toBe(false)
	})
})

describe('splitDynamicFormData', () => {
	it('keeps the object own fields apart from the answers', () => {
		const { base, answers } = splitDynamicFormData({
			title: 'Aanvraag',
			caseType: 'ct-1',
			[`${DYNAMIC_KEY_PREFIX}def-1`]: 50000,
		})
		expect(base).toEqual({ title: 'Aanvraag', caseType: 'ct-1' })
		expect(answers).toEqual([{ definitionId: 'def-1', value: 50000 }])
	})

	it('returns no answers for a schema that declares none', () => {
		const { base, answers } = splitDynamicFormData({ title: 'x' })
		expect(base).toEqual({ title: 'x' })
		expect(answers).toEqual([])
	})

	it('survives an empty payload', () => {
		expect(splitDynamicFormData(null)).toEqual({ base: {}, answers: [] })
	})
})

describe('valueRecordsFor', () => {
	it('builds one row per answered question against the saved object', () => {
		const rows = valueRecordsFor(
			[{ definitionId: 'def-1', value: 50000 }, { definitionId: 'def-2', value: 'Cultuur' }],
			CASE_CONFIG,
			'case-uuid',
		)
		expect(rows).toEqual([
			{ case: 'case-uuid', propertyDefinition: 'def-1', value: '50000' },
			{ case: 'case-uuid', propertyDefinition: 'def-2', value: 'Cultuur' },
		])
	})

	it('writes no row for an unanswered question', () => {
		const rows = valueRecordsFor(
			[{ definitionId: 'a', value: '' }, { definitionId: 'b', value: null }, { definitionId: 'c', value: 0 }],
			CASE_CONFIG,
			'case-uuid',
		)
		expect(rows.map((r) => r.propertyDefinition)).toEqual(['c'])
	})

	it('serialises a non-scalar answer rather than dropping it', () => {
		const rows = valueRecordsFor([{ definitionId: 'j', value: { a: 1 } }], CASE_CONFIG, 'case-uuid')
		expect(rows[0].value).toBe('{"a":1}')
	})

	it('writes nothing when the declaration names no value schema', () => {
		expect(valueRecordsFor([{ definitionId: 'a', value: 'x' }], { definitions: {} }, 'id')).toEqual([])
	})

	it('writes nothing without a saved object to point at', () => {
		expect(valueRecordsFor([{ definitionId: 'a', value: 'x' }], CASE_CONFIG, '')).toEqual([])
	})
})

describe('isDynamicKey / definitionIdFromKey', () => {
	it('recognises a dynamic key and reads its definition id back', () => {
		expect(isDynamicKey(`${DYNAMIC_KEY_PREFIX}abc`)).toBe(true)
		expect(definitionIdFromKey(`${DYNAMIC_KEY_PREFIX}abc`)).toBe('abc')
	})

	it('leaves an ordinary key alone', () => {
		expect(isDynamicKey('title')).toBe(false)
		expect(definitionIdFromKey('title')).toBe('')
	})
})

describe('prefillDeclarations', () => {
	const withPrefill = (fields) => ({
		properties: {
			caseType: { type: 'string', 'x-openregister-prefill': { fields } },
			title: { type: 'string' },
		},
	})

	it('finds the property that declares a fields map', () => {
		const decls = prefillDeclarations(withPrefill({ title: 'title' }))
		expect(decls).toHaveLength(1)
		expect(decls[0].key).toBe('caseType')
		expect(decls[0].config.fields).toEqual({ title: 'title' })
	})

	it('ignores a declaration with no fields to copy', () => {
		expect(prefillDeclarations(withPrefill({}))).toEqual([])
		expect(prefillDeclarations({
			properties: { caseType: { 'x-openregister-prefill': {} } },
		})).toEqual([])
	})

	it('returns nothing for a schema that declares none', () => {
		expect(prefillDeclarations({ properties: { title: { type: 'string' } } })).toEqual([])
		expect(prefillDeclarations(null)).toEqual([])
		expect(prefillDeclarations({})).toEqual([])
	})
})

describe('prefillValues', () => {
	const config = {
		fields: { title: 'title', status: 'initialStatus', assignee: 'defaultAssignee' },
	}

	it('maps each target field to the chosen record value', () => {
		const record = {
			title: 'Subsidie',
			initialStatus: 'status-1',
			defaultAssignee: 'jdoe',
		}
		expect(prefillValues(record, config)).toEqual({
			title: 'Subsidie',
			status: 'status-1',
			assignee: 'jdoe',
		})
	})

	it('skips a source the record leaves empty rather than blanking the target', () => {
		// A case type with no default assignee must not clear an assignee; it
		// simply has no opinion about that field.
		const record = { title: 'Subsidie', initialStatus: '', defaultAssignee: null }
		expect(prefillValues(record, config)).toEqual({ title: 'Subsidie' })
	})

	it('skips an empty array, which carries no more information than a blank', () => {
		expect(prefillValues({ tags: [] }, { fields: { labels: 'tags' } })).toEqual({})
	})

	it('returns nothing without a record or a fields map', () => {
		expect(prefillValues(null, config)).toEqual({})
		expect(prefillValues({ title: 'x' }, {})).toEqual({})
		expect(prefillValues({ title: 'x' }, null)).toEqual({})
	})
})

describe('propertiesFromDefinitions field titles', () => {
	const titleFor = (name) => {
		const { properties } = propertiesFromDefinitions(
			[{ id: 'd1', name, propertyType: 'string' }],
			{ map: { title: 'name', type: 'propertyType' } },
		)
		return properties['x-prop:d1'].title
	}

	it('makes an identifier-shaped name readable', () => {
		// Real seeded dossiq data, which rendered verbatim on the form.
		expect(titleFor('auditorsStatementThreshold')).toBe('Auditors statement threshold')
		expect(titleFor('interimReportTermWeeks')).toBe('Interim report term weeks')
		expect(titleFor('targetGroup')).toBe('Target group')
	})

	it('capitalises a single lower-case word', () => {
		expect(titleFor('plafond')).toBe('Plafond')
	})

	it('keeps an acronym whole', () => {
		expect(titleFor('defaultBSNPolicy')).toBe('Default BSN policy')
	})

	it('splits snake_case and kebab-case too', () => {
		expect(titleFor('grant_ceiling')).toBe('Grant ceiling')
		expect(titleFor('grant-ceiling')).toBe('Grant ceiling')
	})

	it('leaves a label someone actually wrote completely alone', () => {
		// Contains a space, so it is a label and not an identifier. Note the
		// casing is preserved exactly, including the lower-case start.
		expect(titleFor('maximaal aantal m2')).toBe('maximaal aantal m2')
		expect(titleFor('Plafond per aanvraag')).toBe('Plafond per aanvraag')
	})
})
