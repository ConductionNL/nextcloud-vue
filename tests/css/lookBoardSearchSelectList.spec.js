/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A search select's open list in the board look is a card under the field,
 * its rows as drawn (boards DqNieuweZaak "Aanvrager", DqOverdragen "Nieuw
 * team"). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const BODY = 'body:has(.cn-look-board):not(:has(.cn-look-nextcloud))'
const MENU = `${BODY} .vs__dropdown-menu:has(.cn-search-select__row)`

/**
 * The declarations of the rule that starts with a selector.
 *
 * @param {string} selector The selector text.
 * @return {string} The declarations.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('look-board.css: a search select\'s open list', () => {
	it('draws the list as a card 4px under the field: a hairline all round, radius 8, a soft shadow', () => {
		const menu = rule(MENU)
		expect(menu).toMatch(/margin-top: 4px;/)
		expect(menu).toMatch(/border: 1px solid var\(--color-border\) !important;/)
		expect(menu).toMatch(/border-radius: 8px !important;/)
		expect(menu).toMatch(/box-shadow: [^;]+ !important;/)
	})

	it('keeps the card under a field that opens upward too', () => {
		expect(rule(`${MENU}.vs__dropdown-menu--floating-placement-top`)).toMatch(/margin-top: 0;/)
	})

	it('marks the highlighted row on the light primary ground', () => {
		expect(rule(`${MENU} .vs__dropdown-option--highlight`)).toMatch(/background: var\(--color-primary-element-light\);/)
	})

	it('sets a person row 8px 10px in, with a 28px chip in 12px bold initials and 14px / 12px text', () => {
		expect(rule(`${MENU} .vs__dropdown-option:has(.cn-search-select__lead--avatar)`)).toMatch(/padding: 8px 10px;/)
		const lead = rule(`${MENU} .cn-search-select__lead--avatar`)
		expect(lead).toMatch(/flex-basis: 28px;/)
		expect(lead).toMatch(/width: 28px;/)
		expect(lead).toMatch(/height: 28px;/)
		expect(lead).toMatch(/font-size: 12px;/)
		expect(lead).toMatch(/font-weight: 700;/)
		expect(rule(`${MENU} .vs__dropdown-option:has(.cn-search-select__lead--avatar) .cn-search-select__name`)).toMatch(/font-size: 14px;/)
		expect(rule(`${MENU} .vs__dropdown-option:has(.cn-search-select__lead--avatar) .cn-search-select__secondary`)).toMatch(/font-size: 12px;/)
	})

	it('sets a row with an icon 10px 12px in, 12px between the icon and the text', () => {
		const row = rule(`${MENU} .vs__dropdown-option:has(.cn-search-select__lead:not(.cn-search-select__lead--avatar))`)
		expect(row).toMatch(/padding: 10px 12px;/)
		expect(rule(`${MENU} .vs__dropdown-option:has(.cn-search-select__lead:not(.cn-search-select__lead--avatar)) .cn-search-select__row`)).toMatch(/gap: 12px;/)
	})

	it('draws a lead on the grey ground in the soft ink, and white on the highlighted row', () => {
		const lead = rule(`${MENU} .cn-search-select__lead`)
		expect(lead).toMatch(/background: var\(--color-background-hover\);/)
		expect(lead).toMatch(/color: color-mix\(/)
		const active = rule(`${MENU} .vs__dropdown-option--highlight .cn-search-select__lead`)
		expect(active).toMatch(/background: var\(--color-main-background\);/)
		expect(active).toMatch(/color: var\(--color-primary-element-light-text\);/)
	})

	it('draws the open search field with a 2px edge in the primary colour', () => {
		const field = rule('.cn-look-board .cn-search-select .v-select.select.vs--open:not(.cn-look-nextcloud *) .input-field__input')
		expect(field).toMatch(/border-width: 2px;/)
		expect(field).toMatch(/border-color: var\(--color-primary-element\);/)
	})
})
