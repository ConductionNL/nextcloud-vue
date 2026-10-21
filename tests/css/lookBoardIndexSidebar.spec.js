/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's index sidebar (IndexZijpaneel, DqFilterBeheren): 360px, the
 * muted line under the title and a round close button. The title and the tab
 * row are lookBoardIndexSidebarTabs.spec.js. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-sidebar/specs/board-index-sidebar/spec.md#requirement-the-board-index-sidebar-draws-the-boards-side-panel
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule listing an exact selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(selector) {
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

const SIDEBAR = '.cn-look-board:has(.cn-index-page) > .app-sidebar'

describe('look-board-index.css: the board index sidebar', () => {
	it('is 360px wide', () => {
		expect(bodyOf(SIDEBAR)).toMatch(/--app-sidebar-width: 360px;/)
	})

	it('sets the line under the title 14px muted', () => {
		const sub = bodyOf(`${SIDEBAR} .app-sidebar-header__subname`)
		expect(sub).toMatch(/color: var\(--color-text-maxcontrast\);/)
		expect(sub).toMatch(/font-size: 14px;/)
	})

	it('rounds the close button', () => {
		expect(bodyOf(`${SIDEBAR} .app-sidebar__close`)).toMatch(/border-radius: 50%;/)
	})

	it('leaves the title and the tab row to the panel rules', () => {
		expect(css).not.toContain(`${SIDEBAR} .app-sidebar-tabs__`)
		expect(css).not.toContain(`${SIDEBAR} .app-sidebar-header__mainname`)
	})

	it('draws the pressed Filter button on the light primary ground with a primary edge', () => {
		const body = bodyOf('.cn-look-board .cn-actions-bar__filter-button.button-vue[aria-pressed=\'true\']')
		expect(body).toMatch(/border-color: var\(--color-primary-element\);/)
		expect(body).toMatch(/background-color: var\(--color-primary-element-light\);/)
		expect(body).toMatch(/(^|[\s;])color: var\(--cn-filter-pressed-ink\);/)
		expect(body).toMatch(/--nldesign-component-button-primary-action-color: var\(--cn-filter-pressed-ink\);/)
		expect(bodyOf('.cn-look-board .cn-actions-bar')).toMatch(/--cn-filter-pressed-ink: var\(--color-main-text\);/)
		expect(bodyOf('.cn-look-board .cn-actions-bar__filter-button.button-vue[aria-pressed=\'true\']:hover')).toMatch(/background-color: var\(--color-primary-element-light-hover\);/)
	})
})
