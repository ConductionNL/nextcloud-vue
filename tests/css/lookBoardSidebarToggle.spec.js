/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look hides the sidebar's own open toggle on a detail page: it is
 * positioned over the content's top-right corner, which is the header's last
 * button ("More"), where it showed as a stray square icon. The header menu
 * offers "Open sidebar" instead. jsdom draws no layout, so the rule is read
 * from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the board look and the sidebar toggle', () => {
	it('hides .app-sidebar__toggle on a board page that holds a detail page', () => {
		const re = /\.cn-look-board:has\(\.cn-detail-page\)\s*>\s*\.app-sidebar__toggle\s*\{([^}]*)\}/
		const match = css.match(re)
		expect(match).not.toBeNull()
		expect(match[1]).toMatch(/display:\s*none/)
	})

	it('does not hide it on every board page (an index page has no detail page in it)', () => {
		expect(css).not.toMatch(/\.cn-look-board\s*>?\s*\.app-sidebar__toggle\s*\{/)
	})
})

describe('the board look and the sidebar toggle on an index page', () => {
	const indexCss = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('hides .app-sidebar__toggle on a board page that holds an index page', () => {
		const match = indexCss.match(/\.cn-look-board:has\(\.cn-index-page\)\s*>\s*\.app-sidebar__toggle\s*\{([^}]*)\}/)
		expect(match).not.toBeNull()
		expect(match[1]).toMatch(/display:\s*none/)
	})
})
