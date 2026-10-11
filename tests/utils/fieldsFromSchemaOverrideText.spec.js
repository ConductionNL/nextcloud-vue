/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A field override's display text goes through the translate function, as the
 * schema's own title and description do (screens-form-override-labels-parity).
 * dossiq's new case form showed "Requester" to a Dutch user whose catalogue
 * holds "Aanvrager", because `fieldOverrides.requester.label` was merged in raw.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { fieldsFromSchema } from '../../src/utils/schema.js'

const DUTCH = { Requester: 'Aanvrager', 'How the request came in': 'Hoe het verzoek binnenkwam', 'Search a person': 'Zoek een persoon', Channel: 'Kanaal' }
const translate = (text) => DUTCH[text] || text

const SCHEMA = {
	properties: {
		requester: { type: 'string', title: 'Requester id' },
		intakeChannel: { type: 'string', title: 'Channel', description: 'Raw schema text', enum: ['manual', 'email'] },
	},
}

function field(fields, key) {
	return fields.find((f) => f.key === key)
}

describe('fieldsFromSchema override text', () => {
	it('translates an override label, description and placeholder', () => {
		const fields = fieldsFromSchema(SCHEMA, {
			translate,
			overrides: {
				requester: { label: 'Requester', placeholder: 'Search a person' },
				intakeChannel: { description: 'How the request came in' },
			},
		})
		expect(field(fields, 'requester').label).toBe('Aanvrager')
		expect(field(fields, 'requester').placeholder).toBe('Zoek een persoon')
		expect(field(fields, 'intakeChannel').description).toBe('Hoe het verzoek binnenkwam')
		expect(field(fields, 'intakeChannel').label).toBe('Kanaal')
	})

	it('keeps the override text as written without a translate function', () => {
		const fields = fieldsFromSchema(SCHEMA, { overrides: { requester: { label: 'Requester' } } })
		expect(field(fields, 'requester').label).toBe('Requester')
	})

	it('keeps text no catalogue knows as written', () => {
		const fields = fieldsFromSchema(SCHEMA, { translate, overrides: { requester: { label: 'Initiator' } } })
		expect(field(fields, 'requester').label).toBe('Initiator')
	})

	it('leaves other override keys alone', () => {
		const fields = fieldsFromSchema(SCHEMA, { translate, overrides: { requester: { widget: 'textarea' } } })
		expect(field(fields, 'requester').widget).toBe('textarea')
		expect(field(fields, 'requester').label).toBe('Requester id')
	})
})

describe('the optional-field suffix in Dutch', () => {
	it('reads "niet verplicht", as the DqNieuweZaak board', () => {
		const nl = JSON.parse(readFileSync(join(__dirname, '../../l10n/nl.json'), 'utf8')).translations
		expect(nl.optional).toBe('niet verplicht')
	})
})
