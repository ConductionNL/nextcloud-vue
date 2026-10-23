/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board draws an index page's page tabs at 14px/1.2 in main-text ink,
 * the active one at 700 (DqContracten). Live drew 15px link-coloured tabs
 * with the active at 600 (COMPDIFF r24). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-page-tabs-type/specs/board-index-page-tabs-type/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const bodyOf = (selector) => {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: the index page tabs', () => {
	it('are 14px at a 1.2 line height in main-text ink, over the link colour', () => {
		const body = bodyOf('.cn-look-board .cn-index-page__page-tab:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('line-height: 1.2;')
		expect(body).toContain('color: var(--color-main-text) !important;')
	})

	it('draw the active tab at weight 700', () => {
		const body = bodyOf('.cn-look-board .cn-index-page__page-tab--active:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-weight: 700;')
	})
})
