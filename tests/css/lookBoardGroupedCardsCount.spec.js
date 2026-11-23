/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A grouped card's count ("2 taken" beside a phase on DqZaaktype) is the
 * board's grey chip: 3px 10px around a 13px/600 figure on a 15px line (21px),
 * the chip ground and the soft text. The widget drew a white 12px chip.
 * jsdom draws no layout, so the rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-grouped-cards-count-chip/specs/board-grouped-cards-count-chip/spec.md#requirement-a-grouped-cards-count-is-the-boards-grey-chip
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: grouped cards count', () => {
	it('is the grey 21px chip', () => {
		const body = ruleFor('.cn-look-board .cn-grouped-cards__count:not(.cn-look-nextcloud *)')
		expect(body).not.toBeNull()
		for (const decl of ['padding: 3px 10px;', 'background: var(--color-background-dark);', 'color: var(--cn-board-text-soft);', 'font-size: 13px;', 'line-height: 15px;']) {
			expect(body).toContain(decl)
		}
	})
})
