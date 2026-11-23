/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A note in a page card starts at the card's inset, its text 12px after the icon (DqZaakEmail Notities r29). Read from the stylesheet.
 *
 * @spec openspec/changes/board-notes-card-rows-flush/specs/board-notes-card-rows-flush/spec.md
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
	it('drops the list-item padding and starts the text 12px after the icon', () => {
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread .list-item:not(.cn-look-nextcloud *)')).toMatch(/padding:\s*0;/)
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread .list-item-content:not(.cn-look-nextcloud *)')).toMatch(/padding-inline-start:\s*12px/)
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread .list-item-content__name:not(.cn-look-nextcloud *)')).toMatch(/line-height:\s*normal/)
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread .list-item__anchor > :first-child:not(.list-item-content):not(.cn-look-nextcloud *)')).toMatch(/align-self:\s*flex-start/)
	})
})
