/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The mail card's header buttons are the board's 40px control (DqZaakEmail r31). Read from the stylesheet.
 *
 * @spec openspec/changes/board-mail-header-buttons-40/specs/board-mail-header-buttons-40/spec.md
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
	it('takes the board control height', () => {
		expect(bodyOf('.cn-look-board .cn-mail-tab__header-actions .button-vue:where(:not(.cn-look-nextcloud *))')).toMatch(/--button-size:\s*var\(--cn-board-control-height\)/)
	})
})
