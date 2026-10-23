const { loadMyTeam, registerMyTeamSource } = require('../../src/utils/myTeam.js')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `@myTeam` is the reader's primary team as the app answers it: the group id,
 * the bare token while it is read (the caller waits), and the optional
 * `@myTeam?` for a reader in no team (the caller drops the key).
 *
 * @spec openspec/changes/saved-view-tokens-my-team/specs/schema-utilities/spec.md#requirement-myteam-resolves-to-the-current-users-primary-team
 */
const { dropOptionalUnresolved, hasUnresolvedTokens, resolveFilterTokens } = require('../../src/utils/resolveFilterTokens.js')

afterEach(() => registerMyTeamSource(null))

describe('@myTeam', () => {
	it('is the group the app answers, once read', async () => {
		registerMyTeamSource(() => Promise.resolve('zuiddrecht-woo-en-informatie'))
		expect(resolveFilterTokens({ assignedGroup: '@myTeam' })).toEqual({ assignedGroup: '@myTeam' })
		expect(hasUnresolvedTokens({ assignedGroup: '@myTeam' })).toBe(true)
		await loadMyTeam()
		expect(resolveFilterTokens({ assignedGroup: '@myTeam' })).toEqual({ assignedGroup: 'zuiddrecht-woo-en-informatie' })
	})

	it('is dropped for a reader in no team, or when the read fails', async () => {
		registerMyTeamSource(() => Promise.resolve(''))
		await loadMyTeam()
		expect(dropOptionalUnresolved(resolveFilterTokens({ assignedGroup: '@myTeam', status: 'open' }))).toEqual({ status: 'open' })
		registerMyTeamSource(() => Promise.reject(new Error('500')))
		await loadMyTeam()
		expect(dropOptionalUnresolved(resolveFilterTokens({ assignedGroup: '@myTeam' }))).toEqual({})
	})

	it('takes ctx.myTeam first, and asks the app once', async () => {
		const loader = jest.fn(() => Promise.resolve('a'))
		registerMyTeamSource(loader)
		expect(resolveFilterTokens({ g: '@myTeam' }, { myTeam: 'b' })).toEqual({ g: 'b' })
		await Promise.all([loadMyTeam(), loadMyTeam()])
		expect(loader).toHaveBeenCalledTimes(1)
	})
})
