/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqWerkbord draws the board view's hint on the left and the active filters at
 * the right of the same line. jsdom draws no layout, so the rule is read as text.
 *
 * @spec openspec/changes/board-active-filters-right-of-hint/specs/board-active-filters-right-of-hint/spec.md#requirement-the-active-filters-sit-at-the-right-of-the-board-views-hint
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the active filters after the board hint', () => {
	it('push to the right only when the hint precedes them', () => {
		const rule = css.match(/\.cn-look-board \.cn-actions-bar--board \.cn-index-page__board-hint ~ \.cn-actions-bar__active-label \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('margin-inline-start: auto;')
	})

	it('leave the active label after a bare search field alone', () => {
		const base = css.match(/\.cn-look-board \.cn-actions-bar--board \.cn-actions-bar__active-label \{([^}]*)\}/)
		expect(base[1]).not.toContain('margin-inline-start')
	})
})
