/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board draws a bar list's footnote as a 13px muted line (DqDashboard
 * "Klik een balk om de zaken te zien"); inside the chart's HTML body it took
 * the page's 15px text in the full ink, which thematiq sets on every `p`
 * with !important. jsdom draws no layout, so the rule is
 * read from the stylesheet text.
 *
 * @spec openspec/changes/board-chart-footnote/specs/board-chart-footnote/spec.md#requirement-a-board-chart-footnote-under-a-bar-list-or-matrix-is-a-small-muted-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board.css: chart footnote', () => {
	it('draws the footnote under a bar list or matrix 13px in the muted ink', () => {
		const body = bodiesOf('.cn-look-board .cn-chart-widget__html:not(.cn-look-nextcloud *) .cn-chart-widget__footnote')
		expect(body).toContain('font-size: 13px !important;')
		expect(body).toContain('line-height: normal !important;')
		expect(body).toContain('color: var(--color-text-maxcontrast) !important;')
	})
})
