/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The reply box's buttons are the board's 40px control (DqZaakContact r29). Read from the stylesheet.
 *
 * @spec openspec/changes/board-conversation-reply-buttons-40/specs/board-conversation-reply-buttons-40/spec.md
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
		expect(bodyOf('.cn-look-board .cn-conversation-thread__reply .button-vue:where(:not(.cn-look-nextcloud *))')).toMatch(/--button-size:\s*var\(--cn-board-control-height\)/)
	})
})
