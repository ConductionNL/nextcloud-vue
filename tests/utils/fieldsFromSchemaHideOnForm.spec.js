/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fieldsFromSchema `hideOnForm`: a property shown where the record is read but
 * never asked on a form.
 */

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: jest.fn(() => null),
}))

import { fieldsFromSchema } from '../../src/utils/schema.js'

const schema = {
	properties: {
		name: { type: 'string', title: 'Name' },
		status: { type: 'string', title: 'Status', enum: ['pending', 'approved'], hideOnForm: true },
		rating: { type: 'integer', title: 'Rating', hideOnForm: false },
	},
}

const keys = (options) => fieldsFromSchema(schema, { isAdmin: false, ...options }).map((field) => field.key).sort()

describe('fieldsFromSchema hideOnForm', () => {
	it('leaves the property out of a form', () => {
		expect(keys({ form: true })).toEqual(['name', 'rating'])
	})

	it('keeps it where the record is read', () => {
		expect(keys({})).toEqual(['name', 'rating', 'status'])
		expect(keys({ includeReadOnly: true })).toEqual(['name', 'rating', 'status'])
	})

	it('brings it back on a form whose overrides say hidden: false', () => {
		expect(keys({ form: true, overrides: { status: { hidden: false } } })).toEqual(['name', 'rating', 'status'])
	})
})
