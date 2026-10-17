/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board-look folder tab is a <button>, and Nextcloud's core stylesheet
 * gives every `button:not(.button-vue)` a 3px margin, which put the strip 3px
 * low and the tabs 7px apart instead of the board's 4 (DqZaak
 * "Zaakonderdelen"). The tab rule zeroes it. Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: folder tabs', () => {
	it('zeroes the core button margin on a tab', () => {
		const at = css.indexOf('.cn-look-board .cn-tabs--board .cn-tabs__nav-item {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('margin: 0')
	})
})
