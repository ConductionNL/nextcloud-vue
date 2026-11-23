/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The mail card's description runs on the normal line height (DqZaakEmail r29, probed after REFRESH-4b). Read from the stylesheet.
 *
 * @spec openspec/changes/board-mail-subtitle-line-height/specs/board-mail-subtitle-line-height/spec.md
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
	it('is line-height normal', () => {
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-mail-tab__subtitle.cn-mail-tab__subtitle:not(.cn-look-nextcloud *)')).toMatch(/line-height:\s*normal/)
	})
})
