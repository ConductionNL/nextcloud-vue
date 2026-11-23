/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a mail tab in a page card reads as the card: no padding
 * of its own, 12px between its parts, the heading 17px/700 (DqZaakEmail r26c:
 * title inset 35 vs 23, 16px vs 17px). Read from the stylesheet.
 *
 * @spec openspec/changes/board-mail-tab-in-card/specs/board-mail-tab-in-card/spec.md
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

describe('look-board-detail.css: a mail tab in a page card', () => {
	it('has no padding of its own and 12px between its parts', () => {
		const body = bodyOf('.cn-look-board .cn-detail-widget-host .cn-mail-tab:not(.cn-look-nextcloud *)')
		expect(body).toMatch(/padding:\s*0;/)
		expect(body).toMatch(/gap:\s*12px/)
	})

	it('sets the heading as the card title, 17px/700', () => {
		const title = bodyOf('.cn-look-board .cn-detail-widget-host .cn-mail-tab__title:not(.cn-look-nextcloud *)')
		expect(title).toMatch(/font-size:\s*17px/)
		expect(title).toMatch(/font-weight:\s*700/)
	})
})
