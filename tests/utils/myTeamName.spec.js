/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reader's team by name, for the count line's `{myTeam}` (DqTeamwachtrij
 * "· team Woo en informatie"), and the bracketed part that goes for a reader
 * in no team.
 *
 * @spec openspec/changes/count-line-my-team-name/specs/index-page/spec.md#requirement-the-count-line-can-name-the-readers-team
 */
const { fillMyTeamToken, loadMyTeamName, peekMyTeamName, registerMyTeamNameSource } = require('../../src/utils/myTeam.js')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

afterEach(() => registerMyTeamNameSource(null))

const LINE = '{shown} of {total} open cases without a handler[ · team {myTeam}] · oldest first'

describe('the reader\'s team name', () => {
	it('is what the app answers, once read', async () => {
		registerMyTeamNameSource(() => Promise.resolve('Woo en informatie'))
		expect(peekMyTeamName()).toBeNull()
		expect(await loadMyTeamName()).toBe('Woo en informatie')
		expect(peekMyTeamName()).toBe('Woo en informatie')
	})

	it('is empty without a source or when the read fails', async () => {
		expect(await loadMyTeamName()).toBe('')
		registerMyTeamNameSource(() => Promise.reject(new Error('503')))
		expect(await loadMyTeamName()).toBe('')
	})

	it('fills {myTeam}, and leaves out a bracketed part without a name', () => {
		expect(fillMyTeamToken(LINE, 'Woo en informatie')).toBe('{shown} of {total} open cases without a handler · team Woo en informatie · oldest first')
		expect(fillMyTeamToken(LINE, '')).toBe('{shown} of {total} open cases without a handler · oldest first')
		expect(fillMyTeamToken('{shown} of {total}', '')).toBe('{shown} of {total}')
	})

	it('names the team in the board count line', async () => {
		registerMyTeamNameSource(() => Promise.resolve('Woo en informatie'))
		await loadMyTeamName()
		const ctx = {
			isBoardLook: true,
			effectivePagination: { total: 11 },
			effectiveObjects: new Array(7).fill({}),
			presentedCountText: LINE,
			countSubtitle: '',
			headerMetaCarriesCount: false,
			sourceTerm: '',
			cnTranslate: (text) => text,
		}
		expect(CnIndexPage.computed.headerDescriptionBase.call(ctx)).toBe('7 of 11 open cases without a handler · team Woo en informatie · oldest first')
	})
})
