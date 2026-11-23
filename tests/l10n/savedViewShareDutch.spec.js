/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The share dialog's subtitle in Dutch as board DqFilterDelen words it:
 * "Wie de weergave krijgt, ziet hem onder Gedeeld met mij. Hij is van u en
 * blijft dat."
 */
const nl = require('../../l10n/nl.json').translations

describe('saved view share dialog, Dutch', () => {
	it('words the subtitle as the board does', () => {
		expect(nl['Whoever gets the view sees it under Shared with me. It is yours and stays yours.'])
			.toBe('Wie de weergave krijgt, ziet hem onder Gedeeld met mij. Hij is van u en blijft dat.')
	})
})
