/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Board DqZakenSorteren: with the side panel open the header buttons sit on a
 * row of their own under the title, the count line under them. The page marks
 * itself while its side panel is open; the board look lays the header out.
 *
 * @spec openspec/changes/board-header-buttons-under-title-beside-side-panel/specs/board-header-buttons-under-title-beside-side-panel/spec.md#requirement-the-header-buttons-sit-under-the-title-while-the-side-panel-is-open
 */
const fs = require('fs')
const path = require('path')

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the header beside an open side panel', () => {
	it('marks the page while its side panel is open', () => {
		expect(sfc).toContain('\'cn-index-page--sidebar-open\': sidebarPanelOpen')
		expect(CnIndexPage.computed.sidebarPanelOpen.call({ sidebarOpen: true, hasSidebar: true })).toBe(true)
		expect(CnIndexPage.computed.sidebarPanelOpen.call({ sidebarOpen: true, hasSidebar: false })).toBe(false)
		expect(CnIndexPage.computed.sidebarPanelOpen.call({ sidebarOpen: false, hasSidebar: true })).toBe(false)
	})

	it('puts the buttons on the row under the title, the trail and count line under them', () => {
		const buttons = css.match(/\.cn-look-board\.cn-index-page--sidebar-open \.cn-page-header \.cn-index-page__header-buttons,\s*\.cn-look-board \.cn-index-page--sidebar-open \.cn-page-header \.cn-index-page__header-buttons \{([^}]*)\}/)
		expect(buttons).not.toBeNull()
		expect(buttons[1]).toContain('grid-column: 1 / -1;')
		expect(buttons[1]).toContain('grid-row: 2;')
		expect(css).toMatch(/--sidebar-open \.cn-page-header \.cn-header-trail \{[^}]*grid-row: 3;/)
		expect(css).toMatch(/--sidebar-open \.cn-page-header \.cn-page-header__text > \.cn-page-header__description \{[^}]*grid-row: 4;/)
	})
})
