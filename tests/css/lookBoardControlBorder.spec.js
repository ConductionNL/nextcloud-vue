/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a control's edge is --cn-board-control-border, which is
 * Nextcloud's max-contrast border: 3:1 against the grounds a control sits on.
 * Nextcloud's border-dark is a hairline (#dbdbdb), so no control edge reads
 * it. jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-control-border/specs/board-control-border/spec.md#requirement-a-board-control-border-is-3-1-on-every-ground
 */
const fs = require('fs')
const path = require('path')

/**
 * A board stylesheet's text without its comments.
 *
 * @param {string} name The file under src/css.
 * @return {string} The CSS.
 */
function sheet(name) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Every rule in a sheet whose selector matches, as its body.
 *
 * @param {string} css The CSS.
 * @param {RegExp} match The selector test.
 * @return {string[]} The bodies.
 */
function bodiesOf(css, match) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (match.test(m[1])) {
			out.push(m[2])
		}
	}
	return out
}

describe('board look: control borders', () => {
	it('declares the control border as the max-contrast border', () => {
		expect(sheet('look-board.css')).toMatch(/--cn-board-control-border:\s*var\(--color-border-maxcontrast\);/)
	})

	it.each([
		['look-board.css', /cn-index-page__header-buttons|cn-action-buttons|action-item--secondary/],
		['look-board-index.css', /cn-quick-filter-bar__tab|cn-actions-bar__search-input|cn-row-actions--board|cn-actions-bar:not/],
		['look-board-detail.css', /cn-detail-page__header-actions|cn-follow-toggle|cn-activity-tab__kind/],
		['look-board-reports.css', /cn-reports-page__header-buttons/],
	])('%s draws its control edges in the control border', (file, controls) => {
		const bodies = bodiesOf(sheet(file), controls).filter((b) => /border(-color)?:|border-color:/.test(b))
		expect(bodies.length).toBeGreaterThan(0)
		for (const body of bodies) {
			expect(body).not.toMatch(/var\(--color-border-dark\)/)
		}
	})
})
