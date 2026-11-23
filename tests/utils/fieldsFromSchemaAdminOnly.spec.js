/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * fieldsFromSchema `x-admin-only`: a property only an instance administrator
 * sees on a form.
 */

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: jest.fn(() => null),
}))

import { getCurrentUser } from '@nextcloud/auth'
import { fieldsFromSchema } from '../../src/utils/schema.js'

const schema = {
	properties: {
		title: { type: 'string', title: 'Title' },
		adminGroups: { type: 'array', title: 'Administrators', 'x-admin-only': true, items: { type: 'string' } },
		notes: { type: 'string', title: 'Notes', 'x-admin-only': false },
	},
}

const keys = (options) => fieldsFromSchema(schema, options).map((field) => field.key)

describe('fieldsFromSchema x-admin-only', () => {
	afterEach(() => {
		getCurrentUser.mockReset()
		getCurrentUser.mockImplementation(() => null)
	})

	it('drops the field for a viewer who is not an administrator', () => {
		expect(keys({ isAdmin: false }).sort()).toEqual(['notes', 'title'])
	})

	it('keeps the field for an administrator', () => {
		expect(keys({ isAdmin: true }).sort()).toEqual(['adminGroups', 'notes', 'title'])
	})

	it('reads the signed-in user when isAdmin is not given', () => {
		getCurrentUser.mockImplementation(() => ({ uid: 'admin', isAdmin: true }))
		expect(keys()).toContain('adminGroups')

		getCurrentUser.mockImplementation(() => ({ uid: 'beheer', isAdmin: false }))
		expect(keys()).not.toContain('adminGroups')
	})

	it('drops the field when nobody is signed in or the lookup throws', () => {
		expect(keys()).not.toContain('adminGroups')
		getCurrentUser.mockImplementation(() => {
			throw new Error('no user')
		})
		expect(keys()).not.toContain('adminGroups')
	})
})
