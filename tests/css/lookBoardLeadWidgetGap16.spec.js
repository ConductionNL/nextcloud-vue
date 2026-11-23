/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A lead widget stands 16px above the card's body (DqZaakDocumenten r29). Read from the stylesheet.
 *
 * @spec openspec/changes/board-lead-widget-gap-16/specs/board-lead-widget-gap-16/spec.md
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
	it('leaves 16px under the lead', () => {
		expect(bodyOf('.cn-look-board .cn-detail-widget-host__lead:not(.cn-look-nextcloud *)')).toMatch(/margin-bottom:\s*16px/)
	})
})
