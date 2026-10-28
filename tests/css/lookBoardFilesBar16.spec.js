/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A file list's bar stands 16px above what follows it, as DqZaakDocumenten
 * draws the buttons 16px over the table (r34: table y -7.2, the browser's own
 * gap is 8px). Read from the stylesheet.
 *
 * @spec openspec/changes/board-files-bar-16-above-list/specs/board-files-bar-16-above-list/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('the board files bar', () => {
	it('adds 8px under the bar to the browser\'s 8px gap', () => {
		expect(bodyOf('.cn-look-board .cn-files-browser__bar:not(.cn-look-nextcloud *)')).toMatch(/margin-block-end:\s*8px/)
	})
})
