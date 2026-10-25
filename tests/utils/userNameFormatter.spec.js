/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The built-in `userName` formatter reads a Nextcloud user id as its display
 * name: DqWerkbord's card owners read "PJ" (Pieter Jansen), :8080 drew "P"
 * from the id "pieter" (r29). While the name is looked up the id stands.
 *
 * @spec openspec/changes/user-name-formatter/specs/user-name-formatter/spec.md#requirement-a-user-id-can-read-as-its-display-name
 */
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn(async (id) => (id === 'pieter' ? { id, label: 'Pieter Jansen' } : null)),
}))

const { BUILT_IN_FORMATTERS } = require('../../src/utils/builtInFormatters.js')
const { clearUserDisplayNames } = require('../../src/utils/userDisplayName.js')

beforeEach(() => clearUserDisplayNames())

describe('the userName formatter', () => {
	it('reads the id while the name is looked up, then the display name', async () => {
		const format = BUILT_IN_FORMATTERS.userName
		expect(format('pieter')).toBe('pieter')
		await new Promise((resolve) => setTimeout(resolve))
		expect(format('pieter')).toBe('Pieter Jansen')
	})

	it('keeps an id nobody answers for, and reads nothing as nothing', async () => {
		const format = BUILT_IN_FORMATTERS.userName
		format('ghost')
		await new Promise((resolve) => setTimeout(resolve))
		expect(format('ghost')).toBe('ghost')
		expect(format('')).toBe('')
		expect(format(null)).toBe('')
	})
})
