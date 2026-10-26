/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * r31: the index side panel's first content stood 11.5px lower than the boards
 * draw it (DqZakenSorteren "Alle zaken" gapBelowTitle 43 vs 54.5). The line
 * under the title is a paragraph the theme sets to 15px with `!important`, it
 * sat 5px under the title, the header kept 4px below it, and the search field
 * had 16px + 6px above it. Boards: line 14px 2px under the title, tabs 14px
 * under it, the field 20px under the tab row. jsdom draws no layout, so the
 * rules are read as text.
 *
 * @spec openspec/changes/board-side-panel-header-rhythm/specs/board-side-panel-header-rhythm/spec.md#requirement-the-side-panel-header-and-first-field-sit-as-the-boards-draw-them
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The selector, as written.
 * @return {string} The rule's body, or ''.
 */
function body(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = css.match(new RegExp(`${escaped} \\{([^}]*)\\}`))
	return match ? match[1] : ''
}

describe('the side panel header rhythm', () => {
	it('draws the line under the title 14px, 2px under it, past the theme', () => {
		const sub = body('.cn-look-board .cn-index-sidebar-panel .app-sidebar-header__subname')
		expect(sub).toContain('--nldesign-component-paragraph-font-size: 14px;')
		expect(sub).toContain('font-size: 14px !important;')
		expect(sub).toContain('line-height: normal !important;')
		expect(sub).toContain('margin-block-start: -3px !important;')
	})

	it('ends the header at that line and the first field 20px under the tabs', () => {
		expect(body('.cn-look-board .cn-index-sidebar-panel .app-sidebar-header.app-sidebar-header .app-sidebar-header__info .app-sidebar-header__desc.app-sidebar-header__desc')).toContain('padding-block-end: 0;')
		expect(body('.cn-look-board .cn-index-sidebar-panel .cn-index-sidebar__tab-content > .cn-index-sidebar__section:first-child')).toContain('padding-top: 8px;')
		expect(body('.cn-look-board .cn-index-sidebar-panel .cn-index-sidebar__tab-content > .cn-index-sidebar__section:first-child > .input-field')).toContain('margin-top: 0;')
	})
})
