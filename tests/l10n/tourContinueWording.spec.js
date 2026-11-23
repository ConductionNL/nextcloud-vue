/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The user settings' tour button reads as the board words it
 * (DqPersoonlijkeInstellingen: "Verder met de rondleiding").
 *
 * @spec openspec/changes/tour-continue-wording/specs/i18n/spec.md
 */
const nl = require('../../l10n/nl.json')

describe('tour continue wording', () => {
	it('reads "Verder met de rondleiding" in Dutch', () => {
		const translations = nl.translations || nl
		expect(translations['Continue where you left off']).toBe('Verder met de rondleiding')
	})
})
