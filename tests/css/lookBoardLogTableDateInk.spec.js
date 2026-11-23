/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A plain log's date reads in the main ink (DqZaakContact r32). Read from the stylesheet.
 *
 * @spec openspec/changes/board-log-table-date-ink/specs/board-log-table-date-ink/spec.md
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

describe('src/css/look-board-index.css', () => {
	it('inks the date', () => {
		expect(bodyOf('.cn-look-board .cn-table-container--board.cn-table-container--title-text .cn-data-table td.cn-table-col--title .cn-cell-renderer__date:not(.cn-look-nextcloud *)')).toMatch(/color:\s*var\(--color-main-text\)/)
	})
})
