/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board matrix's checkbox is a block box, so the row stays 42px (r29
 * DqPersoonlijkeInstellingen: 44.6 live). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/notification-matrix-row-height/specs/notification-matrix/spec.md
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnNotificationMatrix/CnNotificationMatrix.vue'), 'utf8')

describe('CnNotificationMatrix board checkbox', () => {
	it('draws the checkbox as a block, 1px low and centred', () => {
		const at = sfc.indexOf(".cn-notification-matrix__table tbody td input[type='checkbox'] {")
		const rule = sfc.slice(at, sfc.indexOf('}', at))
		expect(at).toBeGreaterThan(-1)
		expect(rule).toContain('display: block;')
		expect(rule).toContain('margin: 1px auto 0;')
	})

	it('draws the checkbox as Nextcloud\'s checkbox icon, primary when checked', () => {
		const at = sfc.indexOf(".cn-notification-matrix__table tbody td input[type='checkbox'] {")
		const rule = sfc.slice(at, sfc.indexOf('}', at))
		expect(rule).toContain('appearance: none;')
		expect(rule).toMatch(/mask: url\("data:image\/svg\+xml/)
		const checked = sfc.slice(sfc.indexOf(":checked {", at), sfc.indexOf('}', sfc.indexOf(':checked {', at)))
		expect(checked).toContain('background-color: var(--color-primary-element);')
	})
})
