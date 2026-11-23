/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws an action tile with 10px between icon and label and a
 * 14px label at normal leading (PqWerkplekKlant "Snelle acties"). jsdom has no
 * layout, so the stylesheet is read as text.
 *
 * @spec openspec/changes/board-action-tiles-as-drawn/specs/board-action-tiles-as-drawn/spec.md#requirement-an-action-tile-is-drawn-as-the-board-draws-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'css', 'look-board.css'), 'utf8')

/**
 * The declarations of every rule whose selector list ends with the given tail.
 *
 * @param {string} tail the end of the selector
 * @return {string} the joined declaration blocks
 */
function rulesEndingWith(tail) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css)) !== null) {
		const selectors = m[1].split(',').map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').trim())
		if (selectors.some((s) => s.replace(/:not\(\.cn-look-nextcloud \*\)/g, '').endsWith(tail))) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: action tiles', () => {
	it('puts 10px between the icon and the label', () => {
		const tile = rulesEndingWith('.cn-look-board .cn-action-tiles .cn-action-tiles__tile')
		expect(tile).toMatch(/gap:\s*10px/)
	})

	it('draws the label at 14px on a normal line height', () => {
		const label = rulesEndingWith('.cn-look-board .cn-action-tiles .cn-action-tiles__label')
		expect(label).toMatch(/font-size:\s*14px/)
		expect(label).toMatch(/line-height:\s*normal/)
	})

	it('keeps the rules under the board look only', () => {
		expect(css).not.toMatch(/(^|[},]\s*)\.cn-action-tiles__(tile|label)\s*[,{]/m)
	})
})
