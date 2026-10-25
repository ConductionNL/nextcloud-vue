/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a plain log table (rowTitle "text") an icon-and-name cell is regular,
 * as DqZaakContact draws Kanaal; live drew it 600. Read from the stylesheet.
 *
 * @spec openspec/changes/board-log-table-icon-label-regular/specs/board-log-table-icon-label-regular/spec.md
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

describe('look-board-index.css: an icon label in a plain log', () => {
	it('is 400', () => {
		expect(bodyOf('.cn-look-board .cn-table-container--board.cn-table-container--title-text .cn-cell-renderer__icon-label:not(.cn-look-nextcloud *)')).toMatch(/font-weight:\s*400/)
	})
})
