/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A field is named in the reader's language: a property's `titles[<lang>]`
 * before its `title` (openregister modelling-field-names-per-language 3.3).
 *
 * @spec openspec/changes/schema-titles-per-language/specs/schema-titles-per-language/spec.md
 */
jest.mock('@nextcloud/l10n', () => {
	const actual = jest.requireActual('@nextcloud/l10n')
	return { ...actual, getLanguage: () => global.__lang }
})

const { propertyTitle } = require('../../src/utils/propertyTitle.js')
const { columnsFromSchema, fieldsFromSchema } = require('../../src/utils/schema.js')

const SCHEMA = { type: 'object', properties: { postcode: { type: 'string', title: 'Postal code', titles: { nl: 'Postcode', 'pt-BR': 'CEP' } }, city: { type: 'string', title: 'City' } } }

describe('propertyTitle', () => {
	it('takes the exact language, then its base, then title, then the key', () => {
		expect(propertyTitle(SCHEMA.properties.postcode, 'postcode', 'nl')).toBe('Postcode')
		expect(propertyTitle(SCHEMA.properties.postcode, 'postcode', 'nl-BE')).toBe('Postcode')
		expect(propertyTitle(SCHEMA.properties.postcode, 'postcode', 'pt-BR')).toBe('CEP')
		expect(propertyTitle(SCHEMA.properties.postcode, 'postcode', 'de')).toBe('Postal code')
		expect(propertyTitle({}, 'city', 'nl')).toBe('city')
		expect(propertyTitle(undefined, 'city', 'nl')).toBe('city')
	})

	it('names table columns and form fields in the reader\'s language', () => {
		global.__lang = 'nl'
		expect(columnsFromSchema(SCHEMA).find((c) => c.key === 'postcode').label).toBe('Postcode')
		expect(fieldsFromSchema(SCHEMA).find((f) => f.key === 'postcode').label).toBe('Postcode')
		global.__lang = 'pt_BR'
		expect(fieldsFromSchema(SCHEMA).find((f) => f.key === 'postcode').label).toBe('CEP')
		global.__lang = 'en'
		expect(fieldsFromSchema(SCHEMA).find((f) => f.key === 'city').label).toBe('City')
	})
})
