/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A sidebar tab (Files, Notes, ...) rendered as a widget on a detail page adds
 * no padding of its own in the board look: the card pads it (DqZaakDocumenten
 * r26c: the files table 12px in from the card title). Read from the stylesheet.
 *
 * @spec openspec/changes/board-sidebar-tab-flush-in-card/specs/board-sidebar-tab-flush-in-card/spec.md
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

describe('look-board-detail.css: a sidebar tab in a page card', () => {
	it('has no padding of its own', () => {
		expect(bodyOf('.cn-look-board .cn-detail-widget-host .cn-sidebar-tab:not(.cn-look-nextcloud *)')).toMatch(/padding:\s*0;/)
	})
})
