/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a page card the notes tab's "Add note" stands in the card's title row and
 * each note thread opens with a hairline (DqZaakEmail "Notities", r26c:
 * header.actions 1 vs 0, header.separator 1 vs 0). Read from the stylesheet.
 *
 * @spec openspec/changes/board-notes-card-add-in-title-row/specs/board-notes-card-add-in-title-row/spec.md
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

describe('look-board-detail.css: the notes tab in a page card', () => {
	it('puts Add note at the end of the title row, level with the title', () => {
		const toggle = bodyOf('.cn-look-board .cn-detail-widget-host .cn-widget-wrapper .cn-sidebar-tab__composer-toggle:not(.cn-look-nextcloud *)')
		expect(toggle).toMatch(/position:\s*absolute/)
		expect(toggle).toMatch(/top:\s*20px/)
		expect(toggle).toMatch(/inset-inline-end:\s*var\(--cn-board-card-inline-padding\)/)
	})

	it('opens every note thread with a hairline, 12px 0', () => {
		const thread = bodyOf('.cn-look-board .cn-detail-widget-host .cn-notes-tab__thread:not(.cn-look-nextcloud *)')
		expect(thread).toMatch(/border-top:\s*1px solid var\(--cn-board-hairline\)/)
		expect(thread).toMatch(/padding:\s*12px 0/)
	})
})
