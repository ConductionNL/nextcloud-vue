/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a sections widget's footnote is a 13px line on the
 * font's own leading, as DqDoorlooptijd draws the Naleving footnote: the
 * body's 1.5 made it 19.5 high against 15.6 (r34 gapBelowTitle 504>508.6).
 * Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: the sections widget footnote', () => {
	it('sets the footnote on the normal line height', () => {
		expect(rulesFor('.cn-look-board .cn-sections-widget__footnote:not(.cn-look-nextcloud *)')).toContain('line-height: normal')
	})
})
