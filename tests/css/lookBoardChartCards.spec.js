/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a dashboard card holding a bar list or a matrix drops its
 * header rule; every other card (plain stat tiles among them, see
 * e2e/l21-stats-box-card-inset) keeps it. jsdom draws no layout, so the rule
 * is read from the stylesheet text.
 *
 * @spec openspec/changes/chart-bar-list-and-matrix/specs/chart-bar-list-and-matrix/spec.md#requirement-board-bar-list-and-matrix-cards-draw-no-header-rule
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The selectors of every rule whose body sets `border-bottom: none` on a
 * dashboard card header.
 *
 * @return {string[]} The selectors.
 */
function headerRuleSelectors() {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (!/border-bottom:\s*none/.test(m[2])) {
			continue
		}
		for (const selector of m[1].split(',').map((s) => s.trim())) {
			if (selector.includes('.cn-dashboard-page') && selector.endsWith('.cn-widget-wrapper__header')) {
				out.push(selector)
			}
		}
	}
	return out
}

describe('look-board.css: dashboard card header rules', () => {
	it('drops the header rule on cards holding a bar list or a matrix', () => {
		expect(headerRuleSelectors()).toContain('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:has(.cn-chart-widget__html) .cn-widget-wrapper__header')
	})

	it('drops it on no dashboard card without a :has() condition, so plain stat tiles keep theirs', () => {
		expect(headerRuleSelectors().filter((selector) => !selector.includes(':has('))).toEqual([])
	})
})
