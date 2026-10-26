/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The mail card's template button reads "Concept openen uit sjabloon", as
 * DqZaakEmail draws it and as every board words a template action ("Document
 * maken uit sjabloon", "Toevoegen uit sjabloon"); the catalogue said "vanuit".
 *
 * @spec openspec/changes/mail-tab-template-uit-sjabloon/specs/mail-tab-template-uit-sjabloon/spec.md#requirement-the-template-button-reads-uit-sjabloon
 */
const fs = require('fs')
const path = require('path')

const nl = JSON.parse(fs.readFileSync(path.join(__dirname, '../../l10n/nl.json'), 'utf8')).translations

describe('nl: the mail card template button', () => {
	it('reads "Concept openen uit sjabloon"', () => {
		expect(nl['Open draft from template']).toBe('Concept openen uit sjabloon')
	})
})
