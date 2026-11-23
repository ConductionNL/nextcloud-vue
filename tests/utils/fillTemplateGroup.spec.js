/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{path|group}` in a template: a group id's display name, so a planned
 * action owned by a team reads "Owner team Woo en informatie" (DqZaakTaken),
 * not the group id. Empty until the name is known, which empties the line
 * the way `{path|user}` does.
 */
import { fillTemplate } from '../../src/utils/fillTemplate.js'
import { groupDisplayName, loadGroupDisplayName } from '../../src/utils/groupAutocomplete.js'

jest.mock('../../src/utils/groupAutocomplete.js', () => ({
	groupDisplayName: jest.fn(),
	loadGroupDisplayName: jest.fn(() => Promise.resolve('')),
}))

describe('fillTemplate group', () => {
	beforeEach(() => {
		groupDisplayName.mockReset()
		loadGroupDisplayName.mockClear()
	})

	it('writes the group\'s display name', () => {
		groupDisplayName.mockReturnValue('Woo en informatie')
		expect(fillTemplate('Owner team {ownerGroup|group}', { ownerGroup: 'woo-team' })).toBe('Owner team Woo en informatie')
		expect(loadGroupDisplayName).not.toHaveBeenCalled()
	})

	it('starts the lookup and empties the line while the name is unknown', () => {
		groupDisplayName.mockReturnValue(null)
		expect(fillTemplate('Owner team {ownerGroup|group}', { ownerGroup: 'woo-team' })).toBe('')
		expect(loadGroupDisplayName).toHaveBeenCalledWith('woo-team')
	})

	it('empties the line without a group', () => {
		expect(fillTemplate('Owner team {ownerGroup|group}', {})).toBe('')
		expect(groupDisplayName).not.toHaveBeenCalled()
	})
})
