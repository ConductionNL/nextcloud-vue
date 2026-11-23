/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board view's selects take the board control border (DqWerkbord). The
 * nldesign theme forces every select's border colour from
 * --nldesign-component-form-select-border-color, so the rule hands that token
 * the colour too. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-view-select-border/specs/board-view-select-border/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-index.css: the board view selects', () => {
	it('draw the board control border, through the theme token as well', () => {
		const selector = '.cn-look-board .cn-index-page__board-select:not(.cn-look-nextcloud *) {'
		const at = css.indexOf(selector)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('--nldesign-component-form-select-border-color: var(--cn-board-control-border);')
		expect(body).toContain('border-color: var(--cn-board-control-border);')
	})
})
