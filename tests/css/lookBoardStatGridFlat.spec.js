/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat grid card on a board dashboard (DqDagAfsluiten "Uw dag") draws
 * plain figures at the card inset. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-stat-grid-flat/specs/board-stat-grid-flat/spec.md#requirement-a-board-stat-grid-draws-flat-figures-at-the-card-inset
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const page = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *)'

describe('look-board.css: a dashboard stat grid', () => {
	it('sits at the card inset, 4px under the header, cells 16px apart', () => {
		const rule = rulesFor(`${page} .cn-widget-wrapper:not(.cn-widget-wrapper--borderless) .cn-stat-grid`)
		expect(rule).toContain('padding: 0 var(--cn-board-dashboard-card-inset) 20px')
		expect(rule).toContain('margin: 4px 0 0')
		expect(rule).toContain('gap: 16px')
	})

	it('draws its cells flat with the board type', () => {
		const rule = rulesFor(`${page} .cn-stat-grid .cn-kpi-card.cn-kpi-card--stacked`)
		expect(rule).toContain('--cn-kpi-stacked-padding: 0')
		expect(rule).toContain('--cn-kpi-stacked-gap: 2px')
		expect(rule).toContain('--cn-kpi-stacked-title-size: 13px')
		expect(rule).toContain('--cn-kpi-stacked-value-size: 24px')
		expect(rule).toContain('border-width: 0')
	})
})
