/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dialog sets its choice legend at 14px/600 on the normal line height
 * (DqDocumentGenereren "Sjabloon"). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-choice-legend-type/specs/board-choice-legend-type/spec.md
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

describe('dialog.css: the board dialog choice legend', () => {
	it('is 14px/600 on the normal line height', () => {
		const legend = bodyOf('.cn-dialog-board .cn-choice-cards__legend')
		expect(legend).toMatch(/font-size:\s*14px/)
		expect(legend).toMatch(/font-weight:\s*600/)
		expect(legend).toMatch(/line-height:\s*normal/)
	})
})
