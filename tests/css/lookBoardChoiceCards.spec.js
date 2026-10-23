/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceCards' rows in the board look, as the dialog boards draw their
 * options (DqVolgendeStap, DqBesluit, DqDocumentGenereren, DqFilterBewerken;
 * r24 measured 47 items): an option is edged in the dark border grey
 * (130,138,149, live drew the hairline 228,230,234), rounded at 10px (live 12),
 * and its radio is 18px (live 13). The chosen and the refused options keep
 * their own edges. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const cards = '.cn-look-board .cn-choice-cards'
const guard = ':not(.cn-look-nextcloud *)'

describe('look-board.css: choice cards', () => {
	it('rounds every option and the chosen option\'s frame at 10px', () => {
		expect(rule(`${cards} .cn-choice-cards__row${guard},\n${cards} .cn-choice-cards__cell--with-details${guard}`)).toContain('border-radius: 10px')
	})

	it('edges an option that is neither chosen nor refused in the dark border grey', () => {
		const idle = rule(`${cards} .cn-choice-cards__row:not(.cn-choice-cards__row--selected):not(.cn-choice-cards__row--disabled)${guard}`)
		expect(idle).toContain('border-color: var(--color-border-maxcontrast)')
	})

	it('draws the radio at 18px', () => {
		const radio = rule(`${cards} .cn-choice-cards__row-input${guard}`)
		expect(radio).toContain('width: 18px')
		expect(radio).toContain('height: 18px')
	})

	it('only reaches the board look', () => {
		const selectors = css.match(/[^{}]*cn-choice-cards[^{}]*\{/g) || []
		expect(selectors.length).toBeGreaterThan(0)
		for (const s of selectors) {
			for (const part of s.replace('{', '').split(',')) {
				expect(part.trim().startsWith('.cn-look-board')).toBe(true)
				expect(part.trim().endsWith(guard)).toBe(true)
			}
		}
	})
})
