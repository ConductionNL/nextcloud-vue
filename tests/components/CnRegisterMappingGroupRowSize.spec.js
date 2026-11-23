/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A closed group row in the board look (PqBeheer "Kassa 10 soorten") is a
 * 40px list row with square corners, as drawn: 10px above and below and a
 * rule under it, not a 44px button with the 8px corners Nextcloud gives
 * every button. Read from the component's stylesheet.
 *
 * @spec openspec/changes/register-group-row-size/specs/register-mapping/spec.md#requirement-a-closed-group-row-is-a-40px-list-row
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnRegisterMapping/CnRegisterMapping.vue'), 'utf8')
const style = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
const row = style.match(/\n\.cn-register-mapping__board-group-row \{([^}]*)\}/)[1]

describe('register mapping group row size', () => {
	it('is 40px high with square corners', () => {
		expect(row).toContain('min-height: 40px;')
		expect(row).not.toContain('min-height: 44px;')
		expect(row).toContain('border-radius: 0;')
		expect(row).toContain('padding: 10px 2px;')
	})
})
