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
		const checked = sfc.slice(sfc.indexOf(':checked {', at), sfc.indexOf('}', sfc.indexOf(':checked {', at)))
		expect(checked).toContain('background-color: var(--color-primary-element) !important;')
	})
})

// The board look grounds every native checkbox transparent (!important) at
// 18px (look-board.css). Over the matrix's masked box that ground is the
// icon's colour, so the box drew nothing (r34 DqPersoonlijkeInstellingen).
describe('CnNotificationMatrix board checkbox under the board look', () => {
	const lookBoard = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('marks the cell checkbox with its own class', () => {
		const input = sfc.slice(sfc.indexOf('data-testid="cn-nm-toggle"') - 200, sfc.indexOf('data-testid="cn-nm-toggle"'))
		expect(input).toContain('class="cn-notification-matrix__checkbox"')
	})

	it('is left out of the board look\'s native checkbox ground and size', () => {
		const selector = lookBoard.split('{').find((s) => s.includes('.cn-look-board input[type="checkbox"]'))
		expect(selector).toContain(':not(.cn-notification-matrix__checkbox)')
	})

	it('holds its drawn colour against a theme ground, checked or not', () => {
		const at = sfc.indexOf(".cn-notification-matrix__table tbody td input[type='checkbox'] {")
		const rule = sfc.slice(at, sfc.indexOf('}', at))
		expect(rule).toContain('background-color: var(--color-text-maxcontrast) !important;')
		const checked = sfc.slice(sfc.indexOf(':checked {', at), sfc.indexOf('}', sfc.indexOf(':checked {', at)))
		expect(checked).toContain('background-color: var(--color-primary-element) !important;')
	})
})
