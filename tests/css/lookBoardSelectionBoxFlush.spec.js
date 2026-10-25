/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * r29: the selection box in a record card head and a list row stood 7-9px
 * further in than the boards draw it (DqAanMijToegewezen box 23px into the
 * card, DqTeamwachtrij box 18px into the row with the lead at 50): NcCheckbox
 * pads its content 7px on each side. In the board look the box sits flush.
 * jsdom draws no layout, so the rules are read as text.
 *
 * @spec openspec/changes/board-selection-box-flush/specs/board-selection-box-flush/spec.md#requirement-a-cards-and-a-rows-selection-box-sits-where-the-board-draws-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the selection box in the board look', () => {
	it('draws without NcCheckbox\'s side padding in a card head and a list row', () => {
		const rule = css.match(/\.cn-look-board \.cn-object-card__record-head > \.cn-object-card__checkbox \.checkbox-radio-switch__content,\s*\.cn-look-board \.cn-object-row__checkbox \.checkbox-radio-switch__content \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('padding-inline: 0;')
	})

	it('starts 18px into a list row, as the queue board', () => {
		const rule = css.match(/\.cn-look-board \.cn-object-row__checkbox \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('margin-inline-start: 6px;')
	})
})
