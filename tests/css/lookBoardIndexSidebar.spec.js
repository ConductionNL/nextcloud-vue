/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's index sidebar (IndexZijpaneel, DqFilterBeheren): 360px, the
 * board's header and a row of underlined icon-and-label tabs. Read from the
 * stylesheet text.
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
const TAB = `${SIDEBAR} .app-sidebar-tabs__tab`

describe('look-board-index.css: the board index sidebar', () => {
	it('is 360px wide', () => {
		expect(bodyOf(SIDEBAR)).toMatch(/--app-sidebar-width: 360px;/)
	})

	it('sets the title bold on a 1.2 line and the line under it 14px muted', () => {
		expect(bodyOf(`${SIDEBAR} .app-sidebar-header__mainname`)).toMatch(/font-weight: 700;[\s\S]*line-height: 1\.2;/)
		const sub = bodyOf(`${SIDEBAR} .app-sidebar-header__subname`)
		expect(sub).toMatch(/color: var\(--color-text-maxcontrast\);/)
		expect(sub).toMatch(/font-size: 14px;/)
	})

	it('rounds the close button', () => {
		expect(bodyOf(`${SIDEBAR} .app-sidebar__close`)).toMatch(/border-radius: 50%;/)
	})

	it('lays a tab out as icon beside label, 40px high, 14px, in the soft ink on no ground', () => {
		const body = bodyOf(TAB)
		expect(body).toMatch(/flex-direction: row;/)
		expect(body).toMatch(/height: 40px;/)
		expect(body).toMatch(/padding: 0 10px;/)
		expect(body).toMatch(/background: transparent;/)
		expect(body).toMatch(/color: var\(--cn-board-text-soft\);/)
		expect(body).toMatch(/font-size: 14px;/)
	})

	it('marks the open tab with the light primary ink and a 2px full-width underline', () => {
		expect(bodyOf(`${TAB}[aria-selected='true']`)).toMatch(/color: var\(--color-primary-element-light-text\);/)
		const line = bodyOf(`${TAB}[aria-selected='true']::after`)
		expect(line).toMatch(/width: 100%;/)
		expect(line).toMatch(/height: 2px;/)
		expect(line).toMatch(/border-radius: 0;/)
		expect(line).toMatch(/background: var\(--color-primary-element\);/)
	})
})
