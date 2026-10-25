/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a plain log table (rowTitle "text") a wrapping prose cell runs at line
 * height 1.45, as DqZaakContact draws the contact summary (r26c rows 57 vs
 * 61.6; probed on :8080 with the rule injected: 63.6, the remaining 2px is
 * the cell padding 11 vs 10). Read from the stylesheet.
 *
 * @spec openspec/changes/board-log-table-prose-line-height/specs/board-log-table-prose-line-height/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-index.css: prose in a plain log', () => {
	it('runs at line height 1.45', () => {
		expect(bodyOf('.cn-look-board .cn-table-container--board.cn-table-container--title-text .cn-data-table td.cn-cell--wrap:not(.cn-look-nextcloud *)')).toMatch(/line-height:\s*1\.45/)
	})
})
