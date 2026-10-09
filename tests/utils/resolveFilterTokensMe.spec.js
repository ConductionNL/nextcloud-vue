/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-2
 */
import { getCurrentUser } from '@nextcloud/auth'
import { resolveFilterValue } from '../../src/utils/resolveFilterTokens.js'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn() }))

describe('@me.displayName and @me.email', () => {
	beforeEach(() => {
		getCurrentUser.mockReturnValue({ uid: 'jan', displayName: 'Jan Jansen' })
	})

	it('resolves the display name from the current user', () => {
		expect(resolveFilterValue('@me.displayName')).toBe('Jan Jansen')
	})

	it('resolves the e-mail from the supplied profile, and leaves the token when it is unknown', () => {
		expect(resolveFilterValue('@me.email', { me: { email: 'jan@example.nl' } })).toBe('jan@example.nl')
		expect(resolveFilterValue('@me.email')).toBe('@me.email')
	})

	it('the form context wins over the auth package', () => {
		expect(resolveFilterValue('@me.displayName', { me: { displayName: 'J. Jansen' } })).toBe('J. Jansen')
	})

	it('@me is still the uid, and @object.<field> reads the record', () => {
		expect(resolveFilterValue('@me')).toBe('jan')
		expect(resolveFilterValue('@object.title', { object: { title: 'T' } })).toBe('T')
	})

	it('survives no signed-in user', () => {
		getCurrentUser.mockImplementation(() => {
			throw new Error('no user')
		})
		expect(resolveFilterValue('@me.displayName')).toBe('@me.displayName')
	})
})
