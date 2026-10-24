/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page with a side panel is a grid of seven rows (head, below,
 * stats, chips, bar, body, extra). A row-gap opens between every pair of rows,
 * empty or not, so a page without below-header, stat row or chip row drew
 * three gaps (60px) of nothing between its header and its toolbar
 * (DqZoekresultaten). In the board look the grid has no row gap; each present
 * part carries the section gap under it. Read from the stylesheet text.
 *
 * @spec openspec/changes/side-panel-grid-no-empty-row-gaps/specs/side-panel-grid-no-empty-row-gaps/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const PAGE = '.cn-look-board .cn-index-page--with-side-panel:not(.cn-look-nextcloud *)'

/** The declarations of the rule whose selector list holds `selector`. */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	let out = ''
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out += m[2]
		}
	}
	return out
}

describe('look-board-index.css: side-panel grid', () => {
	it('has no row gap', () => {
		expect(rule(PAGE)).toMatch(/row-gap: 0;/)
	})

	it.each(['> :first-child', '> .cn-index-page__below-header', '> .cn-index-page__stat-row', '> .cn-actions-bar'])('puts the section gap under %s', (part) => {
		expect(rule(`${PAGE} ${part}`)).toMatch(/margin-bottom: var\(--cn-board-section-gap\);/)
	})

	it('keeps the chip row its own 12px on top of the section gap', () => {
		expect(rule(`${PAGE} > .cn-index-page__quick-filter-row`)).toMatch(/margin-bottom: calc\(var\(--cn-board-section-gap\) \+ 12px\);/)
	})
})
