/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A case header puts its meta 22px under the title row (every case board; r32 every card 16px high). Read from the stylesheet.
 *
 * @spec openspec/changes/board-case-header-meta-22/specs/board-case-header-meta-22/spec.md
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

describe('src/css/look-board-detail.css', () => {
	it('adds 16px above row 2 when the header holds a widget', () => {
		expect(bodyOf('.cn-look-board .cn-detail-page__header:has(> .cn-detail-page__header-widget) > .cn-detail-page__header-row2:not(.cn-look-nextcloud *)')).toMatch(/margin-top:\s*16px/)
	})
})
