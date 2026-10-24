/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board view's "Zaaktype:" select fits the chosen case type, not the
 * longest one in the catalogue (DqWerkbord: 316px live, about 130 on the
 * board). jsdom draws no layout, so the template and rule are read as text.
 *
 * @spec openspec/changes/board-narrow-select-fits-choice/specs/board-narrow-select-fits-choice/spec.md#requirement-the-board-views-narrowing-select-fits-the-chosen-value
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the board narrowing select', () => {
	it('carries the fit class, and the column switch does not', () => {
		expect(sfc).toMatch(/class="cn-index-page__board-select cn-index-page__board-select--fit"\s+data-testid="cn-board-narrow-select"/)
		expect(sfc).not.toMatch(/cn-index-page__board-select--fit"\s+data-testid="cn-board-column-switch-select"/)
	})

	it('sizes to the chosen value with room for the caret', () => {
		const rule = css.match(/\.cn-look-board \.cn-index-page__board-select--fit:not\(\.cn-look-nextcloud \*\) \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('field-sizing: content;')
		expect(rule[1]).toContain('padding-inline-end: 28px;')
	})
})
