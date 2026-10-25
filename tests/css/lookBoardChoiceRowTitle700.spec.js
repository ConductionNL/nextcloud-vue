/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a choice option's name is 700, as the dialog boards draw
 * it in <strong> (DqDocumentGenereren r26c: 600 vs 700). Read from the stylesheet.
 *
 * @spec openspec/changes/board-choice-row-title-700/specs/board-choice-row-title-700/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
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

describe('look-board.css: a choice option name', () => {
	it('is 700', () => {
		expect(bodyOf('.cn-look-board .cn-choice-cards .cn-choice-cards__row-title:not(.cn-look-nextcloud *)')).toMatch(/font-weight:\s*700/)
	})
})
