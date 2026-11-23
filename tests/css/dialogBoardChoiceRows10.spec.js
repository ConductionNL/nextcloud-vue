/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog's choice rows stand 10px apart (every dialog board; r32 DqDocumentGenereren). Read from the stylesheet.
 *
 * @spec openspec/changes/board-dialog-choice-rows-10/specs/board-dialog-choice-rows-10/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('src/css/dialog.css', () => {
	it('spaces the rows 10px', () => {
		expect(bodyOf('.cn-dialog-board .cn-choice-cards .cn-choice-cards__rows')).toMatch(/gap:\s*10px/)
	})
})
